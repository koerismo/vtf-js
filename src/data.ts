import { VFormats } from './core/enums.js';

/** An array of decoded RGBA pixels. */
export type VPixelArray = Uint8Array|Uint16Array|Uint32Array|Float32Array;

/** An object that defines an image encoder/decoder for a given format. */
export interface ImageCodec {
	bpp: number,
	encode(data: VImageData): VEncodedImageData;
	decode(data: VEncodedImageData): VImageData;
}

/** All currently-registered image codecs. */
export const ImageCodecs: {[key in VFormats]?: ImageCodec} = {};

/** Register an image encoder/decoder for the specified format. */
export function registerCodec(format: VFormats, codec: ImageCodec) {
	ImageCodecs[format] = codec;
}

/** Decoded RGBA image data. */
export class VImageData {
	width:  number;
	height: number;
	data:   VPixelArray;

	constructor(data: VPixelArray, width: number, height: number) {
		this.data = data;
		this.width = width;
		this.height = height;
	}

	encode(format: VFormats): VEncodedImageData {
		throw('Not implemented!');
	}
}

/** VTF-encoded image data. */
export class VEncodedImageData {
	width:  number;
	height: number;
	format: VFormats;
	data:   Uint8Array;

	constructor(data: Uint8Array, width: number, height: number, format: VFormats) {
		this.data = data;
		this.width = width;
		this.height = height;
		this.format = format;
	}

	decode(): VImageData {
		throw('Not implemented!');
	}
}