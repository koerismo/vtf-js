import { DataBuffer } from '../util/buffer.js';
import * as V from '../util/vec.js';
import * as D from '../util/vec.dxt.js';
import { clamp } from '../core/utils.js';

const ALPHA_THRESHOLD = 0.5;

export enum CompressionFlags {
	DXT1_Alpha = 0x2,
	DXT1 = 0x4,
	DXT3 = 0x8,
	DXT5 = 0x10,

	PerceptualWeight = 0x20,
	AlphaWeight = 0x40,
	HighQuality = 0x80,
}

const scratch1 = V.create();
const scratch2 = V.create();
const scratch3 = V.create();
const scratch4 = V.create();
const scratch5 = V.create();

const decomp_blockColors = new Uint32Array(4);
const decomp_blockAlphas = new Float32Array(8);
const decomp_alphaIndexSets = new Uint32Array(4);

// TODO: This is stupid, but...
let comp_isTransparent = false;
const comp_center = V.create();
const comp_colorPoints = new Float32Array(16 * 3); // RGB
const comp_colorWeights = new Float32Array(16); // W
const comp_relativePoints = new Float32Array(16 * 3); // XYZ

/** Determine the line on which we should fit the points. This uses a dumb algorithm that should hopefully be *slightly* faster than the real deal. */
// export function fitAxis(src: Float32Array, srcOffset: number, srcWidth: number, outMin: V.Vec3, outMax: V.Vec3, flags: number): number {
// 	const cookieCutter = !!(flags & CompressionFlags.DXT1_Alpha);
// 	const alphaWeight = !!(flags & CompressionFlags.AlphaWeight);
// 	const center = V.fill(comp_center, 0.0);
// 	const mins = V.fill(scratch3, 1.0);
// 	const maxs = V.fill(scratch4, 0.0);
	
// 	// Analyze the points
// 	let weightSum = 0.0;
// 	let pointCount = 0;
// 	comp_isTransparent = false;
// 	for (let y=0; y<4; y++) {
// 		for (let x=0; x<4; x++) {
// 			const index = srcOffset + (y*srcWidth + x)*4;
// 			const r = src[index], g = src[index+1], b = src[index+2], a = src[index+3];
// 			const weight = alphaWeight ? a : 1;
// 			if (cookieCutter ? a<ALPHA_THRESHOLD : a<1) comp_isTransparent = true;

// 			if (!weight || (cookieCutter && a < ALPHA_THRESHOLD)) continue;

// 			if (r < mins[0]) mins[0] = r;
// 			if (r > maxs[0]) maxs[0] = r;
// 			if (g < mins[1]) mins[1] = g;
// 			if (g > maxs[1]) maxs[1] = g;
// 			if (b < mins[2]) mins[2] = b;
// 			if (b > maxs[2]) maxs[2] = b;
			
// 			const p = pointCount*3;
// 			center[0] += comp_colorPoints[p] = r,
// 			center[1] += comp_colorPoints[p+1] = g,
// 			center[2] += comp_colorPoints[p+2] = b;
// 			comp_colorWeights[pointCount] = weight;
// 			weightSum += weight;
// 			pointCount++;
// 		}
// 	}

// 	// If we're dealing with completely flat data,
// 	// just output a solid color.
// 	if (weightSum === 0 || pointCount === 0) {
// 		outMin[0] = outMax[0] = center[0],
// 		outMin[1] = outMax[1] = center[1],
// 		outMin[2] = outMax[2] = center[2];
// 		return -1;
// 	}

// 	// Average the summed positions to get the center.
// 	V.scale(center, center, 1 / pointCount);

// 	// Chose the largest axis to compare with
// 	const xdiff = maxs[0] - mins[0];
// 	const ydiff = maxs[1] - mins[1];
// 	const zdiff = maxs[2] - mins[2];

// 	let majorAxis = 0, minorA = 1, minorB = 2;
// 	let axisDiff = xdiff;
// 	if (ydiff > axisDiff) majorAxis = 1, axisDiff = ydiff, minorA = 0, minorB = 2;
// 	if (zdiff > axisDiff) majorAxis = 2, axisDiff = zdiff, minorA = 0, minorB = 1;

// 	if (axisDiff === 0) {
// 		outMin[0] = outMax[0] = center[0],
// 		outMin[1] = outMax[1] = center[1],
// 		outMin[2] = outMax[2] = center[2];
// 		return -1;
// 	}

// 	// Find the average correlation between the major axis and minor axes.
// 	let majorAxisMin = 0.0;
// 	let majorAxisMax = 0.0;
// 	let corrA = 0.0;
// 	let corrB = 0.0;

// 	for (let i=0, p=0; i<pointCount; i++, p+=3) {
// 		const main = comp_colorPoints[p + majorAxis] - center[majorAxis];
// 		const a1 = comp_colorPoints[p + minorA] - center[minorA];
// 		const a2 = comp_colorPoints[p + minorB] - center[minorB];
// 		const weight = comp_colorWeights[i];

// 		if (main < majorAxisMin) majorAxisMin = main;
// 		if (main > majorAxisMax) majorAxisMax = main;

// 		// Is this gonna cause problems? Stop and cancel this entry out.
// 		if (Math.abs(main) < 0.001) {
// 			// weightSum -= weight;
// 			continue;
// 		}

// 		// Y = N * X
// 		// N = Y / X
// 		corrA += a1 / main * weight;
// 		corrB += a2 / main * weight;
// 	}

// 	if (weightSum === 0) {
// 		outMin[0] = outMax[0] = center[0],
// 		outMin[1] = outMax[1] = center[1],
// 		outMin[2] = outMax[2] = center[2];
// 		return -1;
// 	}

// 	corrA /= weightSum;
// 	corrB /= weightSum;

// 	outMin[majorAxis] = majorAxisMin + center[majorAxis];
// 	outMin[minorA] = corrA * majorAxisMin + center[minorA];
// 	outMin[minorB] = corrB * majorAxisMin + center[minorB];
	
// 	outMax[majorAxis] = majorAxisMax + center[majorAxis];
// 	outMax[minorA] = corrA * majorAxisMax + center[minorA];
// 	outMax[minorB] = corrB * majorAxisMax + center[minorB];

// 	V.clamp(outMin, outMin, 0, 1);
// 	V.clamp(outMax, outMax, 0, 1);

// 	return majorAxis;
// }

export function fitAxis2(src: Float32Array, srcOffset: number, srcWidth: number, outMins: V.Vec3, outMaxs: V.Vec3, flags: number) {
	// 1. Get the center of the points, accounting for weight.
	// 2. Get points relative to center - remember the length of each relative vector.
	// 3. For each vector - if its dot product to the largest vector is negative, scale it by negative one.
	// 4. Determine the average normalized direction vector with weights.
	// 5. Determine the mins by subtracting (maximum length • -direction) from the center and clipping to fit within bounds.
	// 6. Determine the maxs by subtracting (maximum length • +direction) from the center and clipping to fit within bounds.

	comp_isTransparent = false;
	const cookieCutter = !!(flags & CompressionFlags.DXT1_Alpha);
	const alphaWeight = !!(flags & CompressionFlags.AlphaWeight);
	const center = V.fill(comp_center, 0.0);
	const mins = V.fill(outMins, 1.0);
	const maxs = V.fill(outMaxs, 0.0);

	// Accumulate the point center.
	let weightSum = 0.0;
	let pointCount = 0;
	for (let y=0; y<4; y++) {
		for (let x=0; x<4; x++) {
			const index = srcOffset + (y*srcWidth + x)*4;
			const r = src[index], g = src[index+1], b = src[index+2], a = src[index+3];
			const weight = alphaWeight ? a : 1;
			
			if (cookieCutter ? a<ALPHA_THRESHOLD : a<1) comp_isTransparent = true;
			if (!weight || (cookieCutter && a < ALPHA_THRESHOLD)) continue;

			if (r < mins[0]) mins[0] = r;
			if (r > maxs[0]) maxs[0] = r;
			if (g < mins[1]) mins[1] = g;
			if (g > maxs[1]) maxs[1] = g;
			if (b < mins[2]) mins[2] = b;
			if (b > maxs[2]) maxs[2] = b;
			
			comp_colorWeights[pointCount] = weight;
			weightSum += weight;
			
			const p = pointCount*3;
			center[0] += comp_colorPoints[p] = r * weight,
			center[1] += comp_colorPoints[p+1] = g * weight,
			center[2] += comp_colorPoints[p+2] = b * weight;
			pointCount++;
		}
	}

	// Normalize result.
	V.scale(center, center, 1.0 / weightSum);

	
	// Make all points relative to center and determine the largest vector relative to the center.
	const largest_vector = V.fill(scratch1, 0.0);
	const tmp_vector = V.fill(scratch2, 0.0);
	let largest_length = 0.0;
	for (let i=0, p=0; i<pointCount; i++, p+=3) {
		const	r = (comp_colorPoints[p]   -= center[0]),
				g = (comp_colorPoints[p+1] -= center[1]),
				b = (comp_colorPoints[p+2] -= center[2]);
		const w = comp_colorWeights[i];

		tmp_vector[0] = r,
		tmp_vector[1] = g,
		tmp_vector[2] = b;
		const tmp_length = V.length(tmp_vector);
		if (tmp_length > largest_length) {
			largest_length = tmp_length;
			V.copy(largest_vector, tmp_vector);
		}
	}

	// Normalize all directions
	const avg_direction = V.fill(scratch3, 0.0);
	for (let i=0, p=0; i<pointCount; i++, p+=3) {
		const	r = (comp_colorPoints[p]),
				g = (comp_colorPoints[p+1]),
				b = (comp_colorPoints[p+2]);
		const w = comp_colorWeights[i];
		tmp_vector[0] = r * w,
		tmp_vector[1] = g * w,
		tmp_vector[2] = b * w;

		// If the vector is facing away from the primary, reverse it
		// to let us average it more effectively.
		const dot = V.dot(largest_vector, tmp_vector);
		if (dot < 0) {
			tmp_vector[0] *= -1,
			tmp_vector[1] *= -1,
			tmp_vector[2] *= -1;
		}

		V.add(avg_direction, avg_direction, tmp_vector);
	}


	V.scale(avg_direction, avg_direction, 1 / weightSum);
	const avg_length = V.length(avg_direction);

	return comp_isTransparent;
}

export function compressColorBlock(src: Float32Array, srcOffset: number, out: DataView, outOffset: number, imageWidth: number, flags: number) {
	const cookieCutter = !!(flags & CompressionFlags.DXT1_Alpha);
	const color1 = scratch1, color2 = scratch2;
	const majorAxis = fitAxis2(src, srcOffset, imageWidth, color1, color2, flags);
	let flipColors = false;

	// Fill block with single color if the fit failed
	if (majorAxis === -1) {
		const e1 = D.encode565(color1);
		out.setUint16(outOffset, e1, true);
		out.setUint16(outOffset+2, e1, true);
		out.setUint32(outOffset+4, 0x00); // Fill with index 0
		return;
	}
	else {
		const e1 = D.encode565(color1);
		const e2 = D.encode565(color2);
		if ((e1 <= e2) !== comp_isTransparent) flipColors = true;
		out.setUint16(outOffset, flipColors ? e2 : e1, true);
		out.setUint16(outOffset+2, flipColors ? e1 : e2, true);
	}

	const b = color1[majorAxis];
	const m = color2[majorAxis] - color1[majorAxis];

	for (let y=0; y<4; y++) {
		let row = 0x00;
		for (let x=0; x<4; x++) {
			const index = srcOffset + (y*imageWidth + x) * 4;
			const alpha = src[index + 3];
			let blendValue = clamp((src[index + majorAxis] - b) / m, 0, 1);
			if (flipColors) blendValue = 1.0 - blendValue;
			
			let lookupIndex: number;
			if (comp_isTransparent) {
				if (cookieCutter && alpha < ALPHA_THRESHOLD)
						lookupIndex = 3;
				else	lookupIndex = Math.round(blendValue * 2);
			}
			else {
				lookupIndex = Math.round(blendValue * 3);
			}
			row |= lookupIndex << (x*2);
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
