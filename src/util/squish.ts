// This portion of the code has been adapted from libsquish!
// https://github.com/KonajuGames/libsquish/blob/master/maths.cpp

import * as V from './vec.js';

const FLT_EPSILON = 1.0;
const cwc_centroid = V.create();
const cwc_a = V.create(), cwc_b = V.create();

/**
 * @param n int
 * @param points Vec3[]
 * @param weights float[]
 * @returns 3x3 matrix
 */
export function ComputeWeightedCovariance(n: number, points: Float32Array, weights: Float32Array): Float32Array {
	// compute the centroid
	let total = 0.0;
	const centroid = V.fill(cwc_centroid, 0.0);

	for (let i=0, p=0; i<n; i++, p+=3) {
		const w = weights[i];
		total += w;
		centroid[0] += w * points[p],
		centroid[1] += w * points[p+1],
		centroid[2] += w * points[p+2];
	}

	if( total > FLT_EPSILON )
		V.scale(centroid, centroid, 1 / total);

    // accumulate the covariance matrix
	const covariance = new Float32Array(3*3).fill(0.0);

	for (let i=0; i<n; i++) {
		const point = V.from(points, i*3);
		const a = V.sub(cwc_a, point, centroid);
		const b = V.scale(cwc_b, a, weights[i]);

		const	aX = a[0], aY = a[1], aZ = a[2],
				bX = b[0], bY = b[1], bZ = b[2];

		covariance[0] += aX * bX,
		covariance[1] += aX * bY,
		covariance[2] += aX * bZ,
		covariance[3] += aY * bY,
		covariance[4] += aY * bZ,
		covariance[5] += aZ * bZ;
	}

	// return it
	return covariance;
}


const POWER_ITERATION_COUNT = 8;

// Pre-allocate all vectors to improve perf
const cpc_row0 = V.create();
const cpc_row1 = V.create();
const cpc_row2 = V.create();
const cpc_v = V.create();
const cpc_w = V.create();

/**
 * @param matrix 3x3 matrix
 * @returns The principal component
 */
export function ComputePrincipleComponent( matrix: Float32Array ): V.Vec3 {
    const row0 = V.setValues( cpc_row0, matrix[0], matrix[1], matrix[2] );
    const row1 = V.setValues( cpc_row1, matrix[1], matrix[3], matrix[4] );
    const row2 = V.setValues( cpc_row2, matrix[2], matrix[4], matrix[5] );
    const v = V.fill( cpc_v, 1.0 );
	
    for (let i=0; i<POWER_ITERATION_COUNT; i++) {
        // matrix multiply
        const w = V.scale(cpc_w, row0, v[0]);
		V.scaleAdd(w, row1, v[1], w);
		V.scaleAdd(w, row2, v[2], w);

        // get max component from xyz in all channels
		const a = Math.max(w[0], w[1], w[2]);

        // divide through and advance
		V.scale(v, w, 1/a);
    }

    return v;
}

const rf_start = V.create();
const rf_end = V.create();

/**
 * @param count The number of points
 * @param values The RGB points in float format
 * @param weights THe point weights in float format
 */
export function RangeFit(count: number, values: Float32Array, weights: Float32Array): { start: V.Vec3, end: V.Vec3 } {
	const covariance = ComputeWeightedCovariance(count, values, weights);
	const principle = ComputePrincipleComponent(covariance);

	let start = V.fill(rf_start, 0.0), end = V.fill(rf_end, 0.0);
	let min: number, max: number;
	
	if (count) {
		start = end = V.from(values, 0);
		min = max = V.dot(start, principle);

		for (let i=1; i<count; i++) {
			const pt = V.from(values, i*3);
			const val = V.dot(pt, principle);

			if (val < min) {
				start = pt;
				min = val;
			}
			else if (val > max) {
				end = pt;
				max = val;
			}
		}
	}

	start = V.clamp(rf_start, start, 0.0, 1.0);
	end = V.clamp(rf_end, end, 0.0, 1.0);
	
	return { start, end };
}
