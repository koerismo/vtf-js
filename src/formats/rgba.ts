import { VFormats } from '../core/enums.js';
import { VCodec, VEncodedImageData, VImageData, registerCodec } from '../core/image.js';

const PixelDataTypes = {
	'Uint8': 1,
	'Uint16': 2,
	'Uint32': 4,
	'Float32': 4,
} as const;


const PixelArrayTypes = {
	'Uint8': Uint8Array,
	'Uint16': Uint16Array,
	'Uint32': Uint32Array,
	'Float32': Float32Array,
} as const;

function createGenericRGBA(format: VFormats, type: keyof typeof PixelDataTypes, red: number|null, green: number|null, blue: number|null, alpha: number|null, avg: boolean=false) {

	const SET = 'set' + type as `set${keyof typeof PixelDataTypes}`;
	const GET = 'get' + type as `get${keyof typeof PixelDataTypes}`;
	const ARR = PixelArrayTypes[type];

	const increment = +(red != null) + +(green != null) + +(blue != null) + +(alpha != null);
	const bpp = PixelDataTypes[type] * increment;

	// console.log('Creating format', VFormats[format], type, ARR, bpp);

	return {
		length(width, height) {
			return width * height * bpp;
		},

		encode(source) {
			const image = source.convert(ARR);
			const length = image.width * image.height;
			const out = new Uint8Array(length * bpp);
			const view = new DataView(out.buffer);

			for (let p=0; p<length; p++) {
				const s = p * 4;
				const t = p * bpp;
				if (red != null)	view[SET](t + red, image.data[s], true);
				if (green != null)	view[SET](t + green, image.data[s+1], true);
				if (blue != null)	view[SET](t + blue, image.data[s+2], true);
				if (alpha != null)	view[SET](t + alpha, image.data[s+3], true);
			}

			return new VEncodedImageData(out, image.width, image.height, format);
		},

		decode(source) {
			const view = new DataView(source.data.buffer);
			const length = source.width * source.height;
			const out = new ARR(length * 4);

			for (let p=0; p<length; p++) {
				const s = p * bpp;
				const t = p * 4;

				if (avg) {
					out[t] = out[t+1] = out[t+2] = view[GET](s, true);
					out[t+3] = 255;
					continue;
				}

				if (red != null)	out[t  ] = view[GET](s + red, true);
				if (green != null)	out[t+1] = view[GET](s + green, true);
				if (blue != null)	out[t+2] = view[GET](s + blue, true);
				if (alpha != null)	out[t+3] = view[GET](s + alpha, true);
				else out[t+3] = 255;
			}

			return new VImageData(out, source.width, source.height);
		},

	} as VCodec;
}

registerCodec(VFormats.RGBA8888, createGenericRGBA(VFormats.RGBA8888, 'Uint8', 0, 1, 2, 3));
registerCodec(VFormats.BGRA8888, createGenericRGBA(VFormats.BGRA8888, 'Uint8', 2, 1, 0, 3));
registerCodec(VFormats.BGRX8888, createGenericRGBA(VFormats.BGRX8888, 'Uint8', 2, 1, 0, 3));
registerCodec(VFormats.ABGR8888, createGenericRGBA(VFormats.ABGR8888, 'Uint8', 3, 2, 1, 0));
registerCodec(VFormats.ARGB8888, createGenericRGBA(VFormats.ARGB8888, 'Uint8', 1, 2, 3, 0));

registerCodec(VFormats.RGB888, createGenericRGBA(VFormats.RGB888, 'Uint8', 0, 1, 2, null));
registerCodec(VFormats.BGR888, createGenericRGBA(VFormats.BGR888, 'Uint8', 2, 1, 0, null));

registerCodec(VFormats.UV88, createGenericRGBA(VFormats.UV88, 'Uint8', 0, 1, null, null));

registerCodec(VFormats.A8, createGenericRGBA(VFormats.A8, 'Uint8', null, null, null, 0));
registerCodec(VFormats.I8, createGenericRGBA(VFormats.I8, 'Uint8', 0, null, null, null, true));
registerCodec(VFormats.P8, createGenericRGBA(VFormats.P8, 'Uint8', 0, null, null, null, true));

registerCodec(VFormats.R32F, createGenericRGBA(VFormats.R32F, 'Float32', 0, null, null, null));
registerCodec(VFormats.RGB323232F, createGenericRGBA(VFormats.RGB323232F, 'Float32', 0, 4, 8, null));
registerCodec(VFormats.RGBA16161616, createGenericRGBA(VFormats.RGBA16161616, 'Uint16', 0, 2, 4, 6));
registerCodec(VFormats.RGBA32323232F, createGenericRGBA(VFormats.RGBA32323232F, 'Float32', 0, 4, 8, 12));
