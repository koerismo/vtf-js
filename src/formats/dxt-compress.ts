import * as V3 from '../util/vec3.js';
import { Vec3 } from '../util/vec3.js';

const g_covariance = new Float32Array(6);
const g_principal = new Float32Array(3);
const g_metricDefault = new Float32Array([1, 1, 1]);

/**
 * Computes the principal component. Called by `compute_range`
 */
function compute_principal(block: Uint8Array) {
	const iterationCount = 1;
	const n = (block.length / 4) >> 0;
	const n4 = n;

	let total = 0;
	let center_x = 0, center_y = 0, center_z = 0;
	
	for (let i=0; i<n4; i+=4) {
		const w = block[i+3] > 0 ? 1.0 : 0.0;
		total += w;
		center_x += w * block[i];
		center_y += w * block[i+1];
		center_z += w * block[i+2];
	}

	if (total > Number.EPSILON) {
		center_x /= total;
		center_y /= total;
		center_z /= total;
	}

	// Compute covariance matrix

	g_covariance.fill(0);
	for (let i=0; i<n4; i+=4) {
		const w = block[i+3] > 0 ? 1.0 : 0.0;
		const pt_x = block[i] - center_x;
		const pt_y = block[i+1] - center_y;
		const pt_z = block[i+2] - center_z;

		g_covariance[0] += pt_x * pt_x * w;
		g_covariance[1] += pt_x * pt_y * w;
		g_covariance[2] += pt_x * pt_z * w;
		g_covariance[3] += pt_y * pt_y * w;
		g_covariance[4] += pt_y * pt_z * w;
		g_covariance[5] += pt_z * pt_z * w;
	}

	// Compute principal component

	let v_x = 1, v_y = 1, v_z = 1;
	for (let i=0; i<iterationCount; i++) {

		// Vec4 w = row0*v.SplatX();
		let w_x = g_covariance[0] * v_x;
		let w_y = g_covariance[1] * v_x;
		let w_z = g_covariance[2] * v_x;
		// w = MultiplyAdd(row1, v.SplatY(), w);
		w_x += g_covariance[1] * v_y;
		w_y += g_covariance[3] * v_y;
		w_z += g_covariance[4] * v_y;
		//  w = MultiplyAdd(row2, v.SplatZ(), w);
		w_x += g_covariance[2] * v_z;
		w_y += g_covariance[4] * v_z;
		w_z += g_covariance[5] * v_z;

		const a = Math.max(w_x, w_y, w_z);
		v_x = w_x / a;
		v_y = w_y / a;
		v_z = w_z / a;
	}

	g_principal[0] = v_x;
	g_principal[1] = v_y;
	g_principal[2] = v_z;
	return g_principal;
}

function sat(x: number) {
	return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Computes a block's range of colors. Called by `compress3` and `compress4`
 * @param block 4x4 block of RGBA pixels
 * @param principal float[3] principal component vector
 */
function compute_range(block: Uint8Array, out_start: Float32Array, out_end: Float32Array) {
	const count = (block.length / 4) >> 0;
	const count4 = count * 4;

	const principal = compute_principal(block);

	let start_x = 0, start_y = 0, start_z = 0;
	let end_x = 0, end_y = 0, end_z = 0;
	
	if (count) {
		let min: number, max: number;
		start_x = end_x = block[0];
		start_y = end_y = block[1];
		start_z = end_z = block[2];

		min = max = (block[0]*principal[0] + block[1]*principal[1] + block[2]*principal[2]);
		for (let i=1; i<count4; i+=4) {
			const val = (block[i]*principal[0] + block[i+1]*principal[1] + block[i+2]*principal[2]);
			if (val < min) {
				min = val;
				start_x = block[i];
				start_y = block[i+1];
				start_z = block[i+2];
			}
			else if (val > max) {
				max = val;
				end_x = block[i];
				end_y = block[i+1];
				end_z = block[i+2];
			}
		}
	}

	out_start[0] = Math.trunc(sat(start_x) * 31) / 31;
	out_start[1] = Math.trunc(sat(start_y) * 63) / 63;
	out_start[2] = Math.trunc(sat(start_z) * 31) / 31;
	out_end[0] = Math.trunc(sat(end_x) * 31) / 31;
	out_end[1] = Math.trunc(sat(end_y) * 63) / 63;
	out_end[2] = Math.trunc(sat(end_z) * 31) / 31;
}

function compress3(block: Uint8Array, metric: Float32Array, out_start: Float32Array, out_end: Float32Array, out_indices: Uint8Array) {
	const count = (block.length / 4) >> 0;
	const count4 = count * 4;

	const v_start = out_start;	// const v_start = new Float32Array(3);
	const v_end = out_end;		// const v_end = new Float32Array(3);
	compute_range(block, v_start, v_end);

	const codes = new Float32Array(3 * 3);
	v_start.set(codes, 0);
	v_end.set(codes, 3);
	codes[6] = (v_start[0]+v_end[0]) / 2;
	codes[7] = (v_start[1]+v_end[1]) / 2;
	codes[8] = (v_start[2]+v_end[2]) / 2;

	// const indices = new Uint8Array(16);
	let error = 0.0;
	for (let i=0, i4=0; i<count; i++, i4+=4) {
		let dist = Number.MAX_VALUE;
		let idx = 0;
		for (let j=0; j<3; j++) {
			const d = (
				( metric[0] * (block[i4]   - codes[j])   )**2 +
				( metric[1] * (block[i4+1] - codes[j+1]) )**2 +
				( metric[2] * (block[i4+2] - codes[j+2]) )**2  );
			if (d < dist) {
				dist = d;
				idx = j;
			}
		}

		out_indices[i] = idx;
		error += dist;
	}

	return error;
}

function compress4(block: Uint8Array, metric: Float32Array, out_start: Float32Array, out_end: Float32Array, out_indices: Uint8Array) {
	const count = (block.length / 4) >> 0;
	const count4 = count * 4;

	const v_start = out_start;	// const v_start = new Float32Array(3);
	const v_end = out_end;		// const v_end = new Float32Array(3);
	compute_range(block, v_start, v_end);

	const codes = new Float32Array(4 * 3);
	v_start.set(codes, 0);
	v_end.set(codes, 3);
	codes[6]  = (v_start[0]*2 + v_end[0]) / 3;
	codes[7]  = (v_start[1]*2 + v_end[1]) / 3;
	codes[8]  = (v_start[2]*2 + v_end[2]) / 3;
	codes[9]  = (v_start[0] + v_end[0]*2) / 3;
	codes[10] = (v_start[1] + v_end[1]*2) / 3;
	codes[11] = (v_start[2] + v_end[2]*2) / 3;

	// const indices = new Uint8Array(16);
	let error = 0.0;
	for (let i=0, i4=0; i<count; i++, i4+=4) {
		let dist = Number.MAX_VALUE;
		let idx = 0;
		for (let j=0; j<4; j++) {
			const d = (
				( metric[0] * (block[i4]   - codes[j])   )**2 +
				( metric[1] * (block[i4+1] - codes[j+1]) )**2 +
				( metric[2] * (block[i4+2] - codes[j+2]) )**2  );
			if (d < dist) {
				dist = d;
				idx = j;
			}
		}

		out_indices[i] = idx;
		error += dist;
	}

	return error;
}
