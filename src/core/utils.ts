import { VFileHeader } from '../vtf.js';
import { VFlags } from './enums.js';
import { VImageData } from './image.js';

export function getMipSize(mipmap: number, width: number, height: number): [number, number] {
	const div = 2 ** mipmap;
	return [ Math.ceil(width / div), Math.ceil(height / div) ];
}

export function getHeaderLength(version: number, resources: number=0): number {
	if      (version < 2) return 63;
	else if (version < 3) return 65;
	return 80 + resources * 8;
}

export function getFaceCount(info: VFileHeader): 1|6|7 {
	const is_env = (info.flags & VFlags.Envmap);
	if (info.version < 5) return is_env ? 7 : 1;
	return is_env ? 6 : 1;
}

export function getThumbMip(width: number, height: number, target=16) {
	const size = Math.max(width, height);
	return Math.ceil(Math.log2(size)) - Math.log2(target);
}

export function clamp(x: number, a: number, b: number) {
	return x <= a ? a : (x >= b ? b : x);
}

export function compressHdr(image: VImageData<Float32Array>): VImageData<Uint8Array> {
	const src = image.data;
	const out = new Uint8Array(src.length);

	for (let i=0; i<src.length; i+=4) {
		const max_float = Math.max(src[i], src[i+1], src[i+2]);
		const max_rounded_float = Math.ceil(max_float * 255 / 16) / 255 / 255 * 16;

		out[i  ] = Math.round(src[i+2] / max_rounded_float);
		out[i+1] = Math.round(src[i+1] / max_rounded_float);
		out[i+2] = Math.round(src[i]   / max_rounded_float);
		out[i+3] = Math.round(max_rounded_float / 16 * 2); // Random x2 multiplier. Fuck it!!
	}

	return new VImageData(out, image.width, image.height);
}

export function decompressHdr(image: VImageData<Uint8Array>): VImageData<Float32Array> {
	const src = image.data;
	const out = new Float32Array(src.length);

	for (let i=0; i<src.length; i+=4) {
		const mult = src[i+3] * 16 / 2 / 255 / 255;
		out[i] = src[i] * mult;
		out[i+1] = src[i+1] * mult;
		out[i+2] = src[i+2] * mult;
		out[i+3] = 1;
	}

	return new VImageData(out, image.width, image.height);
}
