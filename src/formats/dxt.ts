import { VFormats } from '../core/enums.js';
import { VEncodedImageData, VImageData, getCodec, registerCodec } from '../core/image.js';
import * as DXTN from 'dxtn';

function ceil4(x: number) {
	return Math.ceil(x / 4) * 4;
}

function padForDXT(image: VImageData<Uint8Array>): VImageData<Uint8Array> {
	const width = Math.ceil(image.width / 4) * 4;
	const height = Math.ceil(image.height / 4) * 4;

	if (image.width === width && image.height === height) return image;	
	const out = new VImageData(new Uint8Array(width * height * 4), width, height);

	for (let y=0; y<height; y++) {
		for (let x=0; x<width; x++) {
			const ifrom = 4 * ((y >= image.height ? image.height-1 : y) * image.width + (x >= image.width ? image.width-1 : x));
			const ito = 4 * (y * width + x);
			out[ito] = image.data[ifrom],
			out[ito+1] = image.data[ifrom+1],
			out[ito+2] = image.data[ifrom+2],
			out[ito+3] = image.data[ifrom+3];
		}
	}

	return out;
}

// https://www.khronos.org/opengl/wiki/S3_Texture_Compression

registerCodec(VFormats.DXT1, {
	length(width, height) {
		return ceil4(width) * ceil4(height) * 0.5;
	},

	encode(image: VImageData): VEncodedImageData {
		image = padForDXT(image.convert(Uint8Array));
		const out = DXTN.compressDXT1(image.width, image.height, image.data);
		return new VEncodedImageData(out, image.width, image.height, VFormats.DXT1);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const out = DXTN.decompressDXT1(ceil4(image.width), ceil4(image.height), image.data);
		return new VImageData(out, image.width, image.height);
	},
});

registerCodec(VFormats.DXT1_ONEBITALPHA, getCodec(VFormats.DXT1));

registerCodec(VFormats.DXT3, {
	length(width, height) {
		return ceil4(width) * ceil4(height) * 1;
	},

	encode(image: VImageData): VEncodedImageData {
		image = padForDXT(image.convert(Uint8Array));
		const out = DXTN.compressDXT3(image.width, image.height, image.data);
		return new VEncodedImageData(out, image.width, image.height, VFormats.DXT3);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const out = DXTN.decompressDXT3(ceil4(image.width), ceil4(image.height), image.data);
		return new VImageData(out, image.width, image.height);
	},
});

registerCodec(VFormats.DXT5, {
	length(width, height) {
		return ceil4(width) * ceil4(height) * 1;
	},

	encode(image: VImageData): VEncodedImageData {
		image = padForDXT(image.convert(Uint8Array));
		const out = DXTN.compressDXT5(image.width, image.height, image.data);
		return new VEncodedImageData(out, image.width, image.height, VFormats.DXT5);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const out = DXTN.decompressDXT5(ceil4(image.width), ceil4(image.height), image.data);
		return new VImageData(out, image.width, image.height);
	},
});
