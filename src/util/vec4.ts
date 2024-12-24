/** Generic Vec4 type helper. */
export interface Vec4 {[key: number]: number}
export type TypedArray = Uint8Array|Int8Array|Uint16Array|Int16Array|Uint32Array|Int32Array|Float32Array|Float64Array;
export const VecType = Float32Array;

/** Creates a blank new Vec4. @internal */
export function create(x: number=0, y: number=x, z: number=x, w: number=x): Vec4 {
	return new VecType([x, y, z, w]);
}

/** Creates a new Vec4 from the specified array at an optional offset. @internal */
export function ref(source: TypedArray, index: number=0) {
	// @ts-expect-error Types don't match up here.
	return new source.constructor(source.buffer, index*source.BYTES_PER_ELEMENT, 4);
}

/** Creates a new Vec4 from the specified array at an optional offset. @internal */
export function from(source: ArrayLike<number>, index: number=0) {
	const vec = new VecType(4);
	vec[0] = source[index],
	vec[1] = source[index+1],
	vec[2] = source[index+2],
	vec[3] = source[index+3];
	return vec;
}

/** Creates a new Vec4 from the specified array at an optional offset. @internal */
export function setValues(out: Vec4, x: number, y: number, z: number, w: number) {
	out[0] = x,
	out[1] = y,
	out[2] = z,
	out[3] = w;
	return out;
}

/** Copies a Vec4 from the specified array at an optional offset. @internal */
export function copy(out: Vec4, source: ArrayLike<number>|Vec4, index: number=0) {
	out[0] = source[index],
	out[1] = source[index+1],
	out[2] = source[index+2],
	out[3] = source[index+3];
	return out;
}

/** Copies a Vec4 from the specified array at an optional offset. @internal */
export function copyInto(out: TypedArray, source: Vec4, index: number=0) {
	out[index] = source[0],
	out[index+1] = source[1],
	out[index+2] = source[2],
	out[index+3] = source[3];
	return out;
}

/** Copies a Vec4 from the specified array at an optional offset. @internal */
export function copyValuesInto(out: TypedArray, x: number, y: number, z: number, w: number, index: number=0) {
	out[index] = x,
	out[index+1] = y,
	out[index+2] = z,
	out[index+3] = w;
	return out;
}

/** Fills a Vec4 with the provided value. @internal */
export function fill(out: Vec4, v: number=0) {
	out[0] = out[1] = out[2] = out[3] = v;
	return out;
}

/** Adds A and B @internal */
export function add(out: Vec4, a: Vec4, b: Vec4) {
	out[0] = a[0] + b[0],
	out[1] = a[1] + b[1],
	out[2] = a[2] + b[2],
	out[3] = a[3] + b[3];
	return out;
}

/** Subtracts B from A @internal */
export function sub(out: Vec4, a: Vec4, b: Vec4) {
	out[0] = a[0] - b[0],
	out[1] = a[1] - b[1],
	out[2] = a[2] - b[2],
	out[3] = a[3] - b[3];
	return out;
}

/** Multiplies A by B @internal */
export function mult(out: Vec4, a: Vec4, b: Vec4) {
	out[0] = a[0] * b[0],
	out[1] = a[1] * b[1],
	out[2] = a[2] * b[2],
	out[3] = a[3] * b[3];
	return out;
}

/** Multiplies A by B @internal */
export function multAdd(out: Vec4, a: Vec4, b: Vec4, c: Vec4) {
	out[0] = a[0] * b[0] + c[0],
	out[1] = a[1] * b[1] + c[1],
	out[2] = a[2] * b[2] + c[2],
	out[3] = a[3] * b[3] + c[3];
	return out;
}

/** @internal */
export function dot(a: Vec4, b: Vec4) {
	return (
		a[0] * b[0] +
		a[1] * b[1] +
		a[2] * b[2] +
		a[3] * b[3]
	);
}

/** Scales A by B @internal */
export function scale(out: Vec4, a: Vec4, b: number) {
	out[0] = a[0] * b,
	out[1] = a[1] * b,
	out[2] = a[2] * b,
	out[3] = a[3] * b;
	return out;
}

/** Gets the reciprocal of A and multiplies by B @internal */
export function reciprocal(out: Vec4, a: Vec4, b: number=1) {
	out[0] = b / a[0],
	out[1] = b / a[1],
	out[2] = b / a[2],
	out[3] = b / a[3];
	return out;
}

/** Scales A by B @internal */
export function scaleAdd(out: Vec4, a: Vec4, b: number, c: Vec4) {
	out[0] = a[0] * b + c[0],
	out[1] = a[1] * b + c[1],
	out[2] = a[2] * b + c[2],
	out[3] = a[3] * b + c[3];
	return out;
}

/** Clamps A to min-max @internal */
export function clamp(out: Vec4, a: Vec4, min: number, max: number) {
	out[0] = Math.min(Math.max(a[0], min), max),
	out[1] = Math.min(Math.max(a[1], min), max),
	out[2] = Math.min(Math.max(a[2], min), max),
	out[3] = Math.min(Math.max(a[3], min), max);
	return out;
}

/** Returns the length of A @internal */
export function length(a: Vec4) {
	return Math.hypot(a[0], a[1], a[2], a[3]);
}

/** Returns the length of A @internal */
export function length2(a: Vec4) {
	return (a[0]**2 + a[1]**2 + a[2]**2 + a[3]**2);
}

/** Returns the distance between A and B @internal */
export function dist(a: Vec4, b: Vec4) {
	return Math.hypot(
		b[0] - a[0],
		b[1] - a[1],
		b[2] - a[2],
		b[3] - a[3]
	);
}

/** Returns the squared distance between A and B @internal */
export function dist2(a: Vec4, b: Vec4) {
	return (
		(b[0] - a[0])**2 +
		(b[1] - a[1])**2 +
		(b[2] - a[2])**2 +
		(b[3] - a[3])**2
	);
}
