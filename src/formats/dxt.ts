import { VFormats } from '../core/enums.js';
import { VCodec, VEncodedImageData, VImageData, getCodec, registerCodec } from '../core/image.js';
import { length, encode, decode } from '../../wasm/pkg/vtf_js.js';

const SquishFormatMap = {
	[VFormats.DXT1]: 0,
	[VFormats.DXT3]: 1,
	[VFormats.DXT5]: 2,
} as const;

console.log('LEN', length(0, 16, 16));

// https://www.khronos.org/opengl/wiki/S3_Texture_Compression

function makeSquishFormat(format: VFormats): VCodec {
	const squish_format: number = SquishFormatMap[format];
	return {
		length(width, height) {
			console.log(squish_format, length(squish_format, width, height));
			return length(squish_format, width, height);
		},
	
		encode(image: VImageData): VEncodedImageData {
			const out = encode(squish_format, image.width, image.height, image.convert(Uint8Array).data);
			console.log(out);
			return new VEncodedImageData(out, image.width, image.height, format);
		},
	
		decode(image: VEncodedImageData): VImageData<Uint8Array> {
			const out = decode(squish_format, image.width, image.height, image.data);
			console.log(out);
			return new VImageData(out, image.width, image.height);
		},
	};
}

registerCodec(VFormats.DXT1, makeSquishFormat(VFormats.DXT1));
registerCodec(VFormats.DXT3, makeSquishFormat(VFormats.DXT3));
registerCodec(VFormats.DXT5, makeSquishFormat(VFormats.DXT5));

registerCodec(VFormats.DXT1_ONEBITALPHA, getCodec(VFormats.DXT1));

