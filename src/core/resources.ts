import { VEncodedImageData, VImageData, getCodec } from './image.js';
import { DataBuffer } from '../util/buffer.js';
import { VFileHeader } from '../vtf.js';
import { VFormats } from './enums.js';
import { VDataCollection, VDataProvider } from './providers.js';
import { getFaceCount, getMipSize } from './utils.js';
import type { InflateFunctionOptions, DeflateFunctionOptions, Data } from 'pako';

let deflate: (data: Data, options?: DeflateFunctionOptions) => Uint8Array = () => { throw Error('vtf-js: The pako dependency is required to compress Strata-compressed VTFs!') };
let inflate: (data: Data, options?: InflateFunctionOptions) => Uint8Array = () => { throw Error('vtf-js: The pako dependency is required to decompress Strata-compressed VTFs!') };
if (!globalThis.VTF_DISABLE_PAKO) {
	try {
		const pako = await import('pako');
		deflate = pako.deflate;
		inflate = pako.inflate;
	}
	catch(e) {
		console.warn('vtf-js: Failed to import dependency "pako". Set globalThis.VTF_DISABLE_PAKO before importing vtf-js to hide this warning!', e);
	}
}

export const VResourceTypes: {[key: string]: typeof VResource} = {};
export function registerResourceType(resource: typeof VResource) {
	if (!resource.tag) throw Error('registerResourceDecoder: Cannot register generic resource! (Must have static tag attribute.)');
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

	hasData(): boolean {
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

	static decode(header: VHeader, view: DataBuffer|undefined, info: VFileHeader): VResource {
		return new VResource(header.tag, header.flags, view);
	}

	encode(info: VFileHeader): ArrayBuffer {
		if (!this.data) return new ArrayBuffer(0);
		return this.data.buffer;
	}
}

export class VBodyResource extends VResource {
	images: VDataProvider;

	constructor(flags: number, images: VDataProvider) {
		super(VHeaderTags.TAG_BODY, flags);
		this.images = images;
	}

	static decode(header: VHeader, view: DataBuffer, info: VFileHeader, lazy: boolean=false): VBodyResource {
		const face_count = getFaceCount(info);
		const codec = getCodec(info.format);

		const mips = new Array<(VImageData|VEncodedImageData)[][][]>(info.mipmaps);
		for ( let x=info.mipmaps-1; x>=0; x-- ) { // VTFs store mipmaps smallest-to-largest
			const frames = mips[x] = new Array(info.frames);
			for ( let y=0; y<info.frames; y++ ) {
				const faces = frames[y] = new Array(face_count);
				for ( let z=0; z<face_count; z++ ) {
					const slices = faces[z] = new Array(info.slices);
					for ( let w=0; w<info.slices; w++ ) {

						const [width, height] = getMipSize(x, info.width, info.height);
						const length = info.compression !== 0 ? info.compressed_lengths![x][y][z][w] : codec.length(width, height);
						let data = view.read_u8(length);

						if (info.compression !== 0) {
							data = inflate(data);
						}

						const encoded = new VEncodedImageData( data, width, height, info.format );
						if (lazy) slices[w] = encoded;
						else slices[w] = codec.decode(encoded);
					}
				}
			}
		}

		const images = new VDataCollection(mips);
		return new VBodyResource(header.flags, images);
	}

	encode(info: VFileHeader): ArrayBuffer {
		const face_count = getFaceCount(info);

		const packed_slices: Uint8Array[] = [];
		let length = 0;

		const cl_mipmaps = info.compressed_lengths = new Array(info.mipmaps);
		for ( let x=info.mipmaps-1; x >= 0; x-- ) { // mipmaps
			const cl_frames = cl_mipmaps[x] = new Array(info.frames);

			for ( let y=0; y < info.frames; y++ ) { // frames
				const cl_faces = cl_frames[y] = new Array(face_count);

				for ( let z=0; z < face_count; z++ ) { // faces
					const cl_slices = cl_faces[z] = new Array(info.slices);

					for ( let w=0; w < info.slices; w++ ) { // slices
						let data = this.images.getImage(x, y, z, w).encode(info.format).data;

						if (info.compression !== 0) {
							data = deflate(data, { level: <-1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9>info.compression });
						}

						cl_slices[w] = data.length;
						length += data.length;
						packed_slices.push(data);
					}
				}
			}
		}

		const view = new DataBuffer(length);
		for (let i=0; i<packed_slices.length; i++) {
			view.write_u8(packed_slices[i]);
		}
		return view.buffer;
	}
}

export class VThumbResource extends VResource {
	image: VImageData;

	constructor(flags: number, image: VImageData) {
		super(VHeaderTags.TAG_THUMB, flags);
		this.image = image;
	}

	static decode(header: VHeader, view: DataBuffer, info: VFileHeader): VThumbResource {
		const codec = getCodec(info.thumb_format);
		const data = view.read_u8(codec.length(info.thumb_width, info.thumb_height));
		const image = codec.decode(new VEncodedImageData(data, info.thumb_width, info.thumb_height, info.thumb_format));
		return new VThumbResource(0x00, image);
	}

	encode(info: VFileHeader): ArrayBuffer {
		if (this.image.width === 0 || this.image.height === 0) return new ArrayBuffer(0);
		return this.image.encode(VFormats.DXT1).data.buffer;
	}
}
