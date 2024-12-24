// This portion of the code has been adapted from libsquish!
// https://github.com/KonajuGames/libsquish/blob/master/clusterfit.cpp

import { CompressionFlags } from '../dxt.core.js';
import * as V from '../../util/vec.js';
import { ColorSet } from './colorset.js';

export interface ColorFit {
	m_flags: number;
	m_colors: ColorSet;
}
