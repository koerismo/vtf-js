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
	AlphaWeight = 0x40,
	HighQuality = 0x80,
}

const scratch1 = V.create();
const scratch2 = V.create();
const scratch3 = V.create();
const scratch4 = V.create();

const decomp_blockColors = new Uint32Array(4);
const decomp_blockAlphas = new Float32Array(8);
const decomp_alphaIndexSets = new Uint32Array(4);

// TODO: This is stupid, but it's faster to do this than create new ones every call.
let comp_fitIsTransparent = false;
const comp_fitCenter = V.create();
const comp_fitTmpVector = V.create();
const comp_fitLargestVector = V.create();
const comp_fitAvgDirection = V.create();
const comp_fitColorPoints = new Float32Array(16 * 3); // RGB
const comp_fitColorWeights = new Float32Array(16); // W
const comp_blockColors = new Float32Array(4 * 3); // RGBA[4]

/** Determine the line on which we should fit the points. This uses a dumb algorithm that should hopefully be *slightly* faster than the real deal. */
export function fitAxis(src: Float32Array, srcOffset: number, srcWidth: number, outMins: V.Vec3, outMaxs: V.Vec3, flags: number) {
	// 1. Get the center of the points, accounting for weight.
	// 2. Get points relative to center - remember the length of each relative vector.
	// 3. For each vector - if its dot product to the largest vector is negative, scale it by negative one.
	// 4. Determine the average normalized direction vector with weights.
	// 5. Determine the mins by subtracting (maximum length • -direction) from the center and clipping to fit within bounds.
	// 6. Determine the maxs by subtracting (maximum length • +direction) from the center and clipping to fit within bounds.

	comp_fitIsTransparent = false;
	const cookieCutter = !!(flags & CompressionFlags.DXT1_Alpha);
	const alphaWeight = !!(flags & CompressionFlags.AlphaWeight);
	const center = V.fill(comp_fitCenter, 0.0);
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
			
			if (cookieCutter ? a<ALPHA_THRESHOLD : a<1) comp_fitIsTransparent = true;
			if (!weight || (cookieCutter && a < ALPHA_THRESHOLD)) continue;

			// Establish mins/maxs to clip the fitted result to.
			if (r < mins[0]) mins[0] = r;
			if (r > maxs[0]) maxs[0] = r;
			if (g < mins[1]) mins[1] = g;
			if (g > maxs[1]) maxs[1] = g;
			if (b < mins[2]) mins[2] = b;
			if (b > maxs[2]) maxs[2] = b;
			
			comp_fitColorWeights[pointCount] = weight;
			weightSum += weight;
			
			const p = pointCount*3;
			center[0] += comp_fitColorPoints[p] = r * weight,
			center[1] += comp_fitColorPoints[p+1] = g * weight,
			center[2] += comp_fitColorPoints[p+2] = b * weight;
			pointCount++;
		}
	}

	// Normalize result.
	V.scale(center, center, 1.0 / weightSum);
	
	// Make all points relative to center and determine the largest vector relative to the center.
	const largest_vector = V.fill(comp_fitLargestVector, 0.0);
	const tmp_vector = V.fill(comp_fitTmpVector, 0.0);
	let largest_length = 0.0;
	for (let i=0, p=0; i<pointCount; i++, p+=3) {
		const	r = (comp_fitColorPoints[p]   -= center[0]),
				g = (comp_fitColorPoints[p+1] -= center[1]),
				b = (comp_fitColorPoints[p+2] -= center[2]);
		const w = comp_fitColorWeights[i];

		tmp_vector[0] = r,
		tmp_vector[1] = g,
		tmp_vector[2] = b;
		const tmp_length = V.length(tmp_vector);
		if (tmp_length > largest_length) {
			largest_length = tmp_length;
			V.copy(largest_vector, tmp_vector);
		}
	}

	// No data to fit? Return early.
	if (!pointCount || !weightSum) return false;

	// Normalize all directions
	const avg_direction = V.fill(comp_fitAvgDirection, 0.0);
	for (let i=0, p=0; i<pointCount; i++, p+=3) {
		const	r = (comp_fitColorPoints[p]),
				g = (comp_fitColorPoints[p+1]),
				b = (comp_fitColorPoints[p+2]);
		const w = comp_fitColorWeights[i];
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

	// Normalize results
	const avg_length = V.length(avg_direction);
	if (avg_length < 0.00001) return false;
	V.scale(avg_direction, avg_direction, largest_length / avg_length);

	// Clip range to min/max bounds
	// For now, mins/maxs are relative to the center so we can quickly compare them.
	let len_minToCenter = 1.0;
	if (avg_direction[0] * -len_minToCenter + center[0] < mins[0])	len_minToCenter *= (center[0] - mins[0]) / (avg_direction[0] * len_minToCenter);
	if (avg_direction[1] * -len_minToCenter + center[1] < mins[1])	len_minToCenter *= (center[1] - mins[1]) / (avg_direction[1] * len_minToCenter);
	if (avg_direction[2] * -len_minToCenter + center[2] < mins[2])	len_minToCenter *= (center[2] - mins[2]) / (avg_direction[2] * len_minToCenter);
	let len_centerToMax = 1.0;
	if (avg_direction[0] * len_centerToMax + center[0] > maxs[0])	len_centerToMax *= (maxs[0] - center[0]) / (avg_direction[0] * len_centerToMax);
	if (avg_direction[1] * len_centerToMax + center[1] > maxs[1])	len_centerToMax *= (maxs[1] - center[1]) / (avg_direction[1] * len_centerToMax);
	if (avg_direction[2] * len_centerToMax + center[2] > maxs[2])	len_centerToMax *= (maxs[2] - center[2]) / (avg_direction[2] * len_centerToMax);

	// mins = center - (dir • length)
	// maxs = center + (dir • length)
	// NOTE THAT WE CONVERT THE MINS/MAXS TO ABSOLUTE VALUES HERE!
	V.scale(mins, avg_direction, len_minToCenter);
	V.sub(mins, center, mins);
	V.scale(maxs, avg_direction, len_centerToMax);
	V.add(maxs, center, maxs);

	return true;
}

export function compressColorBlock(src: Float32Array, srcOffset: number, out: DataView, outOffset: number, imageWidth: number, flags: number) {
	const cookieCutter = !!(flags & CompressionFlags.DXT1_Alpha);
	let color1 = scratch1, color2 = scratch2;

	const succeeded = fitAxis(src, srcOffset, imageWidth, color1, color2, flags);
	let flipColors = false;

	// Fill block with single color if the fit failed
	if (!succeeded) {
		const e1 = D.encode565(color1);
		out.setUint16(outOffset, e1, true);
		out.setUint16(outOffset+2, e1, true);
		out.setUint32(outOffset+4, comp_fitIsTransparent ? 0xffffffff : 0x00); // Fill with index 0 (default color) or index 3 (transparent)
		return;
	}
	else {
		const e1 = D.encode565(color1);
		const e2 = D.encode565(color2);
		if ((e1 <= e2) !== comp_fitIsTransparent) {
			flipColors = true;
			const tmp = color2;
			color1 = color2, color2 = tmp;
		}
		out.setUint16(outOffset, flipColors ? e2 : e1, true);
		out.setUint16(outOffset+2, flipColors ? e1 : e2, true);
	}

	const pColor3 = V.from(comp_blockColors, 6);
	const pColor4 = V.from(comp_blockColors, 9);
	
	if (comp_fitIsTransparent) {
		V.copyInto(comp_blockColors, color1, 0);
		V.copyInto(comp_blockColors, color2, 3);
		D.blend(pColor3, 0.5, color1, color2);
		V.fill(pColor4, 0.0);
	}
	else {
		V.copyInto(comp_blockColors, color1, 0);
		V.copyInto(comp_blockColors, color2, 3);
		D.blend(pColor3, 0.3333, color1, color2);
		D.blend(pColor4, 0.6666, color1, color2);
	}

	// const b = color1[majorAxis];
	// const m = color2[majorAxis] - color1[majorAxis];

	for (let y=0; y<4; y++) {
		let row = 0x00;
		for (let x=0; x<4; x++) {
			const index = srcOffset + (y*imageWidth + x) * 4;
			const color = V.from(src, index);
			const alpha = src[index + 3];

			let blendIndex = 0;
			if (comp_fitIsTransparent) {
				if (cookieCutter && alpha < ALPHA_THRESHOLD) {
					// Alpha pixel - skip processing!
					blendIndex = 3;
				}
				else {
					// Find closest point (0-2)
					let bestDistanceSqr = Infinity;
					for (let i=0; i<3; i++) {
						const d = V.dist2(V.from(comp_blockColors, i*3), color);
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
					const d = V.dist2(V.from(comp_blockColors, i*3), color);
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
