import { VFormats } from '../core/enums.js';
import { VCodec, VEncodedImageData, VImageData, VPixelArrayConstructor, registerCodec } from '../core/image.js';

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

registerCodec(VFormats.BGRA8888, {
	length(width, height) {
		return width * height * 4;
	},

	encode(image: VImageData): VEncodedImageData {
		const pixels = image.width * image.height;
		const out = new Uint8Array(pixels * 4);
		const src = image.convert(Uint8Array).data;

		for ( let i=0; i<pixels; i++ ) {
			const s = i*4;
			out[s]   = src[s+2];
			out[s+1] = src[s+1];
			out[s+2] = src[s];
			out[s+3] = src[s+3]
		}

		return new VEncodedImageData(out, image.width, image.height, VFormats.BGRA8888);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const pixels = image.width * image.height;
		const out = new Uint8Array(pixels * 4);
		const src = image.data;

		for ( let i=0; i<pixels; i++ ) {
			const s = i*4;
			out[s]   = src[s+2];
			out[s+1] = src[s+1];
			out[s+2] = src[s];
			out[s+3] = src[s+3];
		}

		return new VImageData(out, image.width, image.height);
	}
});

registerCodec(VFormats.RGB888, {
	length(width, height) {
		return width * height * 3;
	},

	encode(image: VImageData): VEncodedImageData {
		const pixels = image.width * image.height;
		const out = new Uint8Array(pixels * 3);
		const src = image.convert(Uint8Array).data;

		for ( let i=0; i<pixels; i++ ) {
			const s = i*4;
			const t = i*3;
			out[t] = src[s];
			out[t+1] = src[s+1];
			out[t+2] = src[s+2];
		}

		return new VEncodedImageData(out, image.width, image.height, VFormats.RGB888);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const pixels = image.width * image.height;
		const out = new Uint8Array(pixels * 4);
		const src = image.data;

		for ( let i=0; i<pixels; i++ ) {
			const s = i*3;
			const t = i*4;
			out[t] = src[s];
			out[t+1] = src[s+1];
			out[t+2] = src[s+2];
			out[t+3] = 255;
		}

		return new VImageData(out, image.width, image.height);
	}
});

registerCodec(VFormats.BGR888, {
	length(width, height) {
		return width * height * 3;
	},

	encode(image: VImageData): VEncodedImageData {
		const pixels = image.width * image.height;
		const out = new Uint8Array(pixels * 3);
		const src = image.convert(Uint8Array).data;

		for ( let i=0; i<pixels; i++ ) {
			const s = i*4;
			const t = i*3;
			out[t] = src[s+2];
			out[t+1] = src[s+1];
			out[t+2] = src[s];
		}

		return new VEncodedImageData(out, image.width, image.height, VFormats.BGR888);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const pixels = image.width * image.height;
		const out = new Uint8Array(pixels * 4);
		const src = image.data;

		for ( let i=0; i<pixels; i++ ) {
			const s = i*3;
			const t = i*4;
			out[t] = src[s+2];
			out[t+1] = src[s+1];
			out[t+2] = src[s];
			out[t+3] = 255;
		}

		return new VImageData(out, image.width, image.height);
	}
});

function single_channel_codec(fmt_id: VFormats, arrtype: VPixelArrayConstructor=Uint8Array): VCodec {
	return {
		length(width: number, height: number) {
			return width * height * arrtype.BYTES_PER_ELEMENT / 8;
		},

		encode(image: VImageData): VEncodedImageData {
			const out = new Uint8Array(image.width * image.height);
			const src = image.data;

			for ( let i=0; i<out.length; i++) {
				out[i] = src[i*4];
			}

			return new VEncodedImageData(out, image.width, image.height, fmt_id);
		},

		decode(image: VEncodedImageData): VImageData {
			const pixels = image.width * image.height;
			const out = new arrtype(pixels * 4);
			const src = image.data;

			for ( let i=0; i<pixels; i++ ) {
				const t = i*4;
				out[t] = src[i];
				out[t+1] = src[i];
				out[t+2] = src[i];
				out[t+3] = 255;
			}

			return new VImageData(out, image.width, image.height);
		},
	}
}

registerCodec(VFormats.I8, single_channel_codec(VFormats.I8));
registerCodec(VFormats.A8, single_channel_codec(VFormats.A8));
registerCodec(VFormats.P8, single_channel_codec(VFormats.P8));
registerCodec(VFormats.R32F, single_channel_codec(VFormats.R32F, Float32Array));
registerCodec(VFormats.RGBA16161616, single_channel_codec(VFormats.RGBA16161616, Uint16Array));
