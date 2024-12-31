import { VFormats } from '../core/enums.js';
import { VEncodedImageData, VImageData, getCodec, registerCodec } from '../core/image.js';
import * as DXT from 'dxt-js';

function ceil4(x: number) {
	return Math.ceil(x / 4) * 4;
}

function padImage(image: VImageData<Uint8Array>): VImageData<Uint8Array> {
	const width = Math.ceil(image.width / 4) * 4;
	const height = Math.ceil(image.height / 4) * 4;

	if (image.width === width && image.height === height) return image;	
	const out = new VImageData(new Uint8Array(width * height * 4), width, height);

	for (let y=0; y<height; y++) {
		for (let x=0; x<width; x++) {
			const ifrom = 4 * ((y >= image.height ? image.height-1 : y) * image.width + (x >= image.width ? image.width-1 : x));
			const ito = 4 * (y * width + x);
			out.data[ito] = image.data[ifrom],
			out.data[ito+1] = image.data[ifrom+1],
			out.data[ito+2] = image.data[ifrom+2],
			out.data[ito+3] = image.data[ifrom+3];
		}
	}

	return out;
}

function cropImage(image: VImageData<Uint8Array>): VImageData<Uint8Array> {
	const width = Math.ceil(image.width / 4) * 4;
	const height = Math.ceil(image.height / 4) * 4;

	if (image.width === width && image.height === height) return image;	
	const out = new VImageData(new Uint8Array(image.width * image.height * 4), image.width, image.height);

	for (let y=0; y<image.height; y++) {
		for (let x=0; x<image.width; x++) {
			const ito = 4 * (y * image.width + x);
			const ifrom = 4 * (y * width + x);
			out.data[ito] = image.data[ifrom],
			out.data[ito+1] = image.data[ifrom+1],
			out.data[ito+2] = image.data[ifrom+2],
			out.data[ito+3] = image.data[ifrom+3];
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
		const padded = padImage(image.convert(Uint8Array));
		const out = DXT.compress(padded.data, padded.width, padded.height, DXT.flags.DXT1 | DXT.flags.ColourClusterFit);
		return new VEncodedImageData(out, image.width, image.height, VFormats.DXT1);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const out = DXT.decompress(image.data, ceil4(image.width), ceil4(image.height), DXT.flags.DXT1);
		return cropImage(new VImageData(out, image.width, image.height));
	},
});

registerCodec(VFormats.DXT1_ONEBITALPHA, getCodec(VFormats.DXT1));

registerCodec(VFormats.DXT3, {
	length(width, height) {
		return ceil4(width) * ceil4(height) * 1;
	},

	encode(image: VImageData): VEncodedImageData {
		const padded = padImage(image.convert(Uint8Array));
		const out = DXT.compress(padded.data, padded.width, padded.height, DXT.flags.DXT3 | DXT.flags.ColourClusterFit);
		return new VEncodedImageData(out, image.width, image.height, VFormats.DXT3);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const out = DXT.decompress(image.data, ceil4(image.width), ceil4(image.height), DXT.flags.DXT3);
		return cropImage(new VImageData(out, image.width, image.height));
	},
});

registerCodec(VFormats.DXT5, {
	length(width, height) {
		return ceil4(width) * ceil4(height) * 1;
	},

	encode(image: VImageData): VEncodedImageData {
		const padded = padImage(image.convert(Uint8Array));
		const out = DXT.compress(padded.data, padded.width, padded.height, DXT.flags.DXT5 | DXT.flags.ColourClusterFit);
		return new VEncodedImageData(out, image.width, image.height, VFormats.DXT5);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const out = DXT.decompress(image.data, ceil4(image.width), ceil4(image.height), DXT.flags.DXT5);
		return cropImage(new VImageData(out, image.width, image.height));
	},
});
