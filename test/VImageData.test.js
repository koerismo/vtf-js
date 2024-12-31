import { VImageData } from '../dist/core/image.js';
import assert from 'node:assert/strict';

describe('VImageData', () => {
	it('Ensure conversion is lossless', () => {
		const image = new VImageData(new Float32Array([0.1,0.2,0.3,0.4,0.5]), 512, 512);
		const u1 = image.convert(Uint32Array);
		const f1 = u1.convert(Float32Array);
		const u2 = f1.convert(Uint32Array);
		const f2 = u2.convert(Float32Array);
		const u3 = f2.convert(Uint32Array);
		const f3 = u3.convert(Float32Array);

		assert.deepStrictEqual(u3, u2, 'Color accuracy has degraded!');
		assert.deepStrictEqual(f3, f2, 'Color accuracy has degraded!');
	});

	it('Ensure conversion is accurate', () => {
		const image = new VImageData(new Float32Array([0.0,0.1,0.2, 0.8,0.9,1.0]), 512, 512);
		const u1 = image.convert(Uint32Array);
		const f1 = u1.convert(Float32Array);
		
		assert.strictEqual(u1.data[0], 0, 'Int 0.0 is not 0!');
		assert.strictEqual(f1.data[0], 0, 'Float 0.0 is not 0!');
		assert.strictEqual(u1.data[5], 0xffffffff, 'Int 1.0 is not max!');
		assert.strictEqual(f1.data[5], 1.0, 'Float 1.0 is not 1.0!');
	})
});