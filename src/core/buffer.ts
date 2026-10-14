import { SYSTEM_ENDIAN } from './utils.js';

const TE = new TextEncoder();
const TD = new TextDecoder();

/** Wraps DataView with utility functions and pointer offsets. */
export class DataBuffer<T extends ArrayBufferLike = ArrayBufferLike> extends Uint8Array<T> {
	view: DataView;
	protected _internal_ptr = 0;
	protected little = true;

	get pointer(): number {
		return this._internal_ptr;
	}

	set pointer(v: number) {
		if (v < 0 || v > this.length)
			throw Error(`Attempted to seek outside buffer bounds! (${this._internal_ptr} to ${v})`);
		this._internal_ptr = v;
	}

	private constructor(length: number);
	private constructor(array: ArrayLike<number>);
	private constructor(buffer: ArrayBufferLike, byteOffset?: number, length?: number);
	private constructor(
		buffer: number | ArrayLike<number> | ArrayBufferLike,
		byteOffset?: number,
		length?: number,
	) {
		// @ts-expect-error JUST MAKE IT WORK.
		super(buffer, byteOffset, length);
		this.view = new DataView(this.buffer, this.byteOffset, this.byteLength);
	}

	static new(length: number): DataBuffer<ArrayBuffer> {
		return new this(length);
	}

	static copy(array: Uint8Array | Uint8ClampedArray | ArrayBufferLike): DataBuffer<ArrayBuffer> {
		return new this(ArrayBuffer.isView(array) ? array : new Uint8Array(array));
	}

	/**
	 * If `array` is an ArrayBuffer:
	 * - byteOffset defaults to 0
	 * - length defaults to entire ArrayBuffer starting at byteOffset.
	 *
	 * If `array` is a TypedArray:
	 * - byteOffset is relative to the array's byteOffset
	 * - length defaults to the array's length from byteOffset.
	 */
	static ref<V extends ArrayBufferLike>(
		array: Uint8Array<V> | Uint8ClampedArray<V> | V,
		byteOffset?: number,
		length?: number,
	): DataBuffer<V> {
		if (ArrayBuffer.isView(array)) {
			byteOffset ??= 0;
			return new this(
				array.buffer,
				array.byteOffset + byteOffset,
				length ?? array.length - byteOffset,
			);
		}
		return new this(array, byteOffset, length);
	}

	/** Increments the pointer by the specified number of bytes. */
	inc(length: number = 1): number {
		const s = this._internal_ptr;
		this.pointer += length;
		return s;
	}

	/** Moves the pointer to the specified position. */
	seek(position: number): void {
		this.pointer = position;
	}

	/** Creates a new DataBuffer within the specified bounds. */
	ref(start = 0, length: number = this.length - start): DataBuffer<T> {
		const buf = new DataBuffer<T>(this.buffer, start + this.byteOffset, length);
		buf.little = this.little;
		return buf;
	}

	/** Aligns the pointer to the nearest multiple specified, and pads a number of bytes if specified. */
	// align(multiple: number, offset?: number): void {
	// 	this._ptr = (offset ?? 0) + this._ptr + (multiple - this._ptr % multiple) % multiple;
	// }

	read_u8(): number {
		return this[this.pointer++];
	}

	read_u16(little = this.little): number {
		return this.view.getUint16(this.inc(2), little);
	}

	read_i16(little = this.little): number {
		return this.view.getInt16(this.inc(2), little);
	}

	read_u32(little = this.little): number {
		return this.view.getUint32(this.inc(4), little);
	}

	read_f32(little = this.little): number {
		return this.view.getFloat32(this.inc(4), little);
	}

	read_u8array<C extends boolean>(
		length: number,
		clone: C,
	): Uint8Array<C extends true ? ArrayBuffer : T>;
	read_u8array(length: number, clone: boolean): Uint8Array {
		const arr = this.subarray(this.inc(length), this._internal_ptr);
		return clone ? arr.slice() : arr;
	}

	read_f32array<C extends boolean>(
		length: number,
		clone: C,
		litte?: boolean,
	): Float32Array<C extends true ? ArrayBuffer : T>;
	read_f32array(length: number, clone: boolean, little = this.little): Float32Array {
		if (little === SYSTEM_ENDIAN) {
			const source = this.read_u8array(length * 4, clone);
			return new Float32Array(source.buffer, source.byteOffset, length);
		} else {
			const start = this.inc(length * 2);
			const arr = new Float32Array(length);
			for (let i = 0, idx = start; i < length; i++, idx += 4) {
				arr[i] = this.view.getFloat32(idx, little);
			}
			return arr;
		}
	}

	write_u8(value: number): void {
		this[this.pointer++] = value;
	}

	write_u16(value: number, little = this.little): void {
		this.view.setUint16(this.inc(2), value, little);
	}

	write_i16(value: number, little = this.little): void {
		this.view.setInt16(this.inc(2), value, little);
	}

	write_u32(value: number, little = this.little): void {
		this.view.setUint32(this.inc(4), value, little);
	}

	write_i32(value: number, little = this.little): void {
		this.view.setInt32(this.inc(4), value, little);
	}

	write_f32(value: number, little = this.little): void {
		this.view.setFloat32(this.inc(4), value, little);
	}

	/** Do a fast-copy and return true if possible. Otherwise, return false. */
	protected _try_write_le(value: ArrayBufferView, little: boolean): boolean {
		if (little !== SYSTEM_ENDIAN) return false;
		this.write_u8array(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
		return true;
	}

	write_u8array(value: Uint8Array): void {
		this.set(value, this.inc(value.length));
	}

	write_u16array(value: Uint16Array, little = this.little): void {
		if (!this._try_write_le(value, little)) {
			const start = this.inc(value.length * 2);
			for (let i = 0, idx = start; i < value.length; i++, idx += 2) {
				this.view.setUint16(idx, value[i], little);
			}
		}
	}

	write_u32array(value: Uint32Array, little = this.little): void {
		if (!this._try_write_le(value, little)) {
			const start = this.inc(value.length * 4);
			for (let i = 0, idx = start; i < value.length; i++, idx += 4) {
				this.view.setUint32(idx, value[i], little);
			}
		}
	}

	write_f32array(value: Float32Array, little = this.little): void {
		if (!this._try_write_le(value, little)) {
			const start = this.inc(value.length * 4);
			for (let i = 0, idx = start; i < value.length; i++, idx += 4) {
				this.view.setFloat32(idx, value[i], little);
			}
		}
	}

	read_str(length: number): string {
		return TD.decode(this.ref(this.inc(length), length));
	}

	write_str(str: string): void {
		TE.encodeInto(str, this.ref(this.inc(str.length), str.length));
	}
}
