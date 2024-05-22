import { VImageData, VFormats } from '../dist/index.js';

function makeTestImage(width, height) {
	const data = new Uint8Array(width * height * 4);
	for (let i=0; i<data.length; i++) {
		data[i] = i % 256;
	}
	return new VImageData(data, width, height);
}

/**
 * @param {VImageData} a 
 * @param {VImageData} b 
 */
function diffImages(a, b, rgb=true, alpha=false) {
	let diff = 0;
	for (let i=0; i<a.data.length; i++) {
		if (!alpha && i % 4 === 3) continue;
		if (!rgb && i % 4 !== 3) continue;
		diff += Math.abs(a.data[i] - b.data[i]);
	}
	return diff / a.data.length;
}

const formats = [
	VFormats.RGBA8888,
    VFormats.ABGR8888,
    VFormats.RGB888,
    VFormats.BGR888,
    VFormats.RGB565,
    VFormats.I8,
    VFormats.IA88,
    VFormats.P8,
    VFormats.A8,
	VFormats.DXT1,
	VFormats.DXT3,
	VFormats.DXT5,
];

describe('Format IO Difftest', () => {
	for (const format of formats) {
		it(`Format ${VFormats[format]}`, () => {
			const big = makeTestImage(1024, 1024);
			const small = makeTestImage(8, 8);
			// const weird = makeTestImage(40, 30);

			const big_out = big.encode(format).decode();
			const small_out = small.encode(format).decode();
			// const weird_out = weird.encode(format).decode();

			const uses_color = format !== VFormats.A8;
			const uses_alpha = format === VFormats[format].includes('A') || format === VFormats.DXT3 || format === VFormats.DXT5;

			const big_diff = diffImages(big, big_out, uses_color, uses_alpha);
			const small_diff = diffImages(small, small_out, uses_color, uses_alpha);
			// const weird_diff = diffImages(weird, weird_out);

			if (big_diff > 16) throw Error(`[big] Format ${VFormats[format]} failed diff test (${big_diff})!`);
			if (small_diff > 16) throw Error(`[small] Format ${VFormats[format]} failed diff test (${small_diff})!`);
			// if (weird_diff > 12) throw Error(`[weird] Format ${VFormats[format]} failed diff test (${weird_diff})!`);
		});
	}
});
