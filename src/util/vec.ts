/** Generic Vec3 type helper. */
export interface Vec3 {[key: number]: number}
export type TypedArray = Uint8Array|Int8Array|Uint16Array|Int16Array|Uint32Array|Int32Array|Float32Array|Float64Array;
export const VecType = Float32Array;


/** Creates a blank new Vec3. @internal */
export function create(x: number=0, y: number=0, z: number=0) {
	return new VecType([x, y, z]);
}

/** Creates a new Vec3 from the specified array at an optional offset. @internal */
export function ref(source: TypedArray, index: number=0) {
	// @ts-expect-error Types don't match up here.
	return new source.constructor(source.buffer, index, 3);
}

/** Creates a new Vec3 from the specified array at an optional offset. @internal */
export function from(source: ArrayLike<number>, index: number=0) {
	const vec = new VecType(3);
	vec[0] = source[index];
	vec[1] = source[index+1];
	vec[2] = source[index+2];
	return vec;
}

/** Copies a Vec3 from the specified array at an optional offset. @internal */
export function copy(out: Vec3, source: ArrayLike<number>, index: number=0) {
	out[0] = source[index];
	out[1] = source[index+1];
	out[2] = source[index+2];
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

/** Returns Source as a float between A=0 and B=1. @internal */
export function fit(source: Vec3, a: Vec3, b: Vec3) {
	// (B - A) • (C - A) / dist(A, B)^2

	const d = dist2(a, b);
	if (d === 0) return 0.5;

	// const ba = sub(create(), b, a);
	// const ca = sub(create(), source, a);
	// const result = dot(ba, ca) / d;

	const result = (
		(b[0] - a[0]) * (source[0] - a[0]) +
		(b[1] - a[1]) * (source[1] - a[1]) +
		(b[2] - a[2]) * (source[2] - a[2])
	) / d;

	if (result < 0) return 0;
	if (result > 1) return 1;
	return result;
}