import { Vtf, VDataCollection, VImageData, VFormats } from '../dist/index.js';
import '../dist/addons/compress/node.js';

import { deepStrictEqual, strictEqual } from 'node:assert/strict';

const image_big = new VImageData(new Uint8Array(4 * 4 * 4).fill(255), 4, 4);
const image_small = new VImageData(new Uint8Array(1 * 1 * 4).fill(255), 1, 1);

describe('Vtf', () => {
	it('Constructs reflectivity without source', () => {
		const data = new VDataCollection([[[[image_big]]]]);
		const vtf = new Vtf(data);
		deepStrictEqual(vtf.reflectivity, new Float32Array(3).fill(0.0));
	});

	it('Constructs reflectivity with source', () => {
		const data = new VDataCollection([[[[image_small]]]]);
		const vtf = new Vtf(data);
		deepStrictEqual(vtf.reflectivity, new Float32Array(3).fill(1.0));
	});

	it('Constructs reflectivity with option', () => {
		const data = new VDataCollection([[[[image_small]]]]);
		const vtf = new Vtf(data, { reflectivity: new Float32Array(3).fill(0.5) });
		deepStrictEqual(vtf.reflectivity, new Float32Array(3).fill(0.5));
	});

	// Make test data
	const versions = [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [6, 5]];
	const width = 1024, height = 1024;
	const data = new Uint8Array(width * height * 4);
	for (let i=0; i<data.length; i++) data[i] = Math.random() * 255; 
	const image = new VImageData(data, width, height);

	for (const [version, compression_level] of versions) {
		it(`Encodes and decodes reliably: v${version} (compression ${compression_level})`, async () => {
			const vtf = new Vtf(new VDataCollection([[[[image]]]]), {
				version,
				compression_level,
				format: VFormats.RGBA8888
			});

			const encoded = await vtf.encode();
			const decoded = await Vtf.decode(encoded, false, false);
			const found = decoded.data.getImage(0, 0, 0, 0);
			deepStrictEqual(image, found, `Image match failed on v${version} (compression ${compression_level})`);
		});
	}
});