import { VFormats } from '../core/enums.js';
import { VEncodedImageData, VImageData, getCodec, registerCodec } from '../core/image.js';
import { flags, compress, decompress, GetStorageRequirements } from 'dxt-js';

// https://www.khronos.org/opengl/wiki/S3_Texture_Compression

registerCodec(VFormats.DXT1, {
	length(width, height) {
		return GetStorageRequirements(width, height, flags.DXT1);
	},

	encode(image: VImageData): VEncodedImageData {
		const out = compress(image.convert(Uint8Array).data, image.width, image.height, flags.DXT1);
		return new VEncodedImageData(out, image.width, image.height, VFormats.DXT1);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const out = decompress(image.data, image.width, image.height, flags.DXT1);
		return new VImageData(out, image.width, image.height);
	},
});

registerCodec(VFormats.DXT1_ONEBITALPHA, getCodec(VFormats.DXT1));

registerCodec(VFormats.DXT3, {
	length(width, height) {
		return GetStorageRequirements(width, height, flags.DXT3);
	},

	encode(image: VImageData): VEncodedImageData {
		const out = compress(image.convert(Uint8Array).data, image.width, image.height, flags.DXT3);
		return new VEncodedImageData(out, image.width, image.height, VFormats.DXT1);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const out = decompress(image.data, image.width, image.height, flags.DXT3);
		return new VImageData(out, image.width, image.height);
	},
});

registerCodec(VFormats.DXT5, {
	length(width, height) {
		return GetStorageRequirements(width, height, flags.DXT5);
	},

	encode(image: VImageData): VEncodedImageData {
		const out = compress(image.convert(Uint8Array).data, image.width, image.height, flags.DXT5);
		return new VEncodedImageData(out, image.width, image.height, VFormats.DXT1);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const out = decompress(image.data, image.width, image.height, flags.DXT5);
		return new VImageData(out, image.width, image.height);
	},
});
