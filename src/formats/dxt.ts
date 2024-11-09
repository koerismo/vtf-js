import { VFormats } from '../core/enums.js';
import { VEncodedImageData, VImageData, getCodec, registerCodec } from '../core/image.js';
import { decompressColorBlock, decompressAlphaBlock_DXT5, CompressionFlags, compressColorBlock } from './dxt.core.js';

const BLOCK_SIZE_DXT1 = 8;
const BLOCK_SIZE_DXT5 = 16;


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
		const out = new Uint8Array(ceil4(image.width) * ceil4(image.height) * 0.5);
		const outView = new DataView(out.buffer);
		const srcArray = image.convert(Float32Array).data;

		const blocksHeight = Math.ceil(image.height / 4);
		const blocksWidth = Math.ceil(image.width / 4);
		const width = image.width;

		for (let y=0; y<blocksHeight; y++) {
			for (let x=0; x<blocksWidth; x++) {
				const srcOffset = (y*width + x) * 16;
				const outOffset = (y*blocksWidth+x) * BLOCK_SIZE_DXT1;
				compressColorBlock(srcArray, srcOffset, outView, outOffset, width, CompressionFlags.DXT1 | CompressionFlags.DXT1_Alpha);
			}
		}

		return new VEncodedImageData(out, image.width, image.height, VFormats.DXT1);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const out = new Uint8Array(ceil4(image.width) * ceil4(image.height) * 4);
		const outView = new DataView(out.buffer);
		const srcView = new DataView(image.data.buffer);

		const blocksHeight = Math.ceil(image.height / 4);
		const blocksWidth = Math.ceil(image.width / 4);
		const width = image.width;

		for (let y=0; y<blocksHeight; y++) {
			for (let x=0; x<blocksWidth; x++) {
				const srcOffset = (y*blocksWidth+x) * BLOCK_SIZE_DXT1;
				const outOffset = (y*width + x) * 16;
				decompressColorBlock(srcView, srcOffset, outView, outOffset, width, CompressionFlags.DXT1_Alpha);
			}
		}

		return new VImageData(out, image.width, image.height);
	},
});

registerCodec(VFormats.DXT1_ONEBITALPHA, getCodec(VFormats.DXT1));

registerCodec(VFormats.DXT5, {
	length(width, height) {
		return ceil4(width) * ceil4(height) * 1;
	},

	encode(image: VImageData): VEncodedImageData {
		throw Error('Not implemented!');
		// const padded = padImage(image.convert(Uint8Array));
		// const out = DXTN.compressDXT5(padded.width, padded.height, padded.data);
		// return new VEncodedImageData(out, image.width, image.height, VFormats.DXT5);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const out = new Uint8Array(ceil4(image.width) * ceil4(image.height) * 8);
		const outView = new DataView(out.buffer);
		const srcView = new DataView(image.data.buffer);

		const blocksHeight = Math.ceil(image.height / 4);
		const blocksWidth = Math.ceil(image.width / 4);
		const width = image.width;

		for (let y=0; y<blocksHeight; y++) {
			for (let x=0; x<blocksWidth; x++) {
				const srcOffset = (y*blocksWidth+x) * BLOCK_SIZE_DXT5;
				const outOffset = (y*width + x) * 16;
				decompressColorBlock(srcView, srcOffset + 8, outView, outOffset, width, CompressionFlags.DXT5);
				decompressAlphaBlock_DXT5(srcView, srcOffset, outView, outOffset, width, CompressionFlags.DXT5);
			}
		}

		return new VImageData(out, image.width, image.height);
	},
});
