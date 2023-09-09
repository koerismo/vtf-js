import { VFormats } from '../core/enums.js';
import { VEncodedImageData, VImageData, registerCodec } from '../image.js';

registerCodec(VFormats.RGBA8888, {
	length(width, height) {
		return width * height * 4;
	},

	encode(image: VImageData): VEncodedImageData {
		return new VEncodedImageData(image.convert(Uint8Array).data, image.width, image.height, VFormats.RGBA8888);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		return new VImageData(image.data, image.width, image.height);
	}
});

registerCodec(VFormats.RGB888, {
	length(width, height) {
		return width * height * 4;
	},

	encode(image: VImageData): VEncodedImageData {
		const out = new Uint8Array(image.width * image.height * 3);
		const src = image.convert(Uint8Array);

		for ( let i=0; i*3<out.length; i++ ) {
			const s = i*4;
			const t = i*3;
			out[t] = src[s];
			out[t+1] = src[s+1];
			out[t+2] = src[s+2];
		}

		return new VEncodedImageData(out, image.width, image.height, VFormats.RGB888);
	},

	decode(src: VEncodedImageData): VImageData<Uint8Array> {
		const out = new Uint8Array(src.width * src.height * 3);

		for ( let i=0; i*3<out.length; i++ ) {
			const s = i*3;
			const t = i*4;
			out[t] = src[s];
			out[t+1] = src[s+1];
			out[t+2] = src[s+2];
			out[t+3] = 255;
		}

		return new VImageData(out, src.width, src.height);
	}
});