import { VFileHeader } from '../vtf.js';
import { VFlags } from './enums.js';

export function getMipSize(mipmap: number, width: number, height: number): [number, number] {
	return [ Math.ceil(width / (2 ** mipmap)), Math.ceil(height / (2 ** mipmap)) ];
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