import { DataBuffer } from '../util/buffer.js';
import * as V from '../util/vec.js';
import * as D from '../util/vec.dxt.js';
import { RangeFit, ComputePrincipleComponent, ComputeWeightedCovariance } from '../util/squish.js';

const ALPHA_THRESHOLD = 0.5;

export enum CompressionFlags {
	DXT1_Alpha = 0x2,
	DXT1 = 0x4,
	DXT3 = 0x8,
	DXT5 = 0x10,

	PerceptualWeight = 0x20,
	IterativeClusterFit = 0x40,
	AlphaWeight = 0x80,
	HighQuality = 0x100,
}

const scratch1 = V.create();
const scratch2 = V.create();
const scratch3 = V.create();
const scratch4 = V.create();

const decomp_blockColors = new Uint32Array(4);
const decomp_blockAlphas = new Float32Array(8);
const decomp_alphaIndexSets = new Uint32Array(4);

const comp_colorPoints = new Float32Array(16 * 3);
const comp_colorWeights = new Float32Array(16 * 3);
const comp_lookupTable = new Float32Array(4 * 3);

export function compressColorBlock(src: Float32Array, srcOffset: number, out: DataView, outOffset: number, imageWidth: number, flags: number) {
	const cookieCutter = !!(flags & CompressionFlags.DXT1_Alpha);
	const alphaWeight = !!(flags & CompressionFlags.AlphaWeight);
	const dist2Func = (flags & CompressionFlags.PerceptualWeight) ? D.distPerceptual : V.dist2;

	let isTransparent = false;
	let pointCount = 0;
	for (let y=0; y<4; y++) {
		for (let x=0; x<4; x++) {
			const srcIndex = srcOffset + (y*imageWidth + x)*4;
			const alpha = src[srcIndex+3];

			if (cookieCutter && alpha < ALPHA_THRESHOLD) {
				isTransparent = true;
				continue;
			}

			const p = pointCount * 3;
			comp_colorPoints[p] = src[srcIndex],
			comp_colorPoints[p+1] = src[srcIndex+1],
			comp_colorPoints[p+2] = src[srcIndex+2];
			comp_colorWeights[pointCount] = alphaWeight ? alpha : 1.0;
			pointCount++;
		}
	}

	const rf = RangeFit(pointCount, comp_colorPoints, comp_colorWeights);
	// const flat = rf.start[0] === rf.end[0] && rf.start[1] === rf.end[1] && rf.start[2] === rf.end[2];
	// if (flat) console.count('Flat!');

	let flipColors = false;
	let color1 = rf.start, color2 = rf.end;
	const e1 = D.encode565(color1);
	const e2 = D.encode565(color2);
	if ((e1 <= e2) !== isTransparent) {
		flipColors = true;
		const tmp = color1;
		color1 = color2, color2 = tmp;
	}
	out.setUint16(outOffset, flipColors ? e2 : e1, true);
	out.setUint16(outOffset+2, flipColors ? e1 : e2, true);

	const pColor3 = V.from(comp_lookupTable, 6);
	const pColor4 = V.from(comp_lookupTable, 9);
	
	if (isTransparent) {
		V.copyInto(comp_lookupTable, color1, 0);
		V.copyInto(comp_lookupTable, color2, 3);
		D.blend(pColor3, 0.5, color1, color2);
	}
	else {
		V.copyInto(comp_lookupTable, color1, 0);
		V.copyInto(comp_lookupTable, color2, 3);
		D.blend(pColor3, 0.3333, color1, color2);
		D.blend(pColor4, 0.6666, color1, color2);
	}

	for (let y=0; y<4; y++) {
		let row = 0x0;
		for (let x=0; x<4; x++) {
			const index = srcOffset + (y*imageWidth + x) * 4;
			const color = V.from(src, index);
			const alpha = src[index + 3];

			let blendIndex = 0;
			if (isTransparent) {
				if (cookieCutter && alpha < ALPHA_THRESHOLD) {
					// Alpha pixel - skip processing!
					blendIndex = 3;
				}
				else {
					// Find closest point (0-2)
					let bestDistanceSqr = Infinity;
					for (let i=0; i<3; i++) {
						const d = dist2Func(V.from(comp_lookupTable, i*3), color);
						if (d >= bestDistanceSqr) continue;
						bestDistanceSqr = d;
						blendIndex = i;
					}
				}
			}
			else {
				// Find closest point (0-3)
				let bestDistanceSqr = Infinity;
				for (let i=0; i<4; i++) {
					const d = dist2Func(V.from(comp_lookupTable, i*3), color);
					if (d >= bestDistanceSqr) continue;
					bestDistanceSqr = d;
					blendIndex = i;
				}
			}

			row |= blendIndex << (x*2);
		}
		out.setUint8(4 + outOffset + y, row);
	}

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
