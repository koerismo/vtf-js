import { VFileHeader, Vtf } from '../vtf.js';
import { DataBuffer } from './buffer.js';
import { VFormats } from './enums.js';
import { getFaceCount, getHeaderLength, getThumbMip } from './utils.js';
import { VBodyResource, VHeaderTags, VResource, VThumbResource } from './resources.js';
import { VImageData } from './image.js';

function write_format(id: number) {
	if (VFormats[id] == undefined) throw Error(`write_format: Encountered invalid format (id=${id}) in header!`);
	return id;
}

function write_header(buf: DataBuffer, res: VResource, pos: number) {
	buf.write_str(res.tag, 3);
	buf.write_u8(res.flags);
	buf.write_u32(pos);
}

function write_chunks(chunks: ArrayBuffer[]): ArrayBuffer {
	let length = 0;
	for (const chunk of chunks) {
		length += chunk.byteLength;
	}

	const view = new Uint8Array(length);

	let i = 0;
	for (const chunk of chunks) {
		view.set(new Uint8Array(chunk), i);
		i += chunk.byteLength;
	}

	return view.buffer;
}

function write_axc(info: VFileHeader) {
	if (info.compressed_lengths == null) throw Error('write_axc: Compression header is not present. If this error is thrown, something has gone very very wrong!');
	if (info.version < 6) throw Error('write_axc: Compression requires VTF version 6+');

	const face_count = getFaceCount(info);
	const axc_length = 8 + info.frames * info.mipmaps * info.slices * face_count * 4;
	const axc = new DataBuffer(axc_length);
	axc.set_endian(true);
	axc.write_u32(axc_length);
	axc.write_i16(info.compression_level);
	axc.write_i16(info.compression_method);

	const mips = info.compressed_lengths;
	for (let x = info.mipmaps-1; x >= 0; x--) {
		const frames = mips[x];
		for (let y = 0; y < info.frames; y++) {
			const faces = frames[y];
			for (let z = 0; z < face_count; z++) {
				axc.write_u32(faces[z]);
			}
		}
	}

	return axc.buffer;
}

Vtf.prototype.encode = async function(this: Vtf): Promise <ArrayBuffer> {
	// Each chunk is a section of the file. e.g. [header, axc, body1, body2, body3]
	const chunks: ArrayBuffer[] = [];
	const info = VFileHeader.fromVtf(this);

	let resource_count = this.meta.length + 2;
	if (info.compression_level !== 0) resource_count += 1;


	const header_length = getHeaderLength(this.version, resource_count);
	const header = new DataBuffer(header_length);
	chunks.push(header.buffer);

	header.set_endian(true);
	header.write_str('VTF\0', 4);

	// File format version
	header.write_u32(7);
	header.write_u32(this.version);
	header.write_u32(header_length);

	const [width, height] = this.data.getSize();

	// Other properties
	header.write_u16(width);
	header.write_u16(height);
	header.write_u32(info.flags);
	header.write_u16(info.frames);
	header.write_u16(info.first_frame);
	header.pad(4);
	header.write_f32(info.reflectivity);
	header.pad(4);
	header.write_f32(info.bump_scale);
	header.write_u32(write_format(info.format));
	header.write_u8(info.mipmaps);

	// Thumbnail (Fallback to 0x0 if the mipmap is not present)
	header.write_u32(write_format(VFormats.DXT1));
	const thumb_mip = getThumbMip(width, height);
	const thumb_image = thumb_mip < info.mipmaps ? this.data.getImage(thumb_mip, 0, 0, 0) : new VImageData(new Uint8Array(0), 0, 0);
	header.write_u8(thumb_image.width);
	header.write_u8(thumb_image.height);

	// Initial chunks
	const thumb_resource = new VThumbResource(0x00, thumb_image);
	const body_resource = new VBodyResource(0x00, this.data);
	const thumb_data = thumb_resource.encode(info);
	const body_data = await body_resource.encode(info);
	chunks.push(thumb_data);
	chunks.push(body_data);

	// v7.2 +
	if (this.version > 1) {
		header.write_u16(this.data.sliceCount());
	}

	// v7.1-7.2: Skip writing headers
	if (this.version < 3) {
		return write_chunks(chunks);
	}

	// v7.3 +
	header.pad(3);
	header.write_u32(resource_count);
	header.pad(8);

	// Write resource headers
	let filepos = header.length;
	write_header(header, thumb_resource, filepos);filepos += thumb_data.byteLength;
	write_header(header, body_resource, filepos); filepos += body_data.byteLength;

	if (info.compression_level !== 0) {
		const axc_data = write_axc(info);
		write_header(header, new VResource(VHeaderTags.TAG_AXC, 0x00), filepos);
		filepos += axc_data.byteLength;
		chunks.push(axc_data);
	}

	for (const res of this.meta) {
		write_header(header, res, filepos);

		const res_data = await res.encode(info);
		filepos += res_data.byteLength;
		chunks.push(res_data);
	}

	return write_chunks(chunks);
}