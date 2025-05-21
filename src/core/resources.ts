import { VEncodedImageData, VImageData, getCodec } from './image.js';
import { DataBuffer } from './buffer.js';
import { VFileHeader } from '../vtf.js';
import { VFormats } from './enums.js';
import { VDataCollection, VDataProvider } from './providers.js';
import { getFaceCount, getMipSize, compress, decompress } from './utils.js';

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

type VImageEither = (VImageData|VEncodedImageData);

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

	static decode(header: VHeader, view: DataBuffer|undefined, info: VFileHeader): Promise<VResource> | VResource {
		return new VResource(header.tag, header.flags, view);
	}

	encode(info: VFileHeader): Promise<ArrayBuffer> | ArrayBuffer {
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

	static async decode(header: VHeader, view: DataBuffer, info: VFileHeader, lazy: boolean=false): Promise<VBodyResource> {
		const face_count = getFaceCount(info);
		const codec = getCodec(info.format);

		const mips: VImageEither[][][][] = new Array(info.mipmaps);
		for ( let x=info.mipmaps-1; x>=0; x-- ) { // VTFs store mipmaps smallest-to-largest
			
			const frames: VImageEither[][][] = mips[x] = new Array(info.frames);
			for ( let y=0; y<info.frames; y++ ) {
				
				const faces: VImageEither[][] = frames[y] = new Array(face_count);
				for ( let z=0; z<face_count; z++ ) {

					const [width, height] = getMipSize(x, info.width, info.height);
					const uncompressed_length = codec.length(width, height);

					// AXC compression works on every mip/frame/face, but joins all slices together
					let subview: DataBuffer;
					if (info.compression_level !== 0) {
						const compressed_length = info.compressed_lengths![x][y][z];
						const slice_data = view.read_u8(compressed_length);
						subview = new DataBuffer(await decompress(slice_data, info.compression_level, info.compression_method));
					}
					else {
						subview = view.ref(view.pointer, uncompressed_length * info.slices);
						view.pointer += subview.length;
					}

					const slices: VImageEither[] = faces[z] = new Array(info.slices);
					for ( let w=0; w<info.slices; w++ ) {
						const data = subview.read_u8(uncompressed_length);
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

	async encode(info: VFileHeader): Promise<ArrayBuffer> {
		const face_count = getFaceCount(info);
		const codec = getCodec(info.format);

		const packed_slices: Uint8Array[] = [];
		let packed_length = 0;

		const cl_mipmaps: number[][][] = info.compressed_lengths = new Array(info.mipmaps);
		for ( let x=info.mipmaps-1; x >= 0; x-- ) { // mipmaps
			
			const cl_frames: number[][] = cl_mipmaps[x] = new Array(info.frames);
			for ( let y=0; y < info.frames; y++ ) { // frames
				
				const cl_faces: number[] = cl_frames[y] = new Array(face_count);
				for ( let z=0; z < face_count; z++ ) { // faces

					const [width, height] = getMipSize(x, info.width, info.height);
					const uncompressed_length = codec.length(width, height);
					const subview = new DataBuffer(uncompressed_length * info.slices);

					for ( let w=0; w < info.slices; w++ ) { // slices
						const slice = this.images.getImage(x, y, z, w).encode(info.format).data;
						subview.write_u8(slice);
					}
					
					// Compress
					let data: Uint8Array = subview;
					if (info.compression_level !== 0) {
						data = await compress(data, info.compression_level, info.compression_method);
					}

					cl_faces[z] = data.length;
					packed_slices.push(data);
					packed_length += data.length;
				}
			}
		}

		const view = new DataBuffer(packed_length);
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
		return this.image.encode(VFormats.DXT1).data.buffer as ArrayBuffer;
	}
}
