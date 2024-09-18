import { VFormats } from './enums.js';
import { VFilters, VResizeOptions, resizeFiltered, resizeNearest } from './resize.js';
import { clamp } from './utils.js';

/** An array of decoded RGBA pixels. */
export type VPixelArray = Uint8Array|Uint16Array|Uint32Array|Float32Array;
export type VPixelArrayConstructor = Uint8ArrayConstructor|Uint16ArrayConstructor|Uint32ArrayConstructor|Float32ArrayConstructor;

/** An object that defines an image encoder/decoder for a given format. */
export interface VCodec {
	length(width: number, height: number): number;
	encode(data: VImageData): VEncodedImageData;
	decode(data: VEncodedImageData): VImageData;
}

/** All currently-registered image codecs. */
export const VCodecs: {[key in VFormats]?: VCodec} = {};

/** Register an image encoder/decoder for the specified format. */
export function registerCodec(format: VFormats, codec: VCodec) {
	VCodecs[format] = codec;
}

export function getCodec(format: VFormats): VCodec;
export function getCodec(format: VFormats, strict: boolean): VCodec | undefined;
export function getCodec(format: VFormats, strict=true): VCodec | undefined {
	const codec = VCodecs[format];
	if (!codec && strict) throw Error(`Could not get codec for format ${VFormats[format]}!`);
	return codec;
}

/** Decoded RGBA image data. */
export class VImageData<D extends VPixelArray = VPixelArray> {
	readonly isEncoded = false as const;

	width:  number;
	height: number;
	data:   D;

	constructor(data: D, width: number, height: number) {
		this.data = data;
		this.width = width;
		this.height = height;
	}

	convert<T extends VPixelArrayConstructor>(type: T, clamp_int=true): VImageData<InstanceType<T>> {
		if (this.data instanceof type.constructor) return <VImageData<InstanceType<T>>>(this as unknown);

		const out = new type(this.data.length) as InstanceType<T>;
		const is_input_int  = !(this.data instanceof Float32Array || this.data instanceof Float64Array);
		const is_output_int = !(out instanceof Float32Array || out instanceof Float64Array);

		const input_max  = is_input_int  ? 2 ** (this.data.BYTES_PER_ELEMENT * 8) - 1 : 1;
		const output_max = is_output_int ? 2 ** (out.BYTES_PER_ELEMENT * 8) - 1 : 1;

		const mult_factor = output_max / input_max;
		const add_factor = 0; // (+is_input_int - +is_output_int) * 0.5;

		if (clamp_int && is_output_int) {
			for ( let i=0; i<this.data.length; i++ )
				out[i] = clamp(this.data[i] * mult_factor + add_factor, 0, output_max);
		}
		else{
			for ( let i=0; i<this.data.length; i++ )
				out[i] = this.data[i] * mult_factor + add_factor;
		}

		return new VImageData(out, this.width, this.height);
	}

	encode(format: VFormats): VEncodedImageData {
		const codec = getCodec(format);
		const length = codec.length(this.width, this.height);
		const out = codec.encode(this);
		if (out.data.length !== length) throw new Error(`Encoded ${VFormats[format]} image failed length validation! (expected ${length} but got ${out.data.length})`);
		return out;
	}

	resize(width: number, height: number, options?: Partial<VResizeOptions>) {
		if (width > this.width || height > this.height) throw new Error(`Image upsampling is not supported at this time!`);
		options ??= {};
		options.filter ??= VFilters.Triangle;
		
		// Performance isn't ideal on the current filter system. For now, override Point with alternative nearest implementation.
		if (options.filter === VFilters.Point) return resizeNearest(this, width, height);
		return resizeFiltered(this, width, height, options as VResizeOptions);
	}
}

/** VTF-encoded image data. */
export class VEncodedImageData {
	readonly isEncoded = true as const;

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
		return getCodec(this.format).decode(this);
	}
}
