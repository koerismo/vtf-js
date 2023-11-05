import { VFormats } from '../core/enums.js';
import { VEncodedImageData, VImageData, registerCodec } from '../core/image.js';
import { DataBuffer } from '../util/buffer.js';

// https://www.khronos.org/opengl/wiki/S3_Texture_Compression

import * as V from '../util/vec.js';
import * as D from '../util/vec.dxt.js';

function dxt1Length(w: number, h: number) {
	return Math.ceil(w / 4) * Math.ceil(h / 4) * 8;
}

function dxt5Length(w: number, h: number) {
	return Math.ceil(w / 4) * Math.ceil(h / 4) * 16;
}

/* function getImageBlock(image: VImageData, x: number, y: number): Uint8Array {
	const src = image.data;
	const out = new Uint8Array(16 * 4);
	const newline = image.width * 4;
	const start = x + y * newline;

	for ( let i=0; i<4; i++ ) {
		if (y+i >= image.height) continue;
		const i16 = i*16;
		const iN = i*newline;
		for ( let j=0; j<4; j++ ) {
			if (x+j >= image.width) continue;
			const out_ind = j*4 + i16;
			const src_ind = start + j*4 + iN;
			out[out_ind]     = src[src_ind];
			out[out_ind + 1] = src[src_ind + 1];
			out[out_ind + 2] = src[src_ind + 2];
			out[out_ind + 3] = src[src_ind + 3];
		}
	}

	return out;
}

function blockifyImage(image: VImageData, callback: (data: Uint8Array) => void) {
	for (let y=0; y<image.height; y+=4) {
		for (let x=0; x<image.width; x+=4) {
			callback(getImageBlock(image, x, y));
		}
	}
}
 */

const TIMES = {
	comparison: 0,
	lerping: 0,
}

registerCodec(VFormats.DXT1, {
	length: dxt1Length,

	encode(image: VImageData): VEncodedImageData {
		const src = image.convert(Uint8Array).data;
		const target = new DataBuffer(dxt1Length(image.width, image.height));
		target.set_endian(true);

		const width = image.width;
		const height = image.height;
		const ALPHA_TRESHOLD = 128;

		// For every 4x4 block
		for (let y=0; y<height; y+=4) {
		for (let x=0; x<width; x+=4) {

			const TIME_BLOCK_START = performance.now();

			const block_index = x + y*width;

			let color_a = D.fromU8(src, block_index * 4);
			let color_b = D.fromU8(src, block_index * 4);
			let best_diff = 0;
			let has_alpha = false;

			// Compare combinations of pixel pairs in the block to find the most contrasting pair
			for (let ay=0; ay<4; ay++) {
				if (y+ay > height) continue;
			for (let ax=0; ax<4; ax++) {
				if (x+ax > width) continue;
				const a_index = (block_index + ax + ay*width) * 4;

				if (src[a_index+3] <= ALPHA_TRESHOLD) {
					has_alpha = true;
					continue;
				}

				for (let by=ay; by<4; by++) {
					if (y+by > height) continue;
				for (let bx=by; bx<4; bx++) {
					if (x+bx > width) continue;
					const b_index = (block_index + bx + by*width) * 4;

					if (src[b_index+3] <= ALPHA_TRESHOLD) {
						continue;
					}

					const new_diff =
						(src[b_index]   - src[a_index]  )**2 + // R
						(src[b_index+1] - src[a_index+1])**2 + // G
						(src[b_index+2] - src[a_index+2])**2;  // B

					if (new_diff > best_diff) {
						best_diff = new_diff;
						V.copy(color_a, src, a_index);
						V.copy(color_b, src, b_index);
					}

				} // for (let by=0; by<height; by++)
				} // for (let bx=0; bx<width; bx++)

			} // for (let ay=0; ay<height; ay++)
			} // for (let ax=0; ax<width; ax++)

			const TIME_COLORS_CHOSEN = performance.now();

			// Write colors to output
			let A = D.encode565(color_a);
			let B = D.encode565(color_b);

			// Reorder to make the order of A and B reflect the alpha state.
			if (A === B) {
				has_alpha = true;
			}
			else if (has_alpha !== (A <= B)) {
				const _A = A, _color_a = color_a;
				A = B, B = _A;
				color_a = color_b, color_b = _color_a;
			}

			target.write_u16(A);
			target.write_u16(B);

			const TIME_INDEXING_START = performance.now();

			// Calculate indices
			const indices = new Uint8Array(16);

			for ( let iy=0; iy<4; iy++ ) {
				if (y+iy > height) continue;
			for ( let ix=0; ix<4; ix++ ) {
				if (x+ix > width) continue;
				const s = (block_index + ix + iy*width) * 4;
				const i = (ix + iy*4);

				const color = D.fromU8(src, s);
				const fit = V.fit(color, color_a, color_b);

				if (has_alpha) {
					if (src[s+3] > ALPHA_TRESHOLD) {
						const rounded = Math.round(fit*2);
						let remapped = 0;
						if      (rounded === 1) remapped = 2;
						else if (rounded === 2) remapped = 1;
						indices[i] = remapped;
					}
					else {
						indices[i] = 3;
					}
				}
				else {
					// set_blend_index(ix, iy, Math.round(fit*3))
					const blend_index = Math.round(fit*3);
					let remapped = 0;
					if      (blend_index === 1) remapped = 2;
					else if (blend_index === 2) remapped = 3;
					else if (blend_index === 3) remapped = 1;
					indices[i] = remapped;
				}

			}
			}

			const TIME_INDEXING_END = performance.now();

			// Write indices
			for ( let i=0; i<16; i+=4 ) {
				target.write_u8(
					indices[i  ] << 0 |
					indices[i+1] << 2 |
					indices[i+2] << 4 |
					indices[i+3] << 6
				);
			}

			const TIME_BLOCK_END = performance.now();
			TIMES.comparison += TIME_COLORS_CHOSEN - TIME_BLOCK_START;
			TIMES.lerping += TIME_INDEXING_END - TIME_INDEXING_START;

		} // for (let y=0; y<height; y+=4)
		} // for (let x=0; x<width; x+=4)

		const TOTAL_TIME = TIMES.comparison + TIMES.lerping;
		console.log('Comparison:', TIMES.comparison / TOTAL_TIME * 100, '%\nLerping:', TIMES.lerping / TOTAL_TIME * 100, '%\nTotal:', TOTAL_TIME, 'ms');

		return new VEncodedImageData(target, image.width, image.height, VFormats.DXT1);
	},

	decode(image: VEncodedImageData): VImageData<Uint8Array> {
		const src = new DataBuffer(image.data);
		src.set_endian(true);

		const target = new Uint8Array(image.width * image.height * 4);
		const view = new DataView(target.buffer);

		const width = image.width;
		const height = image.height;

		for (let y=0; y<height; y+=4) {
		for (let x=0; x<width; x+=4) {

			const A = src.read_u16();
			const B = src.read_u16();
			const alpha_enabled = (A <= B);
			const color_a = D.decode565(A);
			const color_b = D.decode565(B);

			const indices_packed = src.read_u32();
			const get_blend_index = (x: number, y: number) => {
				return indices_packed >> (2*x + 8*y) & 0b11;
			}

			for ( let iy=0; iy<4; iy++ ) {
				if (y+iy > image.height) continue;
			for ( let ix=0; ix<4; ix++ ) {
				if (x+ix > image.width) continue;
				const blend_index = get_blend_index(ix, iy);
				let color: V.Vec3;
				let alpha = 255;

				if (alpha_enabled) {
					if      (blend_index === 1) color = color_b;
					else if (blend_index === 2) color = D.blend(0.5, color_a, color_b);
					else if (blend_index === 3) color = V.create(0, 0, 0), alpha = 0;
					else                        color = color_a;
				}
				else {
					let remapped = 0/3;
					if      (blend_index === 2) remapped = 1/3;
					else if (blend_index === 3) remapped = 2/3;
					else if (blend_index === 1) remapped = 3/3;
					color = D.blend(remapped, color_a, color_b);
				}

				const p = ((x+ix) + (y+iy)*width) * 4
				view.setUint8(p, Math.round(color[0] * 255));
				view.setUint8(p+1, Math.round(color[1] * 255));
				view.setUint8(p+2, Math.round(color[2] * 255));
				view.setUint8(p+3, alpha);

			} // for (let iy=0; iy<height; iy+=4)
			} // for (let ix=0; ix<width; ix+=4)

		} // for (let y=0; y<height; y+=4)
		} // for (let x=0; x<width; x+=4)

		return new VImageData(target, image.width, image.height);
	},
});