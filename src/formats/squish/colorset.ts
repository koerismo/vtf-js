import { CompressionFlags } from '../dxt.core.js';
import * as V from '../../util/vec.js';

export interface ColorSet {
	m_count: number; // Int
	m_points: Float32Array; // Vec3[]
	m_weights: Float32Array; // float[]
	m_remap: Int16Array; // int[]
	m_transparent: boolean; // bool
}

export function ColorSet(bgra: Float32Array, mask: number, flags: number): ColorSet {
	const m_points = new Float32Array(16 * 3);
	const m_weights = new Float32Array(16);
	const m_remap = new Int16Array(16);
	let m_transparent = false;
	let m_count = 0;

	// check the compression mode for dxt1
	const isDxt1 = !!(flags & CompressionFlags.DXT1);
	const weightByAlpha = !!(flags & CompressionFlags.AlphaWeight);

	// create the minimal set
	for (let i=0; i<16; i++) {

		// check this pixel is enabled
		if (!(mask & (1 << i))) {
			m_remap[i] = -1;
			continue;
		}

		// check for transparent pixels when using dxt1
		if(isDxt1 && bgra[4*i+3] < 0.5) {
			m_remap[i] = -1;
			m_transparent = true;
			continue;
		}

		// loop over previous points for a match
		for (let j=0;; j++) {
			if (j === i) {
				// normalise coordinates to [0,1]
				const z = bgra[4*i + 0];
				const y = bgra[4*i + 1];
				const x = bgra[4*i + 2];

				// ensure there is always non-zero weight even for zero alpha
				// transforms 0.0-1.0 to 0.0039-1.0
				let w = bgra[4*i + 3];
				if (w == 0.0)
					w = 1.0 / 256.0;

				// add the point
				V.copyValuesInto(m_points, x, y, z, m_count*3);
				m_weights[m_count] = ( weightByAlpha ? w : 1.0 );
				m_remap[i] = m_count;

				// advance
				++m_count;
				break;
			}

			// check for a match
			const oldbit = 1 << j;
			const match = ( ( mask & oldbit ) != 0 )
				&& ( bgra[4*i] == bgra[4*j] )
				&& ( bgra[4*i + 1] == bgra[4*j + 1] )
				&& ( bgra[4*i + 2] == bgra[4*j + 2] )
				&& ( bgra[4*j + 3] >= 0.5 || !isDxt1 );
			
			if (match) {
				// get the index of the match
				const index = m_remap[j];

				// ensure there is always non-zero weight even for zero alpha
				let w = bgra[4*i + 3];
				if (w == 0.0) w = 1.0 / 256.0;

				// map to this point and increase the weight
				m_weights[index] += ( weightByAlpha ? w : 1.0 );
				m_remap[i] = index;
				break;
			}
		}

		// square root the weights
		for(let i=0; i<m_count; i++)
			m_weights[i] = Math.sqrt(m_weights[i]);
	}
	
	return {
		m_count,
		m_points,
		m_weights,
		m_remap,
		m_transparent
	}
}

export function RemapIndices(self: ColorSet, source: Uint8Array, target: Uint8Array) {
	for (let i=0; i<16; i++) {
		const j = self.m_remap[i];
		if (j === -1)
			target[i] = 3;
		else
			target[i] = source[j];
	}
}
