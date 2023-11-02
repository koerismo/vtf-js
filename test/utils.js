import { VFlags } from '../dist/core/enums.js';
import { getFaceCount, getHeaderLength, getMipSize } from '../dist/core/utils.js';
import assert from 'node:assert';

describe('Utility functions', () => {

	it('getFaceCount', () => {
		assert.strictEqual(getFaceCount({ flags: 0x00,          version: 5, first_frame: 0 }), 1);
		assert.strictEqual(getFaceCount({ flags: 0x00,          version: 4, first_frame: -1 }), 1);
		assert.strictEqual(getFaceCount({ flags: VFlags.Envmap, version: 5, first_frame: 0 }), 6);
		assert.strictEqual(getFaceCount({ flags: VFlags.Envmap, version: 4, first_frame: 0 }), 6);
		assert.strictEqual(getFaceCount({ flags: VFlags.Envmap, version: 5, first_frame: -1 }), 6);
		assert.strictEqual(getFaceCount({ flags: VFlags.Envmap, version: 4, first_frame: -1 }), 7);
	});

	it('getHeaderLength', () => {
		assert.strictEqual(getHeaderLength(1, 1), 63);
		assert.strictEqual(getHeaderLength(2, 1), 65);
		assert.strictEqual(getHeaderLength(3, 0), 80);
		assert.strictEqual(getHeaderLength(3, 2), 96);
	});

	it('getMipSize', () => {
		assert.deepStrictEqual(getMipSize(2, 512, 512), [128, 128]);
		assert.deepStrictEqual(getMipSize(3, 256, 256), [32, 32]);
		assert.deepStrictEqual(getMipSize(5, 512, 512), [16, 16]);
		assert.deepStrictEqual(getMipSize(4, 48, 48), [3, 3]);
		assert.deepStrictEqual(getMipSize(5, 48, 48), [2, 2]);
		assert.deepStrictEqual(getMipSize(6, 48, 48), [1, 1]);
		assert.deepStrictEqual(getMipSize(7, 48, 48), [1, 1]);
	});

})