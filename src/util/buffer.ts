const TE = new TextEncoder();
const TD = new TextDecoder();

export class DataBuffer extends Uint8Array {
	pointer = 0;
	protected view: DataView;
	protected little = false;

	constructor(length: number);
	constructor(array: ArrayLike<number> | ArrayBufferLike);
	constructor(buffer: ArrayBufferLike, byteOffset?: number, length?: number);
	constructor(buffer: number|ArrayLike<number>|ArrayBufferLike, byteOffset?: number, length?: number) {

		// @ts-expect-error When initializing a Uint8Array from another array, byteOffset and length
		// are disregarded for some reason. This is just a quick hack to make it work as expected.
		if (!(buffer instanceof ArrayBuffer) && byteOffset !== 0 && length !== undefined) buffer = buffer.buffer;

		// @ts-expect-error JUST MAKE IT WORK.
		super(buffer, byteOffset, length);
		this.view = new DataView(this.buffer, this.byteOffset, this.byteLength);
	}

	set_endian(little: boolean) {
		this.little = little;
	}

	goto(position: number) {
		this.pointer = position;
	}

	pad(length: number): void {
		this.pointer += length;
	}

	align(multiple: number, offset?: number): void {
		this.pointer = (offset ?? 0) + this.pointer + (multiple - this.pointer % multiple) % multiple;
	}

	read_u8(): number;
	read_u8(length: number): Uint8Array;
	read_u8(length?: number) {
		const start = this.pointer;

		if (length === undefined) {
			this.pointer ++;
			return this.view.getUint8(start);
		}

		this.pointer += length;
		return new Uint8Array(this.slice(start, this.pointer));
	}

	write_u8(value: number|Uint8Array) {
		const start = this.pointer;

		if (typeof value === 'number') {
			this.pointer ++;
			return this.view.setUint8(start, value);
		}

		this.pointer += value.length;
		this.set(value, start);
		return;
	}

	read_u16(): number;
	read_u16(length: number, little?: boolean): Uint16Array;
	read_u16(length?: number, little: boolean=this.little) {
		const start = this.pointer;

		if (length === undefined) {
			this.pointer += 2;
			return this.view.getUint16(start, little);
		}

		this.pointer += length * 2;
		const arr = new Uint16Array(length);
		for ( let i=0; i<length; i++ ) arr[i] = this.view.getUint16(start + i*2, little);
		return arr;
	}

	write_u16(value: number|Uint8Array, little: boolean=this.little) {
		const start = this.pointer;

		if (typeof value === 'number') {
			this.pointer += 2;
			return this.view.setUint16(start, value, little);
		}

		this.pointer += value.length * 2;
		for ( let i=0; i<value.length; i++ ) this.view.setUint16(start + i*2, value[i], little);
		return;
	}

	read_u32(): number;
	read_u32(length: number, little?: boolean): Uint32Array;
	read_u32(length?: number, little: boolean=this.little) {
		const start = this.pointer;

		if (length === undefined) {
			this.pointer += 4;
			return this.view.getUint32(start, little);
		}

		this.pointer += length * 4;
		const arr = new Uint32Array(length);
		for ( let i=0; i<length; i++ ) arr[i] = this.view.getUint32(start + i*4, little);
		return arr;
	}

	write_u32(value: number|Uint32Array, little: boolean=this.little) {
		const start = this.pointer;

		if (typeof value === 'number') {
			this.pointer += 4;
			return this.view.setUint32(start, value, little);
		}

		this.pointer += value.length * 4;
		for ( let i=0; i<value.length; i++ ) this.view.setUint32(start + i*4, value[i], little);
		return;
	}

	read_i32(): number;
	read_i32(length: number, little?: boolean): Int32Array;
	read_i32(length?: number, little: boolean=this.little) {
		const start = this.pointer;

		if (length === undefined) {
			this.pointer += 4;
			return this.view.getInt32(start, little);
		}

		this.pointer += length * 4;
		const arr = new Int32Array(length);
		for ( let i=0; i<length; i++ ) arr[i] = this.view.getInt32(start + i*4, little);
		return arr;
	}

	write_i32(value: number|Int32Array, little: boolean=this.little) {
		const start = this.pointer;

		if (typeof value === 'number') {
			this.pointer += 4;
			return this.view.setInt32(start, value, little);
		}

		this.pointer += value.length * 4;
		for ( let i=0; i<value.length; i++ ) this.view.setInt32(start + i*4, value[i], little);
		return;
	}

	read_f32(): number;
	read_f32(length: number, little?: boolean): Float32Array;
	read_f32(length?: number, little: boolean=this.little) {
		const start = this.pointer;

		if (length === undefined) {
			this.pointer += 4;
			return this.view.getFloat32(start, little);
		}

		this.pointer += length * 4;
		const arr = new Float32Array(length);
		for ( let i=0; i<length; i++ ) arr[i] = this.view.getFloat32(start + i*4, little);
		return arr;
	}

	write_f32(value: number|Float32Array, little: boolean=this.little) {
		const start = this.pointer;

		if (typeof value === 'number') {
			this.pointer += 4;
			return this.view.setFloat32(start, value, little);
		}

		this.pointer += value.length * 4;
		for ( let i=0; i<value.length; i++ ) this.view.setFloat32(start + i*4, value[i], little);
		return;
	}

	read_str(): string;
	read_str(length: number): string;
	read_str(length?: number) {
		const start = this.pointer;
		let end = start + <number>length;

		if (length === undefined) {
			for (end = start; end < this.length; end++) {
				if (this.view.getUint8(end) == 0) break;
			}
			this.pointer ++;
		}

		this.pointer += end - start;
		return TD.decode(this.slice(start, end));
	}

	write_str(str: string, length?: number) {
		const start = this.pointer;
		this.pointer += str.length;

		this.set(TE.encode(str), start);

		if (length === undefined) {
			this.view.setUint8(this.pointer, 0);
			this.pointer ++;
		}
		else if (str.length !== length) {
			throw new RangeError('String of length '+str.length+' does not match write length of '+length+'!');
		}
	}
}