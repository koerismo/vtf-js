/** Generic Vec3 type helper. */
export interface Vec3 {[key: number]: number}
export type TypedArray = Uint8Array|Int8Array|Uint16Array|Int16Array|Uint32Array|Int32Array|Float32Array|Float64Array;
export const VecType = Float32Array;

// const VEC3_SIZE = VecType.BYTES_PER_ELEMENT * 3;

/** Creates a blank new Vec3. @internal */
export function create(): Vec3 {
	return new VecType(3);
}

/** Creates a new Vec3 from the specified array at an optional offset. @internal */
export function setValues(out: Vec3, x: number, y: number, z: number) {
	out[0] = x;
	out[1] = y;
	out[2] = z;
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

/** Scales A by B @internal */
export function scale(out: Vec3, a: Vec3, b: number) {
	out[0] = a[0] * b;
	out[1] = a[1] * b;
	out[2] = a[2] * b;
	return out;
}

/** Returns A * B + C @internal */
export function scaleAdd(out: Vec3, a: Vec3, b: number, c: Vec3) {
	out[0] = a[0] * b + c[0];
	out[1] = a[1] * b + c[1];
	out[2] = a[2] * b + c[2];
	return out;
}

/** Returns the squared length of A @internal */
export function length2(a: Vec3) {
	return a[0]**2 + a[1]**2 + a[2]**2;
}
