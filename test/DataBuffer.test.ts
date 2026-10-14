import { DataBuffer } from '../dist/index.js';
import { ok, strictEqual } from 'node:assert/strict';

const test_array = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
const test_subarray = new Uint8Array(test_array.buffer, 6)

describe('DataBuffer', () => {
	it('Constructs blank array', () => {
		const view = DataBuffer.new(10);

		ok(view.buffer instanceof ArrayBuffer);
		ok(view.view instanceof DataView);

		strictEqual(view.byteOffset, 0);
		strictEqual(view.byteLength, 10);
		strictEqual(view.length, 10);
	});

	it('Constructs reference from ArrayBuffer', () => {
		const view = DataBuffer.ref(test_array.buffer);

		strictEqual(view.byteOffset, 0);
		strictEqual(view.byteLength, 16);
		strictEqual(view.length, 16);
		strictEqual(view[0], 0);
	});

	it('Constructs reference from TypedArray', () => {
		const view = DataBuffer.ref(test_subarray);

		strictEqual(view.byteOffset, 6);
		strictEqual(view.byteLength, 10);
		strictEqual(view.length, 10);
		strictEqual(view[0], 6);

		strictEqual(view.view.byteOffset, 6);
		strictEqual(view.view.byteLength, 10);

		const view_2 = DataBuffer.ref(test_subarray.buffer, 2, 8);

		strictEqual(view_2.byteOffset, 2);
		strictEqual(view_2.byteLength, 8);
		strictEqual(view_2.length, 8);
		strictEqual(view_2[0], 2);
	});
});
