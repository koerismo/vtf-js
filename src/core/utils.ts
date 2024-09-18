import { VFileHeader } from '../vtf.js';
import { VFlags } from './enums.js';

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
	if (info.version < 5 && info.first_frame === -1) return is_env ? 7 : 1;
	return is_env ? 6 : 1;
}

export function getThumbMip(width: number, height: number, target=16) {
	const size = Math.max(width, height);
	return Math.ceil(Math.log2(size)) - Math.log2(target);
}

export function clamp(x: number, a: number, b: number) {
	return x <= a ? a : (x >= b ? b : x);
}
