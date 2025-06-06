import { VFormats } from './enums.js';
import { VFilter, VFilters, VImageScaler } from './resize.js';
import { clamp } from './utils.js';

/** An array of decoded RGBA pixels. */
export type VPixelArray = Uint8Array|Uint16Array|Uint32Array|Float32Array|Float64Array|Float16Array;

/** A generic constructor for VPixelArray types. */
export interface VPixelArrayConstructor<T extends VPixelArray = VPixelArray> {
	new (length?: number): T;
    new (array: ArrayLike<number> | Iterable<number>): T;
    new (buffer: ArrayBufferLike, byteOffset?: number, length?: number): T;
	readonly BYTES_PER_ELEMENT: number;
}

/** An object that defines an image encoder/decoder for a given format. */
export interface VCodec {
	length(width: number, height: number): number;
	encode(data: VImageData): VEncodedImageData;
	decode(data: VEncodedImageData): VImageData;
}

/** Does the current environment support sec-float16array? */
export const HAS_FLOAT16 = typeof Float16Array !== 'undefined';

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
	if (!codec && strict) throw Error(`getCodec: Could not get codec for format ${VFormats[format]}!`);
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

	/** Returns a remapped copy of this image with the specified data format, normalizing floating-point formats to 0-1.
	 * If `do_clamp` is set to true, the data will be clamped between 0 and the array's maximum value.
	 * @example const converted: VImageData<Float32Array> = image.convert(Float32Array);
	 */
	convert<T extends VPixelArray = VPixelArray>(type: VPixelArrayConstructor<T>, do_clamp=true): VImageData<T> {
		if (this.data instanceof type) return <VImageData<T>><unknown>this;

		const out = new type(this.data.length) as T;
		const is_input_int  = !(this.data instanceof Float32Array || this.data instanceof Float64Array || (HAS_FLOAT16 && this.data instanceof Float16Array));
		const is_output_int = !(      out instanceof Float32Array ||       out instanceof Float64Array || (HAS_FLOAT16 &&       out instanceof Float16Array));

		const input_max  = is_input_int  ? 2 ** (this.data.BYTES_PER_ELEMENT * 8) - 1 : 1;
		const output_max = is_output_int ? 2 ** (      out.BYTES_PER_ELEMENT * 8) - 1 : 1;

		const mult_factor = output_max / input_max;
		const add_factor = 0; // (+is_input_int - +is_output_int) * 0.5;

		if (do_clamp) {
			for ( let i=0; i<this.data.length; i++ )
				out[i] = clamp(this.data[i] * mult_factor + add_factor, 0, output_max);
		}
		else{
			for ( let i=0; i<this.data.length; i++ )
				out[i] = this.data[i] * mult_factor + add_factor;
		}

		return new VImageData(out, this.width, this.height);
	}

	/** Encodes this image into the specified format and validates the length of the resulting data. */
	encode(format: VFormats): VEncodedImageData {
		const codec = getCodec(format);
		const length = codec.length(this.width, this.height);
		const out = codec.encode(this);
		if (out.data.length !== length) throw Error(`VImageData.encode: Encoded ${VFormats[format]} image failed length validation! (expected ${length} but got ${out.data.length})`);
		return out;
	}

	/**
	 * Returns a resampled copy of this image with the given dimensions.
	 * ### If you are batch-resizing images, create and reuse a VImageScaler for better performance!
	 */
	resize(width: number, height: number, options?: Partial<{ filter: VFilter }>): VImageData<D> {
		options ??= {};
		options.filter ??= VFilters.Triangle;
		
		const scaler = new VImageScaler(this.width, this.height, width, height, options.filter);
		const out_data = new (<VPixelArrayConstructor>this.data.constructor)(width * height * 4) as D;
		const out = new VImageData(out_data, width, height);

		return scaler.resize(this, out);
	}

	/** Retrieves the constructor of this image's data with a type-safe wrapper. */
	getDataConstructor(): VPixelArrayConstructor<D> {
		return <VPixelArrayConstructor<D>> this.data.constructor;
	}
}

/** Vtf-encoded image data. */
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
		const length = this.width * this.height * 4;
		const out = getCodec(this.format).decode(this);
		if (out.data.length !== length) throw Error(`VImageData.encode: Decoded ${VFormats[this.format]} image failed length validation! (expected ${length} but got ${out.data.length})`);
		return out;
	}
}
