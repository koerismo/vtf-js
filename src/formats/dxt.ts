import { VFormats, VFlags } from '../core/enums.js';
import { VEncodedImageData, VImageData, getCodec, registerCodec } from '../core/image.js';
// import { CompressImage, DecompressImage, DxtFlags } from 'libsquish-js';
import { decompressImage } from './dxt-decompress.js';
import { ceil4 } from '../core/utils.js';

const ERROR_NOT_SUPPORTED = Error('vtf-js: DXT compression is unsupported by the default backend!');

export const enum DxtFlags {
	DXT1 = 0x1,
	DXT3 = 0x2,
	DXT5 = 0x4,

	OneBitAlpha = 0x100,
	WeightByAlpha = 0x200,
	MetricPerceptual = 0x400,
}

// https://www.khronos.org/opengl/wiki/S3_Texture_Compression

registerCodec(VFormats.DXT1, {
	alpha: VFlags.None,

	length(width, height) {
		return ceil4(width) * ceil4(height) * 0.5;
	},

	encode(image: VImageData): VEncodedImageData {
		throw ERROR_NOT_SUPPORTED;
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		return decompressImage(image, DxtFlags.DXT1 | DxtFlags.OneBitAlpha);
	},
});

registerCodec(VFormats.DXT1_ONEBITALPHA, {
	...getCodec(VFormats.DXT1),
	alpha: VFlags.OneBitAlpha,
});

registerCodec(VFormats.DXT3, {
	alpha: VFlags.EightBitAlpha,

	length(width, height) {
		return ceil4(width) * ceil4(height);
	},

	encode(image: VImageData): VEncodedImageData {
		throw ERROR_NOT_SUPPORTED;
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		return decompressImage(image, DxtFlags.DXT3);
	},
});

registerCodec(VFormats.DXT5, {
	alpha: VFlags.EightBitAlpha,

	length(width, height) {
		return ceil4(width) * ceil4(height);
	},

	encode(image: VImageData): VEncodedImageData {
		throw ERROR_NOT_SUPPORTED;
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		return decompressImage(image, DxtFlags.DXT5);
	},
});
