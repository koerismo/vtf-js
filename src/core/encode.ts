import { VFileHeader, Vtf } from '../vtf.js';
import { DataBuffer } from './buffer.js';
import { NO_DATA, VFormats } from './enums.js';
import { byteswap3, getFaceCount, getHeaderLength, getThumbMip } from './utils.js';
import { VBodyResource, VHeaderTags, VBaseResource, VThumbResource, VResource } from './resources.js';
import { VEncodedImageData } from './image.js';

function write_header(buf: DataBuffer, res: VResource, pos: number) {
	buf.write_u32((res.tag << 8) | (res.flags & 0xff), false);
	buf.write_u32(pos);
}

function write_axc(info: VFileHeader) {
	if (info.compressed_lengths == null) throw Error('write_axc: Compression header is not present. If this error is thrown, something has gone very very wrong!');
	if (info.version < 6) throw Error('write_axc: Compression requires VTF version 6+');

	const face_count = getFaceCount(info);
	const axc_length = 4 + info.frames * info.mipmaps * info.slices * face_count * 4;
	const axc = new DataBuffer(axc_length);
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
	const info = VFileHeader.fromVtf(this);

	let resource_count = this.meta.length + 2;
	if (info.compression_level !== 0) resource_count += 1;

	const header_length = getHeaderLength(this.version, resource_count);
	const header = new DataBuffer(header_length);

	header.write_str('VTF\0', 4);
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
	header.write_u32(info.format);
	header.write_u8(info.mipmaps);

	// Thumbnail (Fallback to 0x0 if the mipmap is not present)
	header.write_u32(VFormats.DXT1);
	const thumb_mip = getThumbMip(width, height);
	const thumb_image = thumb_mip < info.mipmaps ? this.data.getImage(thumb_mip, 0, 0, 0, true) : new VEncodedImageData(new Uint8Array(0), 0, 0, VFormats.DXT1);
	header.write_u8(thumb_image.width);
	header.write_u8(thumb_image.height);

	// Prepare body/thumb resources
	const thumb_resource = new VThumbResource(0x0, thumb_image);
	const body_resource = new VBodyResource(0x0, this.data);
	const thumb_data = thumb_resource.encode(info);
	const body_data = await body_resource.encode(info);

	// v7.2 +
	if (this.version > 1) {
		header.write_u16(this.data.sliceCount());
	}

	// v7.1-7.2: Use non-chunked format:
	if (this.version < 3) {
		const file = new DataBuffer(header.byteLength + thumb_data.byteLength + body_data.byteLength);
		file.write_u8(header);
		file.write_u8(new Uint8Array(thumb_data));
		file.write_u8(new Uint8Array(body_data));
		return file.buffer;
	}

	// v7.3 +
	header.pad(3);
	header.write_u32(resource_count);
	header.pad(8);

	// Begin collecting chunks and accumulating filesize
	let filesize = header.byteLength;
	const chunks: { resource: VResource, data: ArrayBuffer|undefined }[] = new Array(2);
	chunks[0] = { resource: body_resource, data: body_data };   filesize += body_data.byteLength;
	chunks[1] = { resource: thumb_resource, data: thumb_data }; filesize += thumb_data.byteLength;

	// Append compression chunk if requested
	if (info.compression_level !== 0) {
		const axc_data = write_axc(info);
		chunks.push({ resource: new VBaseResource(VHeaderTags.TAG_AXC, 0x00), data: axc_data });
		filesize += axc_data.byteLength + 4;
	}

	// Fill in meta chunks
	for (const resource of this.meta) {
		const data = await resource.encode(info);
		chunks.push({ resource, data });
		if (data) filesize += data.byteLength + (resource.isLegacy() ? 0 : 4);
	}

	// Sort chunks by tag as LE integers
	chunks.sort((a, b) => {
		return byteswap3(a.resource.tag) - byteswap3(b.resource.tag);
	});

	// Write into file
	const file = new DataBuffer(filesize);
	file.seek(header.byteLength);

	for (const { resource, data } of chunks) {
		write_header(header, resource, file.pointer);
		const no_data = !!(resource.flags & NO_DATA);
		if ((data === undefined) !== no_data) throw Error(`NO_DATA flag does not match data provided! (NO_DATA=${no_data})`);
		if (!data) continue;
		if (!resource.isLegacy()) file.write_u32(data.byteLength);
		file.write_u8(new Uint8Array(data));
	}

	file.seek(0x0);
	file.write_u8(header);

	return file.buffer;
}
