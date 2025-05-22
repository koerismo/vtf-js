import { VFormats } from '../core/enums.js';
import { VEncodedImageData, VImageData, getCodec, registerCodec } from '../core/image.js';
import { CompressImage, DecompressImage, DxtFlags } from 'libsquish-js';

function ceil4(x: number) {
	return Math.ceil(x / 4) * 4;
}

function getBlockAt(image: VImageData<Uint8Array>, dest: Uint8Array, bx: number, by: number) {
	const src = image.data;
	
	for (let y=0; y<4; y++) {
		if (y+by >= image.height) break;

		for (let x=0; x<4; x++) {
			if (y+by >= image.width) break;

			const src_i = ((y+by) * image.width + x+bx) * 4;
			const dest_i = y * 4 + x;

			dest[dest_i] = src[src_i];
			dest[dest_i+1] = src[src_i+1];
			dest[dest_i+2] = src[src_i+2];
			dest[dest_i+3] = src[src_i+3];
		}
	}
}

function setBlockAt(image: VImageData<Uint8Array>, src: Uint8Array, bx: number, by: number) {
	const dest = image.data;

	for (let y=0; y<4; y++) {
		if (y+by >= image.height) break;

		for (let x=0; x<4; x++) {
			if (y+by >= image.width) break;

			const dest_i = ((y+by) * image.width + x+bx) * 4;
			const src_i = y * 4 + x;

			dest[dest_i] = src[src_i];
			dest[dest_i+1] = src[src_i+1];
			dest[dest_i+2] = src[src_i+2];
			dest[dest_i+3] = src[src_i+3];
		}
	}
}

// https://www.khronos.org/opengl/wiki/S3_Texture_Compression

registerCodec(VFormats.DXT1, {
	length(width, height) {
		return ceil4(width) * ceil4(height) * 0.5;
	},

	encode(image: VImageData): VEncodedImageData {
		
		
		const padded = padImage(image.convert(Uint8Array));
		const out = CompressImage(padded, DxtFlags.kDxt1 | ENCODE_FLAGS);
		return new VEncodedImageData(out, image.width, image.height, VFormats.DXT1);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const input = { data: image.data, width: ceil4(image.width), height: ceil4(image.height) };
		const out = DecompressImage(input, DxtFlags.kDxt1);
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
		const out = CompressImage(padded, DxtFlags.kDxt3 | ENCODE_FLAGS);
		return new VEncodedImageData(out, image.width, image.height, VFormats.DXT3);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const input = { data: image.data, width: ceil4(image.width), height: ceil4(image.height) };
		const out = DecompressImage(input, DxtFlags.kDxt3);
		return cropImage(new VImageData(out, image.width, image.height));
	},
});

registerCodec(VFormats.DXT5, {
	length(width, height) {
		return ceil4(width) * ceil4(height) * 1;
	},

	encode(image: VImageData): VEncodedImageData {
		const padded = padImage(image.convert(Uint8Array));
		const out = CompressImage(padded, DxtFlags.kDxt5 | ENCODE_FLAGS);
		return new VEncodedImageData(out, image.width, image.height, VFormats.DXT5);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const input = { data: image.data, width: ceil4(image.width), height: ceil4(image.height) };
		const out = DecompressImage(input, DxtFlags.kDxt5);
		return cropImage(new VImageData(out, image.width, image.height));
	},
});
