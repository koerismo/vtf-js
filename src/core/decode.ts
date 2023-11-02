import { getHeaderLength, getFaceCount } from './utils.js';
import { Vtf, VFileHeader } from '../vtf.js';
import { DataBuffer } from '../util/buffer.js';
import { VFormats } from './enums.js';
import { getCodec } from './image.js';
import { VResource, VHeader, VResourceTypes, VBodyResource, VHeaderTags } from './resources.js';

function read_format(id: number) {
	if (VFormats[id] == undefined) throw new Error(`Encountered invalid format (id=${id}) in header!`);
	return id;
}

function decode_axc(header: VHeader, buffer: DataBuffer, info: VFileHeader) {
	const face_count = getFaceCount(info);

	if (header.flags & 0x2) {
		if (header.start !== 0) throw(`AXC: Expected inline compression value of 0. Got ${header.start} instead!`);
		info.compression = 0;
		return;
	}

	const view = buffer.ref(header.start);
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
Vtf.decode = function(data: ArrayBuffer, header_only: boolean=false): Vtf|VFileHeader {
	const info = new VFileHeader();
	info.compression = 0;

	const view = new DataBuffer(data);
	view.set_endian(true);

	const sign = view.read_str(4);
	if (sign !== 'VTF\0') throw new Error(`Vtf.decode: Encountered invalid file signature! ("${sign}")`);

	// File format version
	const seven         = view.read_u32();
	info.version        = <(1|2|3|4|5|6)>view.read_u32();
	if (seven !== 7 || info.version < 1 || info.version > 6)
		throw new Error(`Vtf.decode: Encountered invalid format version! (${seven}.${info.version})`)

	// Other properties
	const expected_length = getHeaderLength(info.version);
	const header_length = view.read_u32();
	if (header_length < expected_length)
		throw new Error(`Vtf.decode: Encountered invalid header length! (${header_length})`);

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
		body = VBodyResource.decode(new VHeader(VHeaderTags.TAG_BODY, 0x0, body_offset), view, info);
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
			decode_axc(header, view, info);
			if (last_data_header !== null) headers[last_data_header].end = header.start;
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

	for ( let i=0; i<resource_count; i++ ) {
		const header = headers[i];

		let data: DataBuffer|undefined;
		if (!(header.flags & 0x2))
			data = view.ref(header.start, header.end - header.start);

		if (header.tag === VHeaderTags.TAG_BODY) {
			body = VBodyResource.decode(header, data!, info);
			continue;
		}

		if (header.tag === VHeaderTags.TAG_THUMB) {
			continue;
		}

		const type = VResourceTypes[header.tag] ?? VResource;
		meta.push(type.decode(header, data, info));
	}

	if (!body)
		throw new Error('Vtf.decode: Vtf does not contain a body resource!');

	return new Vtf(body.images, info);
}
