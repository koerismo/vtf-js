import { VFormats, type VFlags } from './enums.js';
import { VImageScaler, type VFilter } from './resize.js';
import { clamp } from './utils.js';

/** An array of decoded RGBA pixels. */
export type VPixelArray<T extends ArrayBufferLike = ArrayBufferLike> =
	| Uint8Array<T>
	| Uint16Array<T>
	| Uint32Array<T>
	| Float32Array<T>
	| Float64Array<T>
	| Float16Array<T>;

/** Represents an encoded OR decoded image. */
export type VImageEither<D extends VPixelArray = VPixelArray> = VImageData<D> | VEncodedImageData;

/** A generic constructor for VPixelArray types. */
export interface VPixelArrayConstructor<T extends VPixelArray = VPixelArray> {
	new (): T;
	new (length: number): T;
	new (array: ArrayLike<number> | Iterable<number>): T;
	new (buffer: ArrayBufferLike, byteOffset?: number, length?: number): T;
	readonly BYTES_PER_ELEMENT: number;
}

/** An object that defines an image encoder/decoder for a given format. */
export interface VCodec {
	alpha: VFlags.None | VFlags.OneBitAlpha | VFlags.EightBitAlpha;
	length(width: number, height: number): number;
	encode(data: VImageData): VEncodedImageData;
	decode(data: VEncodedImageData): VImageData;
}

/** Does the current environment support sec-float16array? */
export const HAS_FLOAT16 = typeof Float16Array !== 'undefined';

/** Returns whether the given array contains float values. */
export function isArrayFloat(arr: VPixelArray): arr is (Float32Array | Float64Array | Float16Array) {
	return (arr instanceof Float32Array || arr instanceof Float64Array || (HAS_FLOAT16 && arr instanceof Float16Array));
}

/** Returns the maximum value for the given array. (ex. `255` for a Uint8Array, `1.0` for a Float32Array) */
export function getPixelArrayMax(arr: VPixelArray): number {
	if (isArrayFloat(arr)) return 1;
	return 2 ** (arr.BYTES_PER_ELEMENT * 8) - 1;
}

/** All currently-registered image codecs. */
export const VCodecs: {[key in VFormats]?: VCodec} = {};

/** Register an image encoder/decoder for the specified format. */
export function registerCodec(format: VFormats, codec: VCodec) {
	VCodecs[format] = codec;
}

export function getCodec(format: VFormats, strict?: true): VCodec;
export function getCodec(format: VFormats, strict: boolean): VCodec | undefined;
export function getCodec(format: VFormats, strict: boolean=true): VCodec | undefined {
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

	/**
	 * Creates a blank image of the given datatype and size.
	 */
	static blank<T extends VPixelArray = VPixelArray>(width: number, height: number, dtype: VPixelArrayConstructor<T>): VImageData<T> {
		return new VImageData(new dtype(width * height * 4), width, height);
	}

	/** Creates a copy of this image. */
	copy(): VImageData<D> {
		return new VImageData(this.data.slice() as D, this.width, this.height);
	}

	/**
	 * Returns a converted copy of this image with the specified data format.
	 * @param type
	 * @param [do_clamp=true] If true, clamps between 0 and the array's pixel-white value. Defaults to true.
	 * @param [do_round=false] If true, rounds values when converting to integer data. Defaults to false.
	 * @example const converted: VImageData<Float32Array> = image.convert(Float32Array);
	 */
	convert<T extends VPixelArray = VPixelArray>(
		type: VPixelArrayConstructor<T>,
		do_clamp: boolean=true,
		do_round: boolean=false,
	): VImageData<T> {

		if (this.data instanceof type)
			return this.copy() as unknown as VImageData<T>;
			
		const out = new type(this.data.length) as T;
		const is_input_int  = !isArrayFloat(this.data);
		const is_output_int = !isArrayFloat(out);

		const input_max  = is_input_int  ? 2 ** (this.data.BYTES_PER_ELEMENT * 8) - 1 : 1;
		const output_max = is_output_int ? 2 ** (      out.BYTES_PER_ELEMENT * 8) - 1 : 1;

		const add_factor = (do_round && is_output_int) ? 0.5 : 0;
		const mult_factor = output_max / input_max;

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

	/** Returns a converted copy of this image if the given format does not match, and returns itself otherwise. See {@link convert} */
	coerce<T extends VPixelArray = VPixelArray>(
		type: VPixelArrayConstructor<T>,
		do_clamp?: boolean,
		do_round?: boolean,
	): VImageData<T> {
		if (this.data instanceof type) return this as unknown as VImageData<T>;
		return this.convert(type, do_clamp, do_round);
	}

	/** Encodes this image into the specified format and validates the length of the resulting data. */
	encode(format: VFormats): VEncodedImageData {
		const codec = getCodec(format);
		const length = codec.length(this.width, this.height);
		const out = codec.encode(this);
		if (out.data.length !== length) throw Error(`VImageData.encode: Encoded ${VFormats[format]} image failed length validation! (expected ${length} but got ${out.data.length})`);
		return out;
	}

	/** Dummy function - returns self. */
	decode(): VImageData {
		return this;
	}

	/**
	 * Returns a resampled copy of this image with the given dimensions.
	 * ### If you are batch-resizing images, create and reuse a VImageScaler for better performance!
	 */
	resize(width: number, height: number, options?: Partial<{ filter: VFilter, clamp: boolean }>): VImageData<D> {
		options ??= {};

		const scaler = new VImageScaler(this.width, this.height, width, height, options.filter);
		const out = VImageData.blank(width, height, this.getDataConstructor());
		return scaler.resize(this, out, options.clamp);
	}

	/** Retrieves the constructor of this image's data with a type-safe wrapper. */
	getDataConstructor(): VPixelArrayConstructor<D> {
		return <VPixelArrayConstructor<D>> this.data.constructor;
	}
}

/** Format-encoded image data. */
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

	/** Decodes this image into RGBA pixel data. */
	decode(): VImageData {
		const length = this.width * this.height * 4;
		const out = getCodec(this.format).decode(this);
		if (out.data.length !== length) throw Error(`VImageData.decode: Decoded ${VFormats[this.format]} image failed length validation! (expected ${length} but got ${out.data.length})`);
		return out;
	}

	/** If necessary, decodes and encodes this image into the desired format. Otherwise, returns self. */
	encode(format: VFormats): VEncodedImageData {
		if (format === this.format) return this;
		return this.decode().encode(format);
	}
}
