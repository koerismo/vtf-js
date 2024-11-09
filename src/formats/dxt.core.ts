import { DataBuffer } from '../util/buffer.js';
import * as V from '../util/vec.js';
import * as D from '../util/vec.dxt.js';

export const enum CompressionFlags {
	DXT1_Alpha = 0x2,
	DXT1 = 0x4,
	DXT3 = 0x8,
	DXT5 = 0x10,

	PerceptualWeight = 0x20,
	AlphaWeight = 0x40
}

const scratch1 = V.create();
const scratch2 = V.create();
const scratch3 = V.create();
const scratch4 = V.create();
const decomp_blockColors = new Uint32Array(4);
const decomp_blockAlphas = new Float32Array(8);
const decomp_alphaIndexSets = new Uint32Array(4);

export function compressColorBlock(src: DataView, srcOffset: number, out: DataView, outOffset: number, imageWidth: number, flags: number) {
	return;
}

export function decompressColorBlock(src: DataView, srcOffset: number, out: DataView, outOffset: number, imageWidth: number, flags: number) {
	let alpha = !!(flags & CompressionFlags.DXT1_Alpha);

	const c1 = src.getUint16(srcOffset, true);
	const c2 = src.getUint16(srcOffset+2, true);
	
	const v1 = D.decode565(scratch1, c1), v2 = D.decode565(scratch2, c2);
	const v3 = scratch3, v4 = scratch4;
	
	if (c1 > c2) {
		D.blend(v3, 0.3333, v1, v2);
		D.blend(v4, 0.6666, v1, v2);
		alpha = false;
	}
	else {
		D.blend(v3, 0.5, v1, v2);
		V.fill(v4, 0.0);
	}

	decomp_blockColors[0] = Math.round(v1[0]*255) + (Math.round(v1[1]*255)<<8) + (Math.round(v1[2]*255)<<16) + (255<<24);
	decomp_blockColors[1] = Math.round(v2[0]*255) + (Math.round(v2[1]*255)<<8) + (Math.round(v2[2]*255)<<16) + (255<<24);
	decomp_blockColors[2] = Math.round(v3[0]*255) + (Math.round(v3[1]*255)<<8) + (Math.round(v3[2]*255)<<16) + (255<<24);
	decomp_blockColors[3] = Math.round(v4[0]*255) + (Math.round(v4[1]*255)<<8) + (Math.round(v4[2]*255)<<16) + (alpha ? 0 : (255<<24));
	
	for (let y=0; y<4; y++) {
		const indices = src.getUint8(4 + srcOffset+y);
		for (let x=0; x<4; x++) {
			const index = (indices >> (x*2)) & 0b11;
			const targetOffet = outOffset + (y*imageWidth + x)*4;
			out.setUint32(targetOffet, decomp_blockColors[index], true);
		}
	}
}

export function compressAlphaBlock(src: DataView, byteOffset: number, out: DataView, imageWidth: number, flags: number) {
	return;
}

export function decompressAlphaBlock_DXT5(src: DataView, srcOffset: number, out: DataView, outOffset: number, imageWidth: number, flags: number) {
	const a1 = src.getUint8(srcOffset);
	const a2 = src.getUint8(srcOffset+1);
	decomp_blockAlphas[0] = a1,
	decomp_blockAlphas[1] = a2;
	
	if (a1 > a2) {
		decomp_blockAlphas[2] = (6*a1 + a2)/7,
		decomp_blockAlphas[3] = (5*a1 + 2*a2)/7,
		decomp_blockAlphas[4] = (4*a1 + 3*a2)/7,
		decomp_blockAlphas[5] = (3*a1 + 4*a2)/7,
		decomp_blockAlphas[6] = (2*a1 + 5*a2)/7,
		decomp_blockAlphas[7] = (a1   + 6*a2)/7;
	}
	else {
		decomp_blockAlphas[2] = (4*a1 + a2)/5,
		decomp_blockAlphas[3] = (3*a1 + 2*a2)/5,
		decomp_blockAlphas[4] = (2*a1 + 3*a2)/5,
		decomp_blockAlphas[5] = (a1 + 4*a2)/5,
		decomp_blockAlphas[6] = 0.0,
		decomp_blockAlphas[7] = 1.0;
	}


	const indices0 = decomp_alphaIndexSets[0] = src.getUint16(2 + srcOffset, true) | (src.getUint8(2 + srcOffset+2) << 16);
	const indices2 = decomp_alphaIndexSets[2] = src.getUint16(2 + srcOffset+3, true) | (src.getUint8(2 + srcOffset+5) << 16);
	decomp_alphaIndexSets[1] = indices0 >> 12;
	decomp_alphaIndexSets[3] = indices2 >> 12;

	for (let y=0; y<4; y++) {
		const indices = decomp_alphaIndexSets[y];
		for (let x=0; x<4; x++) {
			const index = (indices >> (x*3)) & 0b111;
			const targetOffet = outOffset + (y*imageWidth + x)*4;
			out.setUint8(targetOffet + 3, decomp_blockAlphas[index]);
		}
	}
}
