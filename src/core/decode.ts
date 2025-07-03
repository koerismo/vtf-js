import { Vtf, VFileHeader, VConstructorOptions } from '../vtf.js';
import { DataBuffer } from './buffer.js';
import { VCompressionMethods, VFormats, NO_DATA } from './enums.js';
import { getHeaderLength, getFaceCount } from './utils.js';
import { VBaseResource, VHeader, VResourceTypes, VBodyResource, VHeaderTags, type VResource } from './resources.js';
import { getCodec } from './image.js';

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

	const view = buffer.ref(header.start + 0x4);
	info.compression_level = view.read_i16();
	info.compression_method = view.read_i16();

	// Legacy AXC v1 support - default to Deflate
	if (!info.compression_method) {
		info.compression_method = VCompressionMethods.Deflate;
	}

	const mips: number[][][] = info.compressed_lengths = new Array(info.mipmaps);
	for ( let x=info.mipmaps-1; x>=0; x-- ) {
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
Vtf.decode = async function(data: ArrayBuffer, header_only: boolean=false, lazy_decode: boolean=true): Promise<Vtf | VFileHeader> {
	const info = new VFileHeader();
	info.compression_level = 0;

	const view = new DataBuffer(data);

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
		body = await VBodyResource.decode(new VHeader(VHeaderTags.TAG_LEGACY_BODY, 0x0, body_offset), data, info, lazy_decode);
	}

	// Parse resource headers
	for ( let i=0; i<resource_count; i++ ) {
		const fourcc = view.read_u32(undefined, false);
		const offset = view.read_u32();
		const header = new VHeader(
			fourcc >> 8,
			fourcc & 0xff,
			offset
		);

		// TODO: "special" header tags, especially for unofficial features, are BAD.
		if (header.tag === VHeaderTags.TAG_AXC) {
			decode_axc(header, view, info);
			continue;
		}

		headers.push(header);
	}

	// Parse resource bodies
	for ( let i=0; i<headers.length; i++ ) {
		const header = headers[i];
		let length: number | undefined;
		let start = header.start;

		// Ignore thumb data
		if (header.tag === VHeaderTags.TAG_LEGACY_THUMB) {
			continue;
		}

		// All modern resources have a uint32 at the body start to declare the content size
		if (header.tag !== VHeaderTags.TAG_LEGACY_BODY) {
			length = view.view.getUint32(start, true);
			start += 4;
		}

		let data: DataBuffer | undefined;
		if (!(header.flags & NO_DATA))
			data = view.ref(start, length);

		if (header.tag === VHeaderTags.TAG_LEGACY_BODY) {
			if (!data) throw Error('Vtf.decode: Body resource has no data! (0x2 flag set)');
			body = await VBodyResource.decode(header, data, info, lazy_decode);
			continue;
		}

		const type = VResourceTypes[header.tag] ?? VBaseResource;
		meta.push(await type.decode(header, data, info));
	}

	if (!body)
		throw Error('Vtf.decode: Vtf does not contain a body resource!');

	const options: VConstructorOptions = info;
	options.meta = meta;

	return new Vtf(body.images, options);
}
