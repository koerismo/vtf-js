import { CompressImage, DecompressImage, DxtFlags } from 'libsquish-js';
import { registerCodec, VImageData, VEncodedImageData, getCodec } from '../core/image.js';
import { VFormats } from '../core/enums.js';
import { ceil4 } from '../core/utils.js';

function padImage(img: VImageData<Uint8Array>): VImageData<Uint8Array> {
	const width = ceil4(img.width);
	const height = ceil4(img.height);
	const src_u32 = new Uint32Array(img.data.buffer);
	const out_u32 = new Uint32Array(width * height);
	for (let y=0; y<height; y++) {
		if (y >= img.height) continue;
		for (let x=0; x<width; x++) {
			if (x >= img.width) continue;
			out_u32[y*width + x] = src_u32[y*img.width + x];
		}
	}
	return new VImageData(new Uint8Array(out_u32.buffer), img.width, img.height);
}

function cropImage(img: VImageData<Uint8Array>): VImageData<Uint8Array> {
	const width = ceil4(img.width);
	const src_u32 = new Uint32Array(img.data.buffer);
	const out_u32 = new Uint32Array(img.width * img.height);
	for (let y=0; y<img.height; y++) {
		for (let x=0; x<img.width; x++) {
			out_u32[y*img.width + x] = src_u32[y*width + x];
		}
	}
	return new VImageData(new Uint8Array(out_u32.buffer), img.width, img.height);
}

registerCodec(VFormats.DXT1, {
	length(width, height) {
		return ceil4(width) * ceil4(height) * 0.5;
	},

	encode(image: VImageData): VEncodedImageData {
		const padded = padImage(image.convert(Uint8Array));
		const input = { data: padded.data, width: ceil4(padded.width), height: ceil4(padded.height) };
		const encoded = CompressImage(input, DxtFlags.kDxt1);
		return new VEncodedImageData(encoded, image.width, image.height, VFormats.DXT1);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const input = { data: image.data, width: ceil4(image.width), height: ceil4(image.height) };
		const decoded = DecompressImage(input, DxtFlags.kDxt1);
		const cropped = cropImage(new VImageData(decoded, image.width, image.height));
		return cropped;
	},
});

registerCodec(VFormats.DXT1_ONEBITALPHA, getCodec(VFormats.DXT1));

registerCodec(VFormats.DXT3, {
	length(width, height) {
		return ceil4(width) * ceil4(height);
	},

	encode(image: VImageData): VEncodedImageData {
		const padded = padImage(image.convert(Uint8Array));
		const input = { data: padded.data, width: ceil4(padded.width), height: ceil4(padded.height) };
		const encoded = CompressImage(input, DxtFlags.kDxt3);
		return new VEncodedImageData(encoded, image.width, image.height, VFormats.DXT3);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const input = { data: image.data, width: ceil4(image.width), height: ceil4(image.height) };
		const decoded = DecompressImage(input, DxtFlags.kDxt3);
		const cropped = cropImage(new VImageData(decoded, image.width, image.height));
		return cropped;
	},
});

registerCodec(VFormats.DXT5, {
	length(width, height) {
		return ceil4(width) * ceil4(height);
	},

	encode(image: VImageData): VEncodedImageData {
		const padded = padImage(image.convert(Uint8Array));
		const input = { data: padded.data, width: ceil4(padded.width), height: ceil4(padded.height) };
		const encoded = CompressImage(input, DxtFlags.kDxt5);
		return new VEncodedImageData(encoded, image.width, image.height, VFormats.DXT5);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const input = { data: image.data, width: ceil4(image.width), height: ceil4(image.height) };
		const decoded = DecompressImage(input, DxtFlags.kDxt5);
		const cropped = cropImage(new VImageData(decoded, image.width, image.height));
		return cropped;
	},
});
