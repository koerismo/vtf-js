import { inflateSync, deflateSync } from 'fflate';
import { setCompressionMethod } from '../../core/utils.js';
import { VCompressionMethods } from '../../core/enums.js';

setCompressionMethod(
	// Compress
	(data, method, level) => {
		if (method !== VCompressionMethods.Deflate) throw Error('vtf-js: fflate backend only supports Deflate compression!');
		return deflateSync(data, { level: <0|1|2|3|4|5|6|7|8|9>level });
	},
	// Decompress
	(data, method, level) => {
		if (method !== VCompressionMethods.Deflate) throw Error('vtf-js: fflate backend only supports Deflate decompression!');
		return inflateSync(data);
});
