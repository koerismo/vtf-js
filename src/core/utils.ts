import { VFileHeader } from '../vtf.js';
import { VCompressionMethods, VFlags } from './enums.js';

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
export function getThumbMip(width: number, height: number, target=16): number {
	const size = Math.max(width, height);
	return Math.ceil(Math.log2(size)) - Math.log2(target);
}

/** Clamps the value `x` between `a` and `b` */
export function clamp(x: number, a: number, b: number): number {
	return x <= a ? a : (x >= b ? b : x);
}

/** The % operator in Javascript is for remainders. This does a proper modulo as defined by MDN. */
export function mod(n: number, d: number): number {
	return ((n % d) + d) % d;
}

export type CompressFunction = (data: Uint8Array, level: number, method: VCompressionMethods) => Promise<Uint8Array> | Uint8Array;

export function setCompressionMethod(
	fn_compress: CompressFunction,
	fn_decompress: CompressFunction) {
	compress = fn_compress;
	decompress = fn_decompress;
}

// Use native APIs by default

export let compress: CompressFunction = async (data, level, method) => {
	if (level !== -1)
		throw Error('vtf-js: Default compression backend only supports compression level `-1`. Import a `vtf-js/addons/compress/*` module or call `setCompressionMethod` to better support encoding Strata-compressed VTFs!');
	if (method !== VCompressionMethods.Deflate)
		throw Error(`vtf-js: Default compression backend only supports Deflate compression!`);
	
	const inStream = new Blob([data]).stream();
	const compStream = new CompressionStream('deflate');
	const outStream = inStream.pipeThrough(compStream);
	const n = new Response(outStream);
	return new Uint8Array(await n.arrayBuffer());
}

export let decompress: CompressFunction = async (data, _level, method) => {
	if (method !== VCompressionMethods.Deflate)
		throw Error(`vtf-js: Default decompression backend only supports Deflate decompression!`);
	const inStream = new Blob([data]).stream();
	const decompStream = new DecompressionStream('deflate');
	const outStream = inStream.pipeThrough(decompStream);
	const n = new Response(outStream);
	return new Uint8Array(await n.arrayBuffer());
}
