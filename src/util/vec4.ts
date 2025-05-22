/** Generic Vec3 type helper. */
export interface Vec4 {[key: number]: number}
export type TypedArray = Uint8Array|Int8Array|Uint16Array|Int16Array|Uint32Array|Int32Array|Float32Array|Float64Array;
export const VecType = Float32Array;


/** Creates a blank new Vec4. @internal */
export function create(x: number=0, y: number=x, z: number=x, w: number=0) {
	return new VecType([x, y, z, w]);
}

/** Creates a blank new Vec4. @internal */
export function createUi(x: number=0, y: number=x, z: number=x, w: number=0) {
	return new Uint32Array([x, y, z, w]);
}

/** Creates a new Vec4 from the specified array at an optional offset. @internal */
export function ref(source: TypedArray, index: number=0) {
	// @ts-expect-error Types don't match up here.
	return new source.constructor(source.buffer, index, 4);
}

/** Creates a new Vec4 from the specified array at an optional offset. @internal */
export function from(source: ArrayLike<number>, index: number=0) {
	const vec = new VecType(3);
	vec[0] = source[index];
	vec[1] = source[index+1];
	vec[2] = source[index+2];
	vec[3] = source[index+3];
	return vec;
}

/** Copies a Vec4 from the specified array at an optional offset. @internal */
export function copy(out: Vec4, source: ArrayLike<number>, index: number=0) {
	out[0] = source[index];
	out[1] = source[index+1];
	out[2] = source[index+2];
	out[3] = source[index+3];
	return out;
}

/** Adds A and B @internal */
export function add(out: Vec4, a: Vec4, b: Vec4) {
	out[0] = a[0] + b[0];
	out[1] = a[1] + b[1];
	out[2] = a[2] + b[2];
	out[3] = a[3] + b[3];
	return out;
}

/** Subtracts B from A @internal */
export function sub(out: Vec4, a: Vec4, b: Vec4) {
	out[0] = a[0] - b[0];
	out[1] = a[1] - b[1];
	out[2] = a[2] - b[2];
	out[3] = a[3] - b[3];
	return out;
}

/** Multiplies A by B @internal */
export function mult(out: Vec4, a: Vec4, b: Vec4) {
	out[0] = a[0] * b[0];
	out[1] = a[1] * b[1];
	out[2] = a[2] * b[2];
	out[3] = a[3] * b[3];
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
	out[0] = a[0] * b;
	out[1] = a[1] * b;
	out[2] = a[2] * b;
	out[3] = a[3] * b;
	return out;
}

/** Returns the length of A @internal */
export function length(a: Vec4) {
	return Math.hypot(a[0], a[1], a[2], a[3]);
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
