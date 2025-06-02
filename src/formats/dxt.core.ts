import { VImageData, VEncodedImageData } from '../core/image.js';
import { DataBuffer } from '../core/buffer.js';

function decode565(b1: number, b2: number=0, out: Uint8Array) {
	const value = b1 | (b2 << 8);

	const r = (value >> 11) & 0x1F;
	const g = (value >> 5)  & 0x3F;
	const b = value & 0x1F;

	out[3] = 255;
	out[2] = (r << 3) | (r >> 2);
	out[1] = (g << 2) | (g >> 4);
	out[0] = (b << 3) | (b >> 2);
}

function encode565(inp: Uint8Array) {

}

function decodeColorBlock() {

}
