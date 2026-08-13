import { Vtf, VImageData, VFormats, VCollection } from '../dist/index.js';
import '../dist/addons/compress/node.js';

import { deepStrictEqual, fail } from 'node:assert/strict';

const image_big = new VImageData(new Uint8Array(4 * 4 * 4).fill(255), 4, 4);
const image_small = new VImageData(new Uint8Array(1 * 1 * 4).fill(255), 1, 1);

export function deepArrayEqual<T>(a: ArrayLike<T>, b: ArrayLike<T>, msg?: string) {
if (a.length !== b.length) {
		return fail(`Length ${a.length} !== ${b.length}!\n${msg || ''}`);
	} else {
		for (let i=0; i<a.length; i++) {
			if (a[i] === b[i]) continue;
			return fail(`Element ${i}: ${a[i]} !== ${b[i]}!\n${msg || ''}`);
		}
	}
}

export function fillArrayPseudoRand(arr: Uint8Array, seed: number = 0) {
	let s = seed;
	for (let i=0; i<arr.length; i++) {
		// This doesn't need to be good RNG, all it needs to do is have a variety of values.
		s = (s * 12.34 + 180) % 256;
		arr[i] = ~~(s + 0.5);
	}
}

describe('Vtf', () => {
	it('Constructs reflectivity without source', () => {
		const data = VCollection.fromFrames([image_big]);
		const vtf = new Vtf(data);
		deepStrictEqual(vtf.reflectivity, new Float32Array(3).fill(0.0));
	});

	it('Constructs reflectivity with source', () => {
		const data = VCollection.fromFrames([image_small]);
		const vtf = new Vtf(data);
		deepStrictEqual(vtf.reflectivity, new Float32Array(3).fill(1.0));
	});

	it('Constructs reflectivity with option', () => {
		const data = VCollection.fromFrames([image_small]);
		const vtf = new Vtf(data, { reflectivity: new Float32Array(3).fill(0.5) });
		deepStrictEqual(vtf.reflectivity, new Float32Array(3).fill(0.5));
	});

	// Make test data
	const versions = [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [6, 5]];
	const width = 1024, height = 1024;
	const data = new Uint8Array(width * height * 4);

	fillArrayPseudoRand(data);
	const image = new VImageData(data, width, height);

	for (const [version, compression_level] of versions) {
		it(`Encodes and decodes reliably: v${version} (compression ${compression_level})`, async () => {
			const vtf = new Vtf(VCollection.fromFrames([image]), {
				version,
				compression_level,
				format: VFormats.RGBA8888
			});

			const encoded = await vtf.encode();
			const decoded = await Vtf.decode(encoded, { noClone: true });
			
			const found = decoded.body.getImage(0, 0, 0, 0);
			deepArrayEqual(image.data, found.data, `Image match failed on v${version} (compression ${compression_level})`);
		});
	}

});
