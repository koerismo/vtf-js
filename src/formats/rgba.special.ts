import { VFormats } from '../core/enums.js';
import { VCodec, VEncodedImageData, VImageData, VPixelArrayConstructor, registerCodec } from '../core/image.js';
import * as V from '../util/vec.js';
import * as D from '../util/vec.dxt.js';


registerCodec(VFormats.RGB565, {
	length(width, height) {
		return width * height * 2;
	},

	encode(image: VImageData): VEncodedImageData {
		const src = image.convert(Uint8Array).data;
		const pixels = image.width * image.height;

		const target = new Uint8Array(pixels * 2);
		const view = new DataView(target.buffer);

		for ( let i=0; i<pixels; i++ ) {
			view.setUint16(i*2, D.encode565(src, i*4), true);
		}

		return new VEncodedImageData(target, image.width, image.height, VFormats.RGB565);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const src = image.data;
		const pixels = image.width * image.height;
		const target = new Float32Array(pixels * 4);
		const view = new DataView(src.buffer);

		for ( let i=0; i<pixels; i++ ) {
			const d = i*4;
			D.decode565(target, view.getUint16(i*2, true), d);
			target[d+3] = 1.0;
		}

		return new VImageData(target, image.width, image.height).convert(Uint8Array);
	}
});

registerCodec(VFormats.IA88, {
	length(width, height) {
		return width * height * 2;
	},

	encode(image: VImageData): VEncodedImageData {
		const pixels = image.width * image.height;
		const out = new Uint8Array(pixels * 2);
		const src = image.convert(Uint8Array).data;

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
