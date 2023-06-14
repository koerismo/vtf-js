import { VDataCollection } from './providers.js';
import { getHeaderLength, getFaceCount } from './utils.js';
import { Vtf, VHeaderInfo } from '../vtf.js';
import { DataBuffer } from '../util/buffer.js';
import { VFlags, VFormats } from './enums.js';
import { getCodec } from '../image.js';
import { VResource, VHeader, VResourceTypes, VBodyResource, VHeaderTags } from './resources.js';

function read_format(id: number) {
	if (VFormats[id] == undefined) throw(`Encountered invalid format (id=${id}) in header!`);
	return id;
}

function parseAXC(header: VHeader, buffer: DataBuffer, info: VHeaderInfo) {
	const face_count = getFaceCount(info);

	if (header.flags & 0x2) {
		if (header.start !== 0) throw(`AXC: Expected inline compression value of 0. Got ${header.start} instead!`);
		info.compression = 0;
		return;
	}

	const view = buffer.subview(header.start);
	const length = view.read_u32();
	info.compression = view.read_i32();

	const mips = info.compressed_lengths = new Array(info.mipmaps);
	for ( let x=0; x<info.mipmaps; x++ ) {
		const frames = mips[x] = new Array(info.frames);
		for ( let y=0; y<info.frames; y++ ) {
			const faces = frames[y] = new Array(face_count);
			for ( let z=0; z<face_count; z++ ) {
				const slices = faces[z] = new Array(info.slices);
				for ( let w=0; w<info.slices; w++ ) {
					slices[w] = view.read_u32();
				}
			}
		}
	}
}

// @ts-expect-error Overloads break for some reason?
Vtf.decode = function(data: ArrayBuffer, header_only: boolean=false): Vtf|VHeaderInfo {
	const info = new VHeaderInfo();
	const view = new DataBuffer(data);
	view.set_endian(true);

	const sign = view.read_str(4);
	if (sign !== 'VTF\0') throw(`Vtf.decode: Encountered invalid file signature! ("${sign}")`);

	// File format version
	const seven         = view.read_u32();
	info.version        = view.read_u32();
	if (seven !== 7 || info.version < 1 || info.version > 6)
		throw(`Vtf.decode: Encountered invalid format version! (${seven}.${info.version})`)

	// Other properties
	const expected_length = getHeaderLength(info.version);
	const header_length = view.read_u32();
	if (header_length < expected_length)
		throw(`Vtf.decode: Encountered invalid header length! (${header_length})`);

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
	info.thumb_format   = read_format(view.read_u32());
	info.thumb_width    = view.read_u8();
	info.thumb_height   = view.read_u8();

	// v7.2 +
	info.slices         = info.version > 1 ? 1 : view.read_u16();

	if (header_only) return info;

	let resource_count = 0;
	if (info.version >= 3) {
		view.pad(3);
		resource_count = view.read_u32();
		view.pad(8);
	}

	// Parse resource headers

	const headers: VHeader[] = [];
	head: for ( let i=0; i<resource_count; i++ ) {
		const header = new VHeader(
			view.read_str(3),
			view.read_u8(),
			view.read_u32()
		);

		switch (header.tag) {
			case VHeaderTags.TAG_AXC:
				parseAXC(header, view, info);
				continue head;

			case VHeaderTags.TAG_THUMB:
				continue head;
		}

		headers.push(header);
		if (headers.length > 1 && header.hasData()) headers[headers.length-1].end = header.start;
	}

	// Parse resource bodies

	let body_resource: VBodyResource|undefined;
	const resources: VResource[] = [];

	for ( let i=0; i<resource_count; i++ ) {
		const header = headers[i];

		switch (header.tag) {
			case VHeaderTags.TAG_BODY:
				body_resource = VBodyResource.decode(header, view, info);
				break;

			default:
				const decoder = VResourceTypes[header.tag] ?? VResource;
				resources[i] = decoder.decode(header, view, info);
		}
	}

	if (!body_resource)
		throw('Vtf does not contain body resource!');

	return new Vtf(body_resource.images, {
		version: <(1|2|3|4|5|6)>info.version,
		format: info.format,
		flags: info.flags,
		reflectivity: info.reflectivity,
		first_frame: info.first_frame,
		bump_scale: info.bump_scale
	});
}