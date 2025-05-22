/** Generic Vec3 type helper. */
export interface Vec3 {[key: number]: number}
export type TypedArray = Uint8Array|Int8Array|Uint16Array|Int16Array|Uint32Array|Int32Array|Float32Array|Float64Array;
export const VecType = Float32Array;

const VEC3_SIZE = VecType.BYTES_PER_ELEMENT * 3;

/** Creates a blank new Vec3. @internal */
export function create(x: number=0, y: number=x, z: number=x): Vec3 {
	return new VecType([x, y, z]);
}

export function createArray(length: number|ArrayBufferLike): Vec3[] {
	let buf: ArrayBufferLike;
	if (typeof length !== 'number') {
		buf = length;
		length = buf.byteLength / VecType.BYTES_PER_ELEMENT;
	}
	else {
		buf = new ArrayBuffer(VEC3_SIZE * length);
	}
	const out = Array(length);
	for (let i=0; i<length; i++) {
		out[i] = new VecType(buf, i * VEC3_SIZE, 3);
	}
	return out;
}

/** Creates a blank new Vec3. @internal */
export function createUi(x: number=0, y: number=x, z: number=x): Uint32Array {
	return new Uint32Array([x, y, z]);
}

/** Creates a new Vec3 from the specified array at an optional offset. @internal */
export function ref(source: TypedArray, index: number=0) {
	// @ts-expect-error Types don't match up here.
	return new source.constructor(source.buffer, index*source.BYTES_PER_ELEMENT*3, 3);
}

/** Creates a new Vec3 from the specified array at an optional offset. @internal */
export function from(source: ArrayLike<number>, index: number=0) {
	const vec = new VecType(3);
	vec[0] = source[index];
	vec[1] = source[index+1];
	vec[2] = source[index+2];
	return vec;
}

/** Creates a new Vec3 from the specified array at an optional offset. @internal */
export function setValues(out: Vec3, x: number, y: number, z: number) {
	out[0] = x;
	out[1] = y;
	out[2] = z;
	return out;
}

/** Copies a Vec3 from the specified array at an optional offset. @internal */
export function copy(out: Vec3, source: ArrayLike<number>|Vec3, index: number=0) {
	out[0] = source[index];
	out[1] = source[index+1];
	out[2] = source[index+2];
	return out;
}

/** Copies a Vec3 from the specified array at an optional offset. @internal */
export function copyInto(out: TypedArray, source: Vec3, index: number=0) {
	out[index] = source[0];
	out[index+1] = source[1];
	out[index+2] = source[2];
	return out;
}

/** Copies a Vec3 from the specified array at an optional offset. @internal */
export function copyValuesInto(out: TypedArray, x: number, y: number, z: number, index: number=0) {
	out[index] = x;
	out[index+1] = y;
	out[index+2] = z;
	return out;
}

/** Fills a Vec3 with the provided value. @internal */
export function fill(out: Vec3, v: number=0) {
	out[0] = out[1] = out[2] = v;
	return out;
}

/** Adds A and B @internal */
export function add(out: Vec3, a: Vec3, b: Vec3) {
	out[0] = a[0] + b[0];
	out[1] = a[1] + b[1];
	out[2] = a[2] + b[2];
	return out;
}

/** Subtracts B from A @internal */
export function sub(out: Vec3, a: Vec3, b: Vec3) {
	out[0] = a[0] - b[0];
	out[1] = a[1] - b[1];
	out[2] = a[2] - b[2];
	return out;
}

/** Multiplies A by B @internal */
export function mult(out: Vec3, a: Vec3, b: Vec3) {
	out[0] = a[0] * b[0];
	out[1] = a[1] * b[1];
	out[2] = a[2] * b[2];
	return out;
}

/** Divides A by B @internal */
export function div(out: Vec3, a: Vec3, b: Vec3) {
	out[0] = a[0] / b[0];
	out[1] = a[1] / b[1];
	out[2] = a[2] / b[2];
	return out;
}


/** Multiplies A by B @internal */
export function multAdd(out: Vec3, a: Vec3, b: Vec3, c: Vec3) {
	out[0] = a[0] * b[0] + c[0];
	out[1] = a[1] * b[1] + c[1];
	out[2] = a[2] * b[2] + c[2];
	return out;
}

/** @internal */
export function dot(a: Vec3, b: Vec3) {
	return (
		a[0] * b[0] +
		a[1] * b[1] +
		a[2] * b[2]
	);
}

/** Scales A by B @internal */
export function scale(out: Vec3, a: Vec3, b: number) {
	out[0] = a[0] * b;
	out[1] = a[1] * b;
	out[2] = a[2] * b;
	return out;
}

/** Scales A by B @internal */
export function scaleAdd(out: Vec3, a: Vec3, b: number, c: Vec3) {
	out[0] = a[0] * b + c[0];
	out[1] = a[1] * b + c[1];
	out[2] = a[2] * b + c[2];
	return out;
}

/** Clamps A to min-max @internal */
export function clamp(out: Vec3, a: Vec3, min: number, max: number) {
	out[0] = Math.min(Math.max(a[0], min), max);
	out[1] = Math.min(Math.max(a[1], min), max);
	out[2] = Math.min(Math.max(a[2], min), max);
	return out;
}

/** Returns the length of A @internal */
export function length(a: Vec3) {
	return Math.hypot(a[0], a[1], a[2]);
}

/** Returns the distance between A and B @internal */
export function dist(a: Vec3, b: Vec3) {
	return Math.hypot(
		b[0] - a[0],
		b[1] - a[1],
		b[2] - a[2]
	);
}

/** Returns the squared distance between A and B @internal */
export function dist2(a: Vec3, b: Vec3) {
	return (
		(b[0] - a[0])**2 +
		(b[1] - a[1])**2 +
		(b[2] - a[2])**2
	);
}

/** Returns the mins of vectors A and B @internal */
export function min(out: Vec3, a: Vec3, b: Vec3) {
	out[0] = Math.min(a[0], b[0]);
	out[1] = Math.min(a[1], b[1]);
	out[2] = Math.min(a[2], b[2]);
	return out;
}

/** Returns the maxes of vectors A and B @internal */
export function max(out: Vec3, a: Vec3, b: Vec3) {
	out[0] = Math.max(a[0], b[0]);
	out[1] = Math.max(a[1], b[1]);
	out[2] = Math.max(a[2], b[2]);
	return out;
}

/** Returns the ceiled value of vector A @internal */
export function ceil(out: Vec3, a: Vec3) {
	out[0] = Math.ceil(a[0]);
	out[1] = Math.ceil(a[1]);
	out[2] = Math.ceil(a[2]);
	return out;
}

/** Returns the floored value of vector A @internal */
export function floor(out: Vec3, a: Vec3) {
	out[0] = Math.floor(a[0]);
	out[1] = Math.floor(a[1]);
	out[2] = Math.floor(a[2]);
	return out;
}

/** Returns the rounded value of vector A @internal */
export function round(out: Vec3, a: Vec3) {
	out[0] = Math.round(a[0]);
	out[1] = Math.round(a[1]);
	out[2] = Math.round(a[2]);
	return out;
}
/** @internal */
export function subDot(a: Vec3, b: Vec3) {
	return (
		(a[0] - b[0]) ** 2 +
		(a[1] - b[1]) ** 2 +
		(a[2] - b[2]) ** 2
	);
}
