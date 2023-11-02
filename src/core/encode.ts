import { DataBuffer } from '../util/buffer.js';
import { VFormats } from './enums.js';
import { VFileHeader, Vtf } from '../vtf.js';
import { getFaceCount, getHeaderLength, getMipSize, getThumbMip } from './utils.js';
import { VBodyResource, VResource, VThumbResource } from './resources.js';

function write_format(id: number) {
	if (VFormats[id] == undefined) throw(`Encountered invalid format (id=${id}) in header!`);
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

Vtf.prototype.encode = function(this: Vtf): ArrayBuffer {
	// Each chunk is a section of the file. e.g. [header, axc, body1, body2, body3]
	const chunks: ArrayBuffer[] = [];

	const header_length = getHeaderLength(this.version, this.meta.length + 2);
	const header = new DataBuffer(header_length);
	chunks.push(header);

	header.set_endian(true);
	header.write_str('VTF\0', 4);

	// File format version
	header.write_u32(7);
	header.write_u32(this.version);
	header.write_u32(header_length);

	const [width, height] = this.data.getSize();
	const info = VFileHeader.fromVtf(this);

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

	// Thumbnail
	const thumb_mip = getThumbMip(width, height);
	const [thumb_width, thumb_height] = getMipSize(thumb_mip, width, height);
	header.write_u32(write_format(VFormats.DXT1));
	header.write_u8(thumb_width);
	header.write_u8(thumb_height);

	// Initial chunks
	const thumb_resource = new VThumbResource(0x00, this.data.getImage(thumb_mip, 0, 0, 0));
	const body_resource = new VBodyResource(0x00, this.data);
	const thumb_data = thumb_resource.encode(info);
	const body_data = body_resource.encode(info);
	chunks.push(thumb_data);
	chunks.push(body_data);

	// v7.2 +
	if (this.version > 1) {
		header.write_u16(this.data.sliceCount());
	}

	// Compression chunk?
	if (info.compression !== 0) {
		if (info.compressed_lengths == null) throw new Error('Compression header is not present. If this error is thrown, something has gone very very wrong!');
		if (info.version < 6) throw new Error('Compression requires VTF version 6+');

		const face_count = getFaceCount(info);
		const axc_length = 8 + info.frames * info.mipmaps * info.slices * face_count * 4;
		const axc = new DataBuffer(axc_length);
		axc.write_u32(axc_length);
		axc.write_i32(info.compression);

		const mips = info.compressed_lengths;
		for ( let x=0; x<info.mipmaps; x++ ) {
			const frames = mips[x];
			for ( let y=0; y<info.frames; y++ ) {
				const faces = frames[y];
				for ( let z=0; z<face_count; z++ ) {
					const slices = faces[z];
					for ( let w=0; w<info.slices; w++ ) {
						axc.write_u32(slices[w]);
					}
				}
			}
		}

		chunks.push(axc.buffer);
	}

	// v7.1-7.2: Skip writing headers
	if (this.version < 3) {
		return write_chunks(chunks);
	}

	// v7.3 +
	header.pad(3);
	header.write_u32(this.meta.length + 2);
	header.pad(8);

	// Write resource headers
	write_header(header, thumb_resource, header.length);
	write_header(header, body_resource, header.length + thumb_data.byteLength);

	let filepos = header.length + thumb_data.byteLength;
	for (const res of this.meta) {
		write_header(header, res, filepos);

		const res_data = res.encode(info);
		filepos += res_data.byteLength;
		chunks.push(res_data);
	}

	return write_chunks(chunks);
}
