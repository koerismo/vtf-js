import { Vec3, clamp } from '../util/vec3.js';

export function float_linearToSrgb(color: number) {
	if (color <= 0.0) return 0.0;
	if (color >= 1.0) return 1.0;
	if (color <= 0.00313066844250063)
		return color * 12.92;
	return Math.pow(color, 1/2.4) * 1.055 - 0.055;
}

export function float_srgbToLinear(color: number) {
	if (color <= 0.0) return 0.0;
	if (color >= 1.0) return 1.0;
	if (color <= 0.0404482362771082)
		return color / 12.92;
	return Math.pow((color + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(out: Vec3, color: Vec3=out) {
	out[0] = float_linearToSrgb(color[0]),
	out[1] = float_linearToSrgb(color[1]),
	out[2] = float_linearToSrgb(color[2]);
	return out;
}

export function srgbToLinear(out: Vec3, color: Vec3=out) {
	out[0] = float_srgbToLinear(color[0]),
	out[1] = float_srgbToLinear(color[1]),
	out[2] = float_srgbToLinear(color[2]);
	return out;
}

export function saturate(out: Vec3, color: Vec3=out) {
	return clamp(out, color, 0.0, 1.0);
}
