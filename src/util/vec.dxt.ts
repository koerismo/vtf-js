import { Vec3, VecType, dist } from './vec.js';

/** Creates a new Vec3 from the specified array at an optional offset.
 * This variant only exists for the DXT module, and forces the Vector be a Uint8Array.
 */
export function fromU8(source: ArrayLike<number>, index=0) {
	const vec = new Uint8Array(3);
	vec[0] = source[index];
	vec[1] = source[index+1];
	vec[2] = source[index+2];
	return vec;
}

/** Encodes a RGB888 Vec3 as a 565 16-bit int. */
export function encode565(a: Uint8Array, index=0, r=0, g=1, b=2) {
	return (
		((Math.round(a[index+r] / 0xff * 0b11111)  << 11) & 0b1111100000000000) |
		((Math.round(a[index+g] / 0xff * 0b111111) << 5)  & 0b0000011111100000) |
		((Math.round(a[index+b] / 0xff * 0b11111)  << 0)  & 0b0000000000011111)
	);
}

/** Decodes a 16-bit int as an RGB323232F Vec3. */
export function decode565(out: Float32Array, a: number, offset: number=0, r=0, g=1, b=2): Float32Array {
	out[offset+r] = (((a & 0b1111100000000000) >> 11) / 0b11111);
	out[offset+g] = (((a & 0b0000011111100000) >> 5)  / 0b111111);
	out[offset+b] = (((a & 0b0000000000011111) >> 0)  / 0b11111);
	return out;
}

/** Returns Source as a float between A=0 and B=1. */
export function fit(source: Vec3, a: Vec3, b: Vec3) {
	const dist_a = dist(a, source);
	const dist_b = dist(source, b);
	return dist_a / (dist_a + dist_b);
}

/** Blends two Vec3s by a factor of Fit. (0 = a, 1 = b)*/
export function blend(fit: number, a: Vec3, b: Vec3) {
	const afit = (1 - fit);
	return new VecType([
		a[0] * afit + b[0] * fit,
		a[1] * afit + b[1] * fit,
		a[2] * afit + b[2] * fit,
	]);
}
