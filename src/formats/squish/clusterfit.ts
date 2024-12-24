// This portion of the code has been adapted from libsquish!
// https://github.com/KonajuGames/libsquish/blob/master/clusterfit.cpp

import { CompressionFlags } from '../dxt.core.js';
import { ColorFit } from './colorfit.js';
import * as ColorSet from './colorset.js';
import * as Vec3 from '../../util/vec.js';
import * as Vec4 from '../../util/vec4.js';
import { ComputePrincipleComponent, ComputeWeightedCovariance } from '../../util/squish.js';

type Vec3 = Vec3.Vec3;
type Vec4 = Vec4.Vec4;
type ColorSet = ColorSet.ColorSet;

const MAX_ITERATIONS = 8;

export interface ClusterFit extends ColorFit {
	m_iterationCount: number;
	m_principle: Vec3;
	m_order: Uint8Array; // u8[16*MAX_ITERATIONS]
	m_points_weights: Float32Array; // Vec4[16]
	m_xsum_wsum: Vec4;
	m_metric: Vec4;
	m_besterror: number;
}

export function ClusterFit(colors: ColorSet, flags: number, metric?: Float32Array): ClusterFit {
	const m_flags = flags;
	const m_metric = metric ?? Vec4.create( 1.0 );
	const m_besterror = Infinity;
	const m_iterationCount = (m_flags & CompressionFlags.IterativeClusterFit) ? MAX_ITERATIONS : 1;

	const count = colors.m_count;
	const values = colors.m_points;

	const covariance = ComputeWeightedCovariance(count, values, colors.m_weights);
	const m_principle = ComputePrincipleComponent(covariance);
	
	return {
		m_colors: colors,
		m_flags,
		m_metric,
		m_besterror,
		m_iterationCount,
		m_principle,
		m_order: new Uint8Array(16 * MAX_ITERATIONS),
		m_points_weights: new Float32Array(16 * 4),
		m_xsum_wsum: Vec4.create()
	}
}

export function ConstructOrdering(self: ClusterFit, axis: Vec3, iteration: number) {
	// cache some values
	const count = self.m_colors.m_count;
	const values = self.m_colors.m_points;

	// build the list of dot products
	const dps = new Float32Array(16);
	const order = self.m_order;
	const orderByteOffset = 16 * iteration;
	for (let i=0; i<count; i++) {
		dps[i + orderByteOffset] = Vec3.dot(Vec3.from(values, i*3), axis);
		order[i] = i;
	}

	// stable sort using them
	for (let i=0; i<count; i++) {
		for (let j=i; j>0 && dps[j] < dps[j - 1]; j--) {
			// swap dps[j] <--> dps[j-1]
			const tmp1 = dps[j];
			dps[j] = dps[j-1];
			dps[j-1] = tmp1;
			// swap order[j] <--> order[j-1]
			const tmp2 = order[j];
			order[j] = order[j-1];
			order[j-1] = tmp2;
		}
	}

	// check this ordering is unique
	for (let it=0; it<iteration; it++) {
		const prev = self.m_order;
		const prevByteOffset = 16*it;
		let same = true;

		for (let i=0; i<count; i++) {
			if (order[i] !== prev[i + prevByteOffset]) {
				same = false;
				break;
			}
		}

		if (same)
			return false;
	}

	// copy the ordering and weight all the points
	const unweighted = self.m_colors.m_points;
	const weights = self.m_colors.m_weights;
	const m_points_weights = self	.m_points_weights;
	const m_xsum_wsum = Vec4.fill(self.m_xsum_wsum, 0.0);
	const p = Vec4.create(1.0);
	for (let i=0; i<count; i++) {
		const j = order[i];
		Vec3.copy(p, unweighted, j*3);            // p = unweighted[j];
		Vec4.scale(p, p, weights[j]);             // p *= weights[j];
		Vec4.copyInto(m_points_weights, p, i*4);  // m_points_weights[i] = p;
		Vec4.add(m_xsum_wsum, m_xsum_wsum, p);    // m_xsum_wsum += p;
	}

	return true;
}

// NegativeMultiplySubtract(a, b, c) = c - a*b
function NegativeMultiplySubtract(out: Vec4, a: Vec4, b: Vec4, c: Vec4) {
	Vec4.mult(out, a, b);
	Vec4.sub(out, c, out);
	return out;
}

function Truncate(out: Vec4) {
	out[0] = out[0] < 0 ? Math.ceil(out[0]) : Math.floor(out[0]),
	out[1] = out[1] < 0 ? Math.ceil(out[1]) : Math.floor(out[1]),
	out[2] = out[2] < 0 ? Math.ceil(out[2]) : Math.floor(out[2]),
	out[3] = out[3] < 0 ? Math.ceil(out[3]) : Math.floor(out[3]);
	return out;
}

export function Compress3(self: ClusterFit, out_start: Vec3, out_end: Vec3, out_indices: Uint8Array) {
	const count = self.m_colors.m_count;
	const two = Vec4.create(2.0);
	const one = Vec4.create(1.0);
	const half_half2 = Vec4.create(.5, .5, .5, .25);
	const zero = Vec4.create(0.0);
	const half = Vec4.create(0.5);
	const grid = Vec4.create(31, 63, 31, 0);
	const gridrcp = Vec4.create(1/31, 1/63, 1/31, 0);

	ConstructOrdering(self, self.m_principle, 0);

	const beststart = Vec4.create(0.0);
	const bestend = Vec4.create(0.0);
	const bestindices = out_indices; // new Uint8Array(16);
	let besterror = self.m_besterror;
	let bestiteration = 0;
	let besti = 0, bestj = 0;

	const alphax_sum = Vec4.create();
	const alpha2_sum = Vec4.create();
	const betax_sum = Vec4.create();
	const beta2_sum = Vec4.create();
	const alphabeta_sum = Vec4.create();
	const alpha2_beta2_sum = Vec4.create();
	const alphax_beta2_sum = Vec4.create();
	const alpha2_betax_sum = Vec4.create();

	const aa = Vec4.create();
	const bb_beta2_sum = Vec4.create();
	const ab_alphabeta_sum = Vec4.create();

	const factor = Vec4.create();
	const a = Vec4.create();
	const b = Vec4.create();

	const e1 = Vec4.create();
	const e2 = Vec4.create();
	const e3 = Vec4.create();
	const e4 = Vec4.create();
	const e5 = Vec4.create();
	const axis = Vec4.create();

	for (let iterationIndex=0;;) {
		// first cluster [0,i) is at the start
		const part0 = Vec4.create(0.0);
		for (let i=0; i<count; i++) {

			// second cluster [i,j) is half along
			const part1 = i === 0 ? Vec4.from(self.m_points_weights) : Vec4.create(0.0);
			const jmin = i === 0 ? 1 : i;

			for (let j=jmin;;) {
				// last cluster [j,count) is at the end
				const part2 = Vec4.create(0.0);
				Vec4.sub(part2, self.m_xsum_wsum, part1);
				Vec4.sub(part2, part2, part0);

				// compute least squares terms directly
				Vec4.multAdd(alphax_sum, part1, half_half2, part0);
				Vec4.fill(alpha2_sum, alphax_sum[3]);
				
				Vec4.multAdd(betax_sum, part1, half_half2, part0);
				Vec4.fill(beta2_sum, betax_sum[3]);

				Vec4.mult(alphabeta_sum, part1, half_half2);

				// Cache vec multiply products
				Vec4.mult(alpha2_beta2_sum, alpha2_sum, beta2_sum);
				Vec4.mult(alphax_beta2_sum, alphax_sum, beta2_sum);
				Vec4.mult(alpha2_betax_sum, alpha2_sum, betax_sum);

				// compute the least-squares optimal points
				NegativeMultiplySubtract(factor, alphabeta_sum, alphabeta_sum, alpha2_beta2_sum);
				Vec4.reciprocal(factor, factor);
				NegativeMultiplySubtract(a, betax_sum, alphabeta_sum, alphax_beta2_sum);
				Vec4.mult(a, a, factor);
				NegativeMultiplySubtract(b, betax_sum, alphabeta_sum, alphax_beta2_sum);
				Vec4.mult(b, b, factor);

				// clamp to the grid
				Vec4.clamp(a, a, 0, 1);
				Vec4.clamp(b, b, 0, 1);
				Vec4.multAdd(a, grid, a, half);
				Vec4.multAdd(b, grid, b, half);
				Truncate(a);
				Truncate(b);
				Vec4.mult(a, a, gridrcp);
				Vec4.mult(b, b, gridrcp);

				// Cache vec multiply products
				Vec4.mult(aa, a, a);
				Vec4.mult(bb_beta2_sum, b, b);
				Vec4.mult(bb_beta2_sum, bb_beta2_sum, beta2_sum);
				Vec4.mult(ab_alphabeta_sum, a, b);
				Vec4.mult(ab_alphabeta_sum, ab_alphabeta_sum, alphabeta_sum);

				// compute the error (we skip the constant xxsum)
				Vec4.multAdd(e1, aa, alpha2_sum, bb_beta2_sum);
				Vec4.multAdd(e2, a, alphax_sum, ab_alphabeta_sum);
				Vec4.multAdd(e3, b, betax_sum, e2);
				Vec4.multAdd(e4, two, e3, e1);

				// apply the metric to the error term
				Vec4.mult(e5, e4, self.m_metric);
				const error = e5[0] + e5[1] + e5[2];

				if (error < besterror) {
					Vec4.copy(beststart, a);
					Vec4.copy(bestend, b);
					besti = i;
					bestj = j;
					besterror = error;
					bestiteration = iterationIndex;
				}

				// advance
				if (j === count)
					break;

				Vec4.add(part1, part1, Vec4.from(self.m_points_weights, j*4));
				j++;
			}

			// advance
			Vec4.add(part0, part0, Vec4.from(self.m_points_weights, i*4));
		}

		// stop if we didn't improve in this iteration
		if (bestiteration != iterationIndex)
			break;

		// advance if possible
		iterationIndex++;
		if(iterationIndex == self.m_iterationCount)
			break;

		// stop if a new iteration is an ordering that has already been tried
		Vec4.sub(axis, bestend, beststart);
		if(!ConstructOrdering(self, axis, iterationIndex))
			break;
	}

	// save the block if necessary
	if (besterror < self.m_besterror) {
		// remap the indices
		const order = self.m_order;
		const orderByteOffset = 16*bestiteration;
		
		const unordered = new Uint8Array(16);
		for (let m=0; m<besti; m++)
			unordered[order[m]] = 0;
		for (let m=besti; m<bestj; m++)
			unordered[order[m]] = 2;
		for (let m=bestj; m<count; m++)
			unordered[order[m]] = 1;

		ColorSet.RemapIndices(self.m_colors, unordered, bestindices);

		// save the block
		Vec3.copy(out_start, beststart);
		Vec3.copy(out_end, bestend);

		// save the error
		self.m_besterror = besterror;
	}
}

export function Compress4(self: ClusterFit, out_start: Vec3, out_end: Vec3, out_indices: Uint8Array) {
	const count = self.m_colors.m_count;
	const two = Vec4.create(2.0);
	const one = Vec4.create(1.0);
	const half_half2 = Vec4.create(.5, .5, .5, .25);
	const zero = Vec4.create(0.0);
	const half = Vec4.create(0.5);
	const grid = Vec4.create(31, 63, 31, 0);
	const gridrcp = Vec4.create(1/31, 1/63, 1/31, 0);

	ConstructOrdering(self, self.m_principle, 0);

	const beststart = Vec4.create(0.0);
	const bestend = Vec4.create(0.0);
	const bestindices = out_indices; // new Uint8Array(16);
	let besterror = self.m_besterror;
	let bestiteration = 0;
	let besti = 0, bestj = 0;

	const alphax_sum = Vec4.create();
	const alpha2_sum = Vec4.create();
	const betax_sum = Vec4.create();
	const beta2_sum = Vec4.create();
	const alphabeta_sum = Vec4.create();
	const alpha2_beta2_sum = Vec4.create();
	const alphax_beta2_sum = Vec4.create();
	const alpha2_betax_sum = Vec4.create();

	const aa = Vec4.create();
	const bb_beta2_sum = Vec4.create();
	const ab_alphabeta_sum = Vec4.create();

	const factor = Vec4.create();
	const a = Vec4.create();
	const b = Vec4.create();

	const e1 = Vec4.create();
	const e2 = Vec4.create();
	const e3 = Vec4.create();
	const e4 = Vec4.create();
	const e5 = Vec4.create();
	const axis = Vec4.create();

	for (let iterationIndex=0;;) {
		// first cluster [0,i) is at the start
		const part0 = Vec4.create(0.0);
		for (let i=0; i<count; i++) {

			// second cluster [i,j) is half along
			const part1 = i === 0 ? Vec4.from(self.m_points_weights) : Vec4.create(0.0);
			const jmin = i === 0 ? 1 : i;

			for (let j=jmin;;) {
				// last cluster [j,count) is at the end
				const part2 = Vec4.create(0.0);
				Vec4.sub(part2, self.m_xsum_wsum, part1);
				Vec4.sub(part2, part2, part0);

				// compute least squares terms directly
				Vec4.multAdd(alphax_sum, part1, half_half2, part0);
				Vec4.fill(alpha2_sum, alphax_sum[3]);
				
				Vec4.multAdd(betax_sum, part1, half_half2, part0);
				Vec4.fill(beta2_sum, betax_sum[3]);

				Vec4.mult(alphabeta_sum, part1, half_half2);

				// Cache vec multiply products
				Vec4.mult(alpha2_beta2_sum, alpha2_sum, beta2_sum);
				Vec4.mult(alphax_beta2_sum, alphax_sum, beta2_sum);
				Vec4.mult(alpha2_betax_sum, alpha2_sum, betax_sum);

				// compute the least-squares optimal points
				NegativeMultiplySubtract(factor, alphabeta_sum, alphabeta_sum, alpha2_beta2_sum);
				Vec4.reciprocal(factor, factor);
				NegativeMultiplySubtract(a, betax_sum, alphabeta_sum, alphax_beta2_sum);
				Vec4.mult(a, a, factor);
				NegativeMultiplySubtract(b, betax_sum, alphabeta_sum, alphax_beta2_sum);
				Vec4.mult(b, b, factor);

				// clamp to the grid
				Vec4.clamp(a, a, 0, 1);
				Vec4.clamp(b, b, 0, 1);
				Vec4.multAdd(a, grid, a, half);
				Vec4.multAdd(b, grid, b, half);
				Truncate(a);
				Truncate(b);
				Vec4.mult(a, a, gridrcp);
				Vec4.mult(b, b, gridrcp);

				// Cache vec multiply products
				Vec4.mult(aa, a, a);
				Vec4.mult(bb_beta2_sum, b, b);
				Vec4.mult(bb_beta2_sum, bb_beta2_sum, beta2_sum);
				Vec4.mult(ab_alphabeta_sum, a, b);
				Vec4.mult(ab_alphabeta_sum, ab_alphabeta_sum, alphabeta_sum);

				// compute the error (we skip the constant xxsum)
				Vec4.multAdd(e1, aa, alpha2_sum, bb_beta2_sum);
				Vec4.multAdd(e2, a, alphax_sum, ab_alphabeta_sum);
				Vec4.multAdd(e3, b, betax_sum, e2);
				Vec4.multAdd(e4, two, e3, e1);

				// apply the metric to the error term
				Vec4.mult(e5, e4, self.m_metric);
				const error = e5[0] + e5[1] + e5[2];

				if (error < besterror) {
					Vec4.copy(beststart, a);
					Vec4.copy(bestend, b);
					besti = i;
					bestj = j;
					besterror = error;
					bestiteration = iterationIndex;
				}

				// advance
				if (j === count)
					break;

				Vec4.add(part1, part1, Vec4.from(self.m_points_weights, j*4));
				j++;
			}

			// advance
			Vec4.add(part0, part0, Vec4.from(self.m_points_weights, i*4));
		}

		// stop if we didn't improve in this iteration
		if (bestiteration != iterationIndex)
			break;

		// advance if possible
		iterationIndex++;
		if(iterationIndex == self.m_iterationCount)
			break;

		// stop if a new iteration is an ordering that has already been tried
		Vec4.sub(axis, bestend, beststart);
		if(!ConstructOrdering(self, axis, iterationIndex))
			break;
	}

	// save the block if necessary
	if (besterror < self.m_besterror) {
		// remap the indices
		const order = self.m_order;
		const orderByteOffset = 16*bestiteration;
		
		const unordered = new Uint8Array(16);
		for (let m=0; m<besti; m++)
			unordered[order[m]] = 0;
		for (let m=besti; m<bestj; m++)
			unordered[order[m]] = 2;
		for (let m=bestj; m<count; m++)
			unordered[order[m]] = 1;

		ColorSet.RemapIndices(self.m_colors, unordered, bestindices);

		// save the block
		Vec3.copy(out_start, beststart);
		Vec3.copy(out_end, bestend);

		// save the error
		self.m_besterror = besterror;
	}
}

