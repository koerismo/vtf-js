import { VFileHeader } from '../vtf.js';
import { VFlags } from './enums.js';

/** Returns the size of a given mipmap if mipmap 0 is of size `width`,`height` */
export function getMipSize(mipmap: number, width: number, height: number): [number, number] {
	const div = 2 ** mipmap;
	return [ Math.ceil(width / div), Math.ceil(height / div) ];
}

/** Returns an estimated header length for the given vtf version and resource count. */
export function getHeaderLength(version: number, resources: number=0): number {
	if      (version < 2) return 63;
	else if (version < 3) return 65;
	return 80 + resources * 8;
}

/** Returns the number of faces that should be expected with the given header. */
export function getFaceCount(info: VFileHeader): 1|6|7 {
	const is_env = (info.flags & VFlags.Envmap);
	if (info.version < 5 && info.first_frame === -1) return is_env ? 7 : 1;
	return is_env ? 6 : 1;
}

/** Returns the first mipmap which does not exceed `target` in width or height. */
export function getThumbMip(width: number, height: number, target=16) {
	const size = Math.max(width, height);
	return Math.ceil(Math.log2(size)) - Math.log2(target);
}

/** Clamps the value `x` between `a` and `b` */
export function clamp(x: number, a: number, b: number) {
	return x <= a ? a : (x >= b ? b : x);
}

/** The % operator in Javascript is for remainders. This does a proper modulo as defined by MDN. */
export function mod(n: number, d: number) {
	return ((n % d) + d) % d;
}
