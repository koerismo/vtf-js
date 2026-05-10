import { VFormats, VFlags } from '../core/enums.js';
import { VEncodedImageData, VImageData, registerCodec } from '../core/image.js';

/** Encodes a RGB888 Vec3 as a 565 16-bit int. @internal */
export function encode565(a: ArrayLike<number>, index=0, r=0, g=1, b=2) {
	return (
		((Math.round(a[index+r] / 0xff * 0b11111)  << 11) & 0b1111100000000000) |
		((Math.round(a[index+g] / 0xff * 0b111111) << 5)  & 0b0000011111100000) |
		((Math.round(a[index+b] / 0xff * 0b11111)  << 0)  & 0b0000000000011111)
	);
}

/** Decodes a 16-bit int as an RGB888 Vec3. @internal */
export function decode565(out: Uint8Array, a: number, offset: number=0, r=0, g=1, b=2): Uint8Array {
	out[offset+r] = Math.round(((a & 0b1111100000000000) >> 11) / 0b11111 * 0xff);
	out[offset+g] = Math.round(((a & 0b0000011111100000) >> 5)  / 0b111111 * 0xff);
	out[offset+b] = Math.round(((a & 0b0000000000011111) >> 0)  / 0b11111 * 0xff);
	return out;
}

registerCodec(VFormats.RGB565, {
	alpha: VFlags.None,

	length(width, height) {
		return width * height * 2;
	},

	encode(image: VImageData): VEncodedImageData {
		const src = image.coerce(Uint8Array).data;
		const pixels = image.width * image.height;

		const target = new Uint8Array(pixels * 2);
		const view = new DataView(target.buffer);

		for ( let i=0; i<pixels; i++ ) {
			view.setUint16(i*2, encode565(src, i*4), true);
		}

		return new VEncodedImageData(target, image.width, image.height, VFormats.RGB565);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const src = image.data;
		const pixels = image.width * image.height;
		const target = new Uint8Array(pixels * 4);
		const view = new DataView(src.buffer, src.byteOffset);

		for ( let i=0; i<pixels; i++ ) {
			const d = i*4;
			decode565(target, view.getUint16(i*2, true), d);
			target[d+3] = 255;
		}

		return new VImageData(target, image.width, image.height);
	}
});

registerCodec(VFormats.BGR565, {
	alpha: VFlags.None,

	length(width, height) {
		return width * height * 2;
	},

	encode(image: VImageData): VEncodedImageData {
		const src = image.coerce(Uint8Array).data;
		const pixels = image.width * image.height;

		const target = new Uint8Array(pixels * 2);
		const view = new DataView(target.buffer);

		for ( let i=0; i<pixels; i++ ) {
			view.setUint16(i*2, encode565(src, i*4, 2, 1, 0), true);
		}

		return new VEncodedImageData(target, image.width, image.height, VFormats.RGB565);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const src = image.data;
		const pixels = image.width * image.height;
		const target = new Uint8Array(pixels * 4);
		const view = new DataView(src.buffer, src.byteOffset);

		for ( let i=0; i<pixels; i++ ) {
			const d = i*4;
			decode565(target, view.getUint16(i*2, true), d, 2, 1, 0);
			target[d+3] = 255;
		}

		return new VImageData(target, image.width, image.height);
	}
});

registerCodec(VFormats.IA88, {
	alpha: VFlags.EightBitAlpha,

	length(width, height) {
		return width * height * 2;
	},

	encode(image: VImageData): VEncodedImageData {
		const pixels = image.width * image.height;
		const out = new Uint8Array(pixels * 2);
		const src = image.coerce(Uint8Array).data;

		for ( let i=0; i<pixels; i++ ) {
			const s = i * 4;
			const t = i * 2;
			out[t]   = src[s];
			out[t+1] = src[s+3];
		}

		return new VEncodedImageData(out, image.width, image.height, VFormats.IA88);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const pixels = image.width * image.height;
		const out = new Uint8Array(pixels * 4);
		const src = image.data;

		for ( let i=0; i<pixels; i++ ) {
			const s = i * 2;
			const t = i * 4;
			out[t] = out[t+1] = out[t+2] = src[s];
			out[t+3] = src[s+1];
		}

		return new VImageData(out, image.width, image.height);
	}
});
