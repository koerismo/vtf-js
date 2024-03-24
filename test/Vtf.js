import { Vtf, VDataCollection, VImageData } from '../dist/index.js';
import { deepStrictEqual } from 'node:assert';

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
});