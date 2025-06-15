import { VEncodedImageData, VImageData } from '../core/image.js';
import { DxtFlags } from './dxt-compress.js';

// let p_totalTime = 0.0;
// let p_colorTime = 0.0;
// let p_alpha3Time = 0.0;
// let p_alpha5Time = 0.0;

function decode565(x1: number, x2: number, out: Uint8Array, o: number): number {
	const v = x1 | (x2 << 8);

	const r = (v >> 11) & 0x1f;
	const g = (v >> 5) & 0x3f;
	const b = v & 0x1f;

	out[o]   = (r << 3) | (r >> 2);
	out[o+1] = (g << 2) | (g >> 4);
	out[o+2] = (b << 3) | (b >> 2);
	out[o+3] = 255;

	return v;
}

function decompressColor(block: Uint8Array, flags: number, out_rgba: Uint8Array) {
	const codes = new Uint8Array(16);

	const a = decode565(block[0], block[1], codes, 0);
	const b = decode565(block[2], block[3], codes, 4);

	const isDxt1 = (flags & DxtFlags.DXT1) !== 0;
	const oneBitAlpha = (flags & DxtFlags.OneBitAlpha) !== 0;

	// Mode A
	if (isDxt1 && a <= b) {
		codes[8]  = (codes[0] + codes[4]) / 2;
		codes[9]  = (codes[1] + codes[5]) / 2;
		codes[10] = (codes[2] + codes[6]) / 2;
		codes[11] = 255;
		codes[15] = oneBitAlpha ? 0 : 255;
	}
	// Mode B
	else {
		codes[8]  = (codes[0]*2 + codes[4]) / 3;
		codes[9]  = (codes[1]*2 + codes[5]) / 3;
		codes[10] = (codes[2]*2 + codes[6]) / 3;
		codes[12] = (codes[0] + codes[4]*2) / 3;
		codes[13] = (codes[1] + codes[5]*2) / 3;
		codes[14] = (codes[2] + codes[6]*2) / 3;
		codes[11] = codes[15] = 255;
	}
	
	// Unpack indices and choose from palette
	let p = 0;
	for (let byte=4; byte<8; byte++) {
		const bits = block[byte];
		for (let i=0; i<4; i++, p+=4) {
			const idx = (bits >> (i << 1)) & 3;
			out_rgba[p]   = codes[idx];
			out_rgba[p+1] = codes[idx+1];
			out_rgba[p+2] = codes[idx+2];
			out_rgba[p+3] = codes[idx+3];
		}
	}
}

function decompressDxt3Alpha(block: Uint8Array, out_rgba: Uint8Array) {
	for (let i=0, c=0; i<8; i++, c+=8) {
		const b = block[i];
		const a0 = b & 0x0f; 
		const a1 = b & 0xf0;  
		out_rgba[c+3] = a0 | a0 << 4;
		out_rgba[c+7] = a1 | a1 >> 4;
	}
}

function decompressDxt5Alpha(block: Uint8Array, out_rgba: Uint8Array) {
	const codes = new Uint8Array(8);
	const a = codes[0] = block[0];
	const b = codes[1] = block[1];

	// 5-blend mode
	if (a <= b) {
		codes[2] = (a*4 + b  ) / 5;
		codes[3] = (a*3 + b*2) / 5;
		codes[4] = (a*2 + b*3) / 5;
		codes[5] = (a   + b*4) / 5;
		codes[6] = 0;
		codes[7] = 255;
	}
	else {
		codes[2] = (a*6 + b  ) / 7;
		codes[3] = (a*5 + b*2) / 7;
		codes[3] = (a*4 + b*3) / 7;
		codes[3] = (a*3 + b*4) / 7;
		codes[4] = (a*2 + b*5) / 7;
		codes[5] = (a   + b*6) / 7;
	}

	// Unpack indices and choose from palette
	let p = 0;
	for (let byte=2; byte<8; byte+=3) {
		const bits = block[byte] | (block[byte+1] << 8) | (block[byte+2] << 16);
		for (let i=0; i<24; i+=3, p+=4) {
			const idx = (bits >> i) & 7;
			out_rgba[p+3] = codes[idx];
		}
	}
}

export function decompressBlock(block: Uint8Array, flags: number, out_rgba: Uint8Array) {
	decompressColor(block, flags, out_rgba);
	if (flags & DxtFlags.DXT5) {
		decompressDxt5Alpha(block.subarray(8), out_rgba);
	}
	else if (flags & DxtFlags.DXT3) {
		decompressDxt3Alpha(block.subarray(8), out_rgba);
	}
	return out_rgba;
}

export function decompressImage(image: VEncodedImageData, flags: number) {
	const data = image.data;
	const out = new Uint8Array(image.width * image.height * 4);

	const hasTwoBlocks = (flags & DxtFlags.DXT3 || flags & DxtFlags.DXT5) !== 0;
	const blockSize = hasTwoBlocks ? 16 : 8;
	const blockDest = new Uint8Array(64);

	let blockIdx = 0;
	for (let y=0; y<image.height; y+=4) {
		for (let x=0; x<image.width; x+=4) {
			
			// Decompress block
			const blockSrc = data.subarray(blockIdx, blockIdx+blockSize);
			decompressBlock(blockSrc, flags, blockDest);

			// Copy decompressed block to image
			for (let by=0; by<4; by++) {
				if (y + by >= image.height) break;
				for (let bx=0; bx<4; bx++) {
					if (x + bx >= image.width) break;
					const i_dst = ((y+by) * image.width + x+bx) * 4;
					const i_src = (by * 4 + bx) * 4;

					out[i_dst]   = blockDest[i_src];
					out[i_dst+1] = blockDest[i_src+1];
					out[i_dst+2] = blockDest[i_src+2];
					out[i_dst+3] = blockDest[i_src+3];
				}
			}

			blockIdx += blockSize;

		} // x in image.width
	} // y in image.height

	return new VImageData(out, image.width, image.height);
}

// export function dumpPerfStats() {
// 	return {
// 		p_totalTime,
// 		p_colorTime,
// 		p_alpha3Time,
// 		p_alpha5Time,
// 	};
// }
