import { Vtf, VFileHeader } from '../vtf.js';
import { DataBuffer } from './buffer.js';
import { VCompressionMethods, VFormats } from './enums.js';
import { getHeaderLength, getFaceCount } from './utils.js';
import { VBaseResource, VHeader, VResourceTypes, VBodyResource, VHeaderTags, type VResource } from './resources.js';
import { getCodec } from './image.js';

const NO_DATA = 0x2;

function read_format(id: number) {
	if (VFormats[id] == undefined) throw Error(`read_format: Encountered invalid format (id=${id}) in header!`);
	return id;
}

function decode_axc(header: VHeader, buffer: DataBuffer, info: VFileHeader): boolean {
	const face_count = getFaceCount(info);

	if (header.flags & NO_DATA) {
		if (header.start !== 0) throw Error(`decode_axc: Expected inline compression value of 0. Got ${header.start} instead!`);
		info.compression_level = 0;
		return false;
	}

	const view = buffer.ref(header.start);
	view.pad(0x4); // const length = view.read_u32();
	info.compression_level = view.read_i16();
	info.compression_method = view.read_i16();

	// Legacy AXC v1 support - default to Deflate
	if (!info.compression_method) {
		info.compression_method = VCompressionMethods.Deflate;
	}

	const mips: number[][][] = info.compressed_lengths = new Array(info.mipmaps);
	for ( let x=0; x<info.mipmaps; x++ ) {
		const frames: number[][] = mips[x] = new Array(info.frames);
		for ( let y=0; y<info.frames; y++ ) {
			const faces: number[] = frames[y] = new Array(face_count);
			for ( let z=0; z<face_count; z++ ) {
				faces[z] = view.read_u32();
			}
		}
	}

	return true;
}

// @ts-expect-error Overloads break for some reason?
Vtf.decode = async function(data: ArrayBuffer, header_only: boolean=false, lazy_decode: boolean=false): Promise<Vtf | VFileHeader> {
	const info = new VFileHeader();
	info.compression_level = 0;

	const view = new DataBuffer(data);
	view.set_endian(true);

	const sign = view.read_str(4);
	if (sign === 'VTFX') throw Error('Vtf.decode: Console vtfs are not supported!');
	if (sign !== 'VTF\0') throw Error(`Vtf.decode: Encountered invalid file signature! ("${sign}")`);

	// File format version
	const seven         = view.read_u32();
	info.version        = <(0|1|2|3|4|5|6)>view.read_u32();
	if (seven !== 7 || info.version < 0 || info.version > 6)
		throw Error(`Vtf.decode: Encountered invalid format version! (${seven}.${info.version})`)

	// Other properties
	const expected_length = getHeaderLength(info.version);
	const header_length = view.read_u32();
	if (header_length < expected_length)
		throw Error(`Vtf.decode: Encountered invalid header length! (${header_length})`);

	info.width          = view.read_u16();
	info.height         = view.read_u16();
	info.flags          = view.read_u32();
	info.frames         = view.read_u16();
	info.first_frame    = view.read_u16();

	view.pad(4);
	info.reflectivity   = view.read_f32(3);
	view.pad(4);

	info.bump_scale     = view.read_f32();
	info.format         = read_format(view.read_u32());
	info.mipmaps        = view.read_u8();

	// Thumbnail
	view.pointer += 4;
	info.thumb_format   = VFormats.DXT1; // read_format(view.read_u32()); // Default cubemap corrupted???
	info.thumb_width    = view.read_u8();
	info.thumb_height   = view.read_u8();

	// v7.2 +
	info.slices         = info.version > 1 ? view.read_u16() : 1;

	if (header_only) return info;

	let body: VBodyResource|undefined;
	const headers: VHeader[] = [];
	const meta: VResource[] = [];

	let resource_count = 0;
	if (info.version >= 3) {
		view.pad(3);
		resource_count = view.read_u32();
		view.pad(8);
	}
	else {
		const body_offset = header_length + getCodec(info.thumb_format).length(info.thumb_width, info.thumb_height);
		const data = view.ref(body_offset);
		body = await VBodyResource.decode(new VHeader(VHeaderTags.TAG_BODY, 0x0, body_offset), data, info, lazy_decode);
	}

	// Parse resource headers

	let last_data_header: number|null = null;
	for ( let i=0; i<resource_count; i++ ) {
		const header = new VHeader(
			view.read_str(3),
			view.read_u8(),
			view.read_u32()
		);

		// TODO: "special" header tags, especially for unofficial features, are BAD.
		if (header.tag === VHeaderTags.TAG_AXC) {
			const has_body = decode_axc(header, view, info);
			if (last_data_header !== null && has_body) headers[last_data_header].end = header.start;
			last_data_header = null;
			continue;
		}

		headers.push(header);
		if (header.hasData()) {
			if (last_data_header !== null) headers[last_data_header].end = header.start;
			last_data_header = headers.length-1;
		}
	}

	if (last_data_header !== null) {
		headers[last_data_header].end = view.length;
	}

	// Parse resource bodies

	for ( let i=0; i<headers.length; i++ ) {
		const header = headers[i];

		let data: DataBuffer|undefined;
		if (!(header.flags & NO_DATA))
			data = view.ref(header.start, header.end! - header.start);

		if (header.tag === VHeaderTags.TAG_BODY) {
			if (!data) throw Error('Vtf.decode: Body resource has no data! (0x2 flag set)');
			body = await VBodyResource.decode(header, data, info, lazy_decode);
			continue;
		}

		if (header.tag === VHeaderTags.TAG_THUMB) {
			continue;
		}

		const type = VResourceTypes[header.tag] ?? VBaseResource;
		meta.push(await type.decode(header, data, info));
	}

	if (!body)
		throw Error('Vtf.decode: Vtf does not contain a body resource!');

	return new Vtf(body.images, info);
}
