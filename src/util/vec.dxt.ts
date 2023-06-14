import { Vec3, dist } from './vec.js';

/** Creates a new Vec3 from the specified array at an optional offset.
 * This variant only exists for the DXT module, and forces the Vector be a Uint8ClampedArray.
 */
export function fromU8(source: ArrayLike<number>, index=0) {
	const vec = new Uint8ClampedArray(3);
	vec[0] = source[index];
	vec[1] = source[index+1];
	vec[2] = source[index+2];
	return vec;
}

/** Encodes the Vec3 as a 565 16-bit int.
 * This only works on int Vecs!
 */
export function encode565(a: Vec3) {
	return (
		(a[0] << 8 & 0b1111100000000000) |
		(a[1] << 3 & 0b0000011111100000) |
		(a[2] >> 3 & 0b0000000000011111)
	);
}

/** Returns Source as a float between A=0 and B=1. */
export function fit(source: Vec3, a: Vec3, b: Vec3) {
	const dist_a = dist(a, source);
	const dist_b = dist(source, b);
	return dist_a / (dist_a + dist_b);
}