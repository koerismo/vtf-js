import { VEncodedImageData, VImageData, getCodec } from '../image.js';
import { DataBuffer } from '../util/buffer.js';
import { VFileHeader } from '../vtf.js';
import { VDataCollection, VDataProvider } from './providers.js';
import { getFaceCount, getMipSize } from './utils.js';

export const VResourceTypes: {[key: string]: typeof VResource} = {};
export function registerResourceType(resource: typeof VResource) {
	if (!resource.tag) throw('registerResourceDecoder: Cannot register generic resource! (Must have static tag attribute.)');
	VResourceTypes[resource.tag] = resource;
}

export enum VHeaderTags {
	TAG_BODY = '\x30\0\0',
	TAG_THUMB = '\x01\0\0',
	TAG_AXC = 'AXC'
}

export class VHeader {
	readonly tag: string;
	readonly flags: number;
	readonly start: number;
	end: number;

	constructor(tag: string, flags: number, start: number) {
		this.tag = tag;
		this.flags = flags;
		this.start = start;
	}

	hasData() {
		return !(this.flags & 0x2);
	}
}

/** Represents a resource entry. */
export class VResource {
	static readonly tag?: string;
	readonly tag: string;
	readonly flags: number;
	data?: DataBuffer;

	constructor(tag: string, flags: number, data?: DataBuffer) {
		this.tag = tag;
		this.flags = flags;
		this.data = data;
	}

	hasData(): boolean {
		return !(this.flags & 0x2);
	}

	static decode(header: VHeader, data: DataBuffer|undefined, info: VFileHeader): VResource {
		return new VResource(header.tag, header.flags, data);
	}

	encode(): ArrayBuffer {
		if (!this.data) throw('VResource.encode: Attempted to encode body of non-data resource!');
		return this.data.buffer;
	}
}

export class VBodyResource extends VResource {
	images: VDataProvider;

	constructor(flags: number, images: VDataProvider) {
		super(VHeaderTags.TAG_BODY, flags);
		this.images = images;
	}

	static decode(header: VHeader, buffer: DataBuffer, info: VFileHeader): VBodyResource {
		const face_count = getFaceCount(info);

		const mips = new Array<VImageData[][][]>(info.mipmaps);
		for ( let x=0; x<info.mipmaps; x++ ) {
			const frames = mips[x] = new Array(info.frames);
			for ( let y=0; y<info.frames; y++ ) {
				const faces = frames[y] = new Array(face_count);
				for ( let z=0; z<face_count; z++ ) {
					const slices = faces[z] = new Array(info.slices);
					for ( let w=0; w<info.slices; w++ ) {

						const [width, height] = getMipSize(x, info.width, info.height);
						const codec = getCodec(info.format);
						const length = info.compression !== 0 ? info.compressed_lengths![x][y][z][w] : codec.length(width, height);
						const data = buffer.read_u8(length);

						if (info.compression !== 0) {
							// TODO: Add decompression!
							// data = decompressRaw(data);
						}

						slices[w] = codec.decode(new VEncodedImageData( data, width, height, info.format ));
					}
				}
			}
		}

		const images = new VDataCollection(mips);
		return new VBodyResource(header.flags, images);
	}

	encode(): ArrayBuffer {
		throw('Not implemented!');
	}
}