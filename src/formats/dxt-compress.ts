import { type Vec3 } from '../util/vec3.js';
import * as V3 from '../util/vec3.js';

export const enum DxtFlags {
	DXT1 = 0x1,
	DXT3 = 0x2,
	DXT5 = 0x4,
	WeightByAlpha = 0x10,
	OneBitAlpha = 0x20,
	MetricPerceptual = 0x100,
}

export const enum BlockFlags {
	BlockHasAlpha = 0x1,
}

const ALPHA_THRESHOLD = 0.5;
const ITER_COUNT = 8;

type SymMatrix3x3 = Float32Array & { __brand: 0x1000 };
type Vec4Array = Float32Array & { brand: 0x2000 };

function calcWeight(alpha: number, flags: number) {
	if (flags & DxtFlags.OneBitAlpha) return alpha < ALPHA_THRESHOLD ? 0 : 1;
	if (flags & DxtFlags.WeightByAlpha) return alpha;
	return 1;
}

function computeCovariance(points: Vec4Array, weights: Float32Array, out?: SymMatrix3x3): SymMatrix3x3 {
	const count = Math.trunc(points.length / 4);

	let total = 0;
	let center_x = 0, center_y = 0, center_z = 0;

	for (let i=0, c=0; i<count; i++, c+=4) {
		const weight = weights[i];
		total += weight;
		center_x += points[c] * weight;
		center_y += points[c+1] * weight;
		center_z += points[c+2] * weight;
	}

	if (total > Number.EPSILON) {
		center_x /= total;
		center_y /= total;
		center_z /= total;
	}

	out ??= new Float32Array(6) as SymMatrix3x3;
	const covariance = out;

	for (let i=0, c=0; i<count; i++, c+=4) {
		const weight = weights[i];

		const a_x = points[c]   - center_x;
		const a_y = points[c+1] - center_y;
		const a_z = points[c+2] - center_z;
		const b_x = a_x * weight;
		const b_y = a_y * weight;
		const b_z = a_z * weight;

		covariance[0] += a_x * b_x;
		covariance[1] += a_x * b_y;
		covariance[2] += a_x * b_z;
		covariance[3] += a_y * b_y;
		covariance[4] += a_y * b_z;
		covariance[5] += a_z * b_z;
	}

	return covariance;
}

function computePrincipalComponent(matrix: SymMatrix3x3, iterationCount: number=ITER_COUNT, out?: Vec3): Vec3 {
	let v_x = 1, v_y = 1, v_z = 1;

	for (let i=0; i<iterationCount; i++) {
		const w_x = matrix[0] * v_x + matrix[1] * v_y + matrix[2] * v_z;
		const w_y = matrix[1] * v_x + matrix[3] * v_y + matrix[4] * v_z;
		const w_z = matrix[2] * v_x + matrix[4] * v_y + matrix[5] * v_z;
		
		const a = Math.max(w_x, w_y, w_z);
		v_x = w_x / a;
		v_y = w_y / a;
		v_z = w_z / a;
	}

	// return V3.create(v_x, v_y, v_z);
	out ??= V3.create();
	V3.setValues(out, v_x, v_y, v_z);
	return out;
}

/**
 * @param points Float RGBA data.
 * @param weights Float weight data.
 * @param out_a OUTPUT The start color
 * @param out_b OUTPUT The end color
 * @returns Whether this block is a solid color.
 */
function computeEndpoints(points: Vec4Array, weights: Float32Array, mask: number, out_a: Vec3, out_b: Vec3) {
	const count = Math.trunc(points.length / 4);

	const covar = computeCovariance(points, weights);
	const principal = computePrincipalComponent(covar);

	let start_i = 0;
	let end_i = 0;
	let min: number, max: number;

	start_i = end_i = 0;
	min = max = points[0] * principal[0] + points[1] * principal[1] + points[2] * principal[2];
	
	for (let i=1, c=0; i<count; i++, c+=4) {
		if (!(mask >> i & 1)) continue;
		const val = points[c] * principal[0] + points[c+1] * principal[1] + points[c+2] * principal[2];
		if (val < min) {
			start_i = i;
			min = val;
		}
		else if (val > max) {
			end_i = i;
			max = val;
		}
	}

	// Round off results
	out_a[0] = Math.trunc(points[start_i]   * 31) / 31;
	out_a[1] = Math.trunc(points[start_i+1] * 63) / 63;
	out_a[2] = Math.trunc(points[start_i+2] * 31) / 31;
	out_b[0] = Math.trunc(points[end_i]   * 31) / 31;
	out_b[1] = Math.trunc(points[end_i+1] * 63) / 63;
	out_b[2] = Math.trunc(points[end_i+2] * 31) / 31;

	// Is this a solid-color block?
	return start_i === end_i;
}

/**
 * @param points Float RGBA data.
 * @param idxCount 3 or 4 - sets the mode of the block.
 * @param flags
 * @param a The start color
 * @param b The end color
 * @param metric The comparison metric
 * @param out_indices OUTPUT The resulting color indices
 * @returns 
 */
function compressIndices(points: Vec4Array, idxCount: number, a: Vec3, b: Vec3, metric: Vec3, out_indices: Uint8Array) {
	const codes = new Array(idxCount);
	codes[0] = a;
	codes[1] = b;
	if (idxCount === 4) {
		codes[2] = V3.scaleAdd(V3.create(), a, 2, b);
		codes[3] = V3.scaleAdd(V3.create(), b, 2, a);
		V3.scale(codes[2], codes[2], 1/3);
		V3.scale(codes[3], codes[3], 1/3);
	}
	else {
		idxCount = 3;
		codes[2] = V3.add(V3.create(), a, b);
		V3.scale(codes[2], codes[2], 0.5);
	}

	const v_scratch = V3.create();

	let error = 0.0;
	for (let i=0, c=0; i<16; i++, c+=4) {

		let best_d = Number.MAX_VALUE;
		let best_idx = 0;

		for (let idx=0; idx<idxCount; idx++) {
			V3.sub(v_scratch, points.subarray(c, c+3), codes[idx]);
			V3.mult(v_scratch, v_scratch, metric);
			const d = V3.length2(v_scratch);
			if (d < best_d) {
				best_d = d;
				best_idx = idx;
			}
		}
		
		out_indices[i] = best_idx;
		error += best_d;
	}
	
	return error;
}

function compressColorBlock(block: Uint8Array, mask: number, flags: number, out_block: Uint8Array) {
	const points = new Float32Array(16 * 4) as Vec4Array;
	const weights = new Float32Array(16);

	const oneBitAlpha = (flags & DxtFlags.OneBitAlpha) !== 0;
	let hasAlpha = false;

	for (let i=0, c=0; i<16; i++, c+=4) {
		if (!(mask >> i & 1)) continue;
		points[c] = block[c] / 255;
		points[c+1] = block[c+1] / 255;
		points[c+2] = block[c+2] / 255;
		const a = block[c+3] / 255;
		weights[i] = calcWeight(a, flags);
		if (oneBitAlpha && !hasAlpha && a < ALPHA_THRESHOLD) hasAlpha = true;
	}

	const indices = new Uint8Array(16);
	const color_a = V3.create(), color_b = V3.create();
	const metric_default = new Float32Array([1, 1, 1]);

	computeEndpoints(points, weights, mask, color_a, color_b);
	compressIndices(points, hasAlpha ? 3 : 4, color_a, color_b, metric_default, indices);

	
}
