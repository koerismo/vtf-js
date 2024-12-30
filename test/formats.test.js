import { VCodecs } from '../dist/core/image.js';
import { VImageData, VFormats } from '../dist/index.js';
import assert from 'node:assert/strict';

function makeTestImage(width, height) {
	const data = new Float64Array(width * height * 4);
	for (let i=0; i<data.length; i++) {
		data[i] = (i % 256) / 255.0;
	}
	return new VImageData(data, width, height);
}

/**
 * @param {VImageData} a 
 * @param {VImageData} b 
 * @param {number} channel_a
 * @param {number} channel_b
 */
function diffImages(a, b, channel_a, channel_b, threshold=0) {
	let diff = 0;
	for (let i=0; i<a.data.length; i+=4) {
		diff += Math.abs(a.data[i+channel_a] - b.data[i+channel_b]);
	}
	return (diff / a.data.length) <= threshold;
}

/**
 * @param {VImageData} a 
 * @param {VImageData} b 
 */
function checkImageSizes(a, b) {
	return (a.width === b.width) && (a.height === b.height) && (a.data.length === b.data.length);
}

const formats = [
	VFormats.RGB323232F,
	VFormats.RGBA32323232F,
	VFormats.RGBA16161616,
	VFormats.RGBA16161616F,
	VFormats.R32F,
	VFormats.RGBA8888,
    VFormats.ABGR8888,
    VFormats.RGB888,
    VFormats.BGR888,
    VFormats.BGR565,
    VFormats.RGB565,
    VFormats.IA88,
	VFormats.UV88,
    VFormats.I8,
    VFormats.P8,
    VFormats.A8,
	VFormats.DXT1,
	VFormats.DXT3,
	VFormats.DXT5
];

describe('Format IO Difftest', () => {
	for (const format of formats) {
		if (VCodecs[format] == null) {
			console.warn('Skipping unsupported format', VFormats[format]);
			continue;
		}

		it(`Format ${VFormats[format]}`, () => {

			const big = makeTestImage(1024, 1024);
			const small = makeTestImage(8, 8);
			const weird = makeTestImage(45, 35);

			const big_out = big.encode(format).decode().convert(Float64Array);
			const small_out = small.encode(format).decode().convert(Float64Array);
			const weird_out = weird.encode(format).decode().convert(Float64Array);

			const assertDiff = (cA, cB, is_lossy) => {
				const max_diff = is_lossy ? 8.0 : 0.000001;
				assert(diffImages(big, big_out, cA, cB, max_diff), `Channel diff ${cA}-${cB} failed on image! [big]`);
				assert(diffImages(small, small_out, cA, cB, max_diff), `Channel diff ${cA}-${cB} failed on image! [small]`);
				assert(diffImages(weird, weird_out, cA, cB, max_diff), `Channel diff ${cA}-${cB} failed on image! [weird]`);
			};

			if (!checkImageSizes(big, big_out)) throw Error(`[big] Format ${VFormats[format]} failed size check!`);
			if (!checkImageSizes(small, small_out)) throw Error(`[small] Format ${VFormats[format]} failed size check!`);
			if (!checkImageSizes(weird, weird_out)) throw Error(`[weird] Format ${VFormats[format]} failed size check!`);

			switch (format) {
				case VFormats.A8:
					// Alpha format
					assertDiff(3, 3);
					break;
				case VFormats.P8:
				case VFormats.I8:
					// Greyscale formats
					assertDiff(0, 0);
					assertDiff(0, 1);
					assertDiff(0, 2);
					break;
				case VFormats.IA88:
					// Greyscale-alpha format
					assertDiff(0, 0);
					assertDiff(0, 1);
					assertDiff(0, 2);
					assertDiff(3, 3);
					break;
				case VFormats.UV88:
					// R/G format
					assertDiff(0, 0);
					assertDiff(1, 1);
					break;
				case VFormats.RGB565:
				case VFormats.BGR565:
				case VFormats.DXT1:
				case VFormats.DXT3:
				case VFormats.DXT5:
					// Lossy-ish formats
					assertDiff(0, 0, true);
					assertDiff(1, 1, true);
					assertDiff(2, 2, true);
					break;
				case VFormats.RGB888:
				case VFormats.BGR888:
				case VFormats.RGB323232F:
					// RGB formats
					assertDiff(0, 0);
					assertDiff(1, 1);
					assertDiff(2, 2);
					break;
				case VFormats.R32F:
					// Odd case: Red-channel format?
					assertDiff(0, 0);
					break;
				default:
					// Default case
					assertDiff(0, 0);
					assertDiff(1, 1);
					assertDiff(2, 2);
					assertDiff(3, 3);
					break;
			}
		});
	}
});
