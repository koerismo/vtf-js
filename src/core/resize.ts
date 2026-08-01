import { getPixelArrayMax, VImageData, VPixelArray } from './image.js';

function sinc(x: number) {
	if (x === 0) return 1.0;
	const a = Math.PI * x;
	return Math.sin(a) / a;
}

// Ported from zimg
// https://github.com/sekrit-twc/zimg/blob/6d52c3a1d63109f209af9e6ffa879f23d0ec7f02/src/zimg/resize/filter.cpp#L147
function make_bicubic(b: number, c: number) {
	const p0 = (   6 - b*2			) / 6;
	const p2 = ( -18 + b*12 + c*6	) / 6;
	const p3 = (  12 - b*9  - c*6	) / 6;

	const q0 = (  b*8  + c*24	) / 6;
	const q1 = ( -b*12 - c*48	) / 6;
	const q2 = (  b*6  + c*30	) / 6;
	const q3 = ( -b    - c*6	) / 6;

	return (x: number) => {
		if (x < 1) return p0 + p2 * (x*x) + p3 * (x*x*x);
		if (x < 2) return q0 + q1 * x + q2 * (x*x) + q3 * (x*x*x);
		return 0;
	}
}

// function stbi_cubic(x: number) {
// 	if (x < 1) return (4 * x*x*(3*x - 6)) / 6;
// 	if (x < 2) return (8 * x*(-12 + x*(6 - x))) / 6;
// 	return 0;
// }

function filter_vtex_nice(x: number): number {
	if (x >= 3)	return 0;
	return sinc(x) * sinc(x / 3) * (x > 1 ? 1.8 : 1);
}

function filter_spp_nice(x: number): number {
	if (x >= 3) return 0;
	const NICE_SHARPEN = 1.25;

	const v = sinc(x) * sinc(x / 3.0);
	return v < 0 ? v * NICE_SHARPEN : v;
}

// Some of the below was adapted from the resize-rs project.
// https://github.com/PistonDevelopers/resize/blob/master/src/lib.rs

const CatRomDefaultFilter: VFilter = { radius: 2, kernel: make_bicubic(0.0, 0.5) };

/**
 * Built-in filters for image rescaling.
 * @see {@link VFilter}
 */
export const VFilters = {
	/** Default filter, used by {@link VImageScaler} if not explicitly specified. Alias to {@link VFilters.CatRom} */
	Default:	CatRomDefaultFilter,
	/** Point filtering - Always picks the nearest pixel when resampling. */
	Point:		<VFilter>{ radius: 0, kernel: () => 1 },
	/** Triangle/bilinear filtering - Blends the four pixels surrounding a given point. */
	Triangle:	<VFilter>{ radius: 1, kernel: x => Math.max(0, 1 - x) },
	/** Box filtering - Evenly blends in the four closest pixels. */
	Box:		<VFilter>{ radius: 1, kernel: x => x < 0.5 ? 1 : 0 },
	/** Mitchell–Netravali bicubic filtering. */
	Mitchell:	<VFilter>{ radius: 2, kernel: make_bicubic(1/3, 1/3) },
	/** Catmull-Rom bicubic filtering. */
	CatRom:		CatRomDefaultFilter,
	/** Lanczos-3 filtering. */
	Lanczos3:	<VFilter>{ radius: 3, kernel: x => x < 3 ? sinc(x) * sinc(x / 3) : 0 },
	/** Valve NICE filtering. Equivalent to Lanczos-3, but with a sharpening factor added to match VTEX output. */
	NICE:		<VFilter>{ radius: 3, kernel: filter_vtex_nice },
	/** Modified Valve NICE filtering. Equivalent to Lanczos-3, but with a less-intense sharpening factor added to match sourcepp output. */
	NICER:		<VFilter>{ radius: 3, kernel: filter_spp_nice },
} as const;


/** Defines a filter that can be used to rescale images. */
export interface VFilter {
	kernel: (distance: number) => number;
	radius: number;
}

interface CoeffsLine {
	start: number;
	coeffs: Float32Array;
}

export class VImageScaler {
	protected coeffs_w: CoeffsLine[];
	protected coeffs_h: CoeffsLine[];

	constructor(
		public readonly src_width: number,
		public readonly src_height: number,
		public readonly dest_width: number,
		public readonly dest_height: number,
		public readonly filter: VFilter = VFilters.Default,
		coeff_cache: Record<string, Float32Array> = {},
		) {
			this.coeffs_w = this.calc_coeffs(src_width, dest_width, this.filter, coeff_cache);
			if (src_width === src_height && dest_width === dest_height) {
				this.coeffs_h = this.coeffs_w;
			}
			else {
				this.coeffs_h = this.calc_coeffs(src_height, dest_height, this.filter, coeff_cache);
			}
	}

	protected calc_coeffs(size1: number, size2: number, filter: VFilter, cache: Record<string, Float32Array>): CoeffsLine[] {
		const inv_ratio = size1 / size2;
		const filter_scale = Math.max(1, inv_ratio);
		const filter_radius = Math.ceil(filter_scale * filter.radius);
		const filter_kernel = filter.kernel;
		const coeffs: CoeffsLine[] = new Array(size2);

		for (let x2=0; x2<size2; x2++) {
			// The (float) center of the filter in the src image
			// The rest of this code assumes the pixels' "center" is the left edge
			const center_px = (x2 + 0.5) * inv_ratio - 0.5;

			// The pixel indices where the window starts/stops in the src image
			const start = Math.max(0,                          Math.ceil(center_px - filter_radius) );
			const end =   Math.max(start, Math.min(size1 - 1,  Math.floor(center_px + filter_radius) ));
			const length = end - start + 1;

			const offset_from_center = center_px - start;
			const cache_key = filter_scale + ',' + length.toString(36) + ',' + offset_from_center;

			// Reuse the same coeffs whenever possible for perf!!
			if (cache_key in cache) {
				coeffs[x2] = { start, coeffs: cache[cache_key] };
				continue;
			}

			const pixel_coeffs = new Float32Array(length);
			cache[cache_key] = pixel_coeffs;
			coeffs[x2] = { start, coeffs: pixel_coeffs };

			let pixel_coeffs_sum = 0;
			for (let i=0; i<length; i++) {
				const distance = Math.abs(i - offset_from_center);
				const influence = filter_kernel(distance / filter_scale);
				pixel_coeffs[i] = influence;
				pixel_coeffs_sum += influence;
			}

			for (let i=0; i<length; i++)
				pixel_coeffs[i] /= pixel_coeffs_sum;
		}

		return coeffs;
	}

	/**
	 * Resizes the provided source image and copies it into the provided destination image.
	 * This method assumes a linear color space.
	 */
	resize<T extends VPixelArray>(src: VImageData<T>, dst: VImageData<T>): VImageData<T> {
		if (src.width !== this.src_width || src.height !== this.src_height)
			throw Error(`VImageScaler.resize: input does not match expected dimensions! (expected ${this.src_width}x${this.src_height} but got ${src.width}x${src.height})`);
		if (dst.width !== this.dest_width || dst.height !== this.dest_height)
			throw Error(`VImageScaler.resize: output does not match expected dimensions! (expected ${this.dest_width}x${this.dest_height} but got ${dst.width}x${dst.height})`);
		if (dst.data.length !== this.dest_width * this.dest_height * 4)
			throw Error(`VImageScaler.resize: output data length should be ${this.dest_width * this.dest_height * 4}, got ${dst.data.length} instead!`);

		// Used for accumulating since Uint8Arrays always round down (which means a totally black image)
		let tmp_r: number, tmp_g: number, tmp_b: number, tmp_a: number;

		// If clamping is enabled, use a clamp function.
		// Otherwise, make a no-op which should get optimized out.
		const valueMax = getPixelArrayMax(dst.data);

		const c = valueMax !== 1
			? ((n: number) => Math.round(n >= valueMax ? valueMax : n <= 0 ? 0 : n))
			: ((n: number) => n);

		const tmp0 = src.data;
		const tmp1 = new (src.getDataConstructor())(this.dest_width * this.src_height * 4);

		// Resize from (w1, h1) to (w2, h1)
		for (let y=0; y<this.src_height; y++) {
			for (let x=0; x<this.dest_width; x++) {
				const i = (y * this.dest_width + x) * 4;

				tmp_r = 0;
				tmp_g = 0;
				tmp_b = 0;
				tmp_a = 0;

				const { coeffs, start: coeffs_start } = this.coeffs_w[x];
				for (let c=0; c<coeffs.length; c++) {
					const coeff_i = (y * this.src_width + (coeffs_start + c)) * 4;
					const coeff = coeffs[c];
					tmp_r += tmp0[coeff_i] * coeff;
					tmp_g += tmp0[coeff_i+1] * coeff;
					tmp_b += tmp0[coeff_i+2] * coeff;
					tmp_a += tmp0[coeff_i+3] * coeff;
				}

				tmp1[i] = c(tmp_r);
				tmp1[i+1] = c(tmp_g);
				tmp1[i+2] = c(tmp_b);
				tmp1[i+3] = c(tmp_a);
			}
		}

		const tmp2 = dst.data;

		// Resize from (w2, h1) to (w2, h2)
		for (let y=0; y<this.dest_height; y++) {
			for (let x=0; x<this.dest_width; x++) {
				const i = (y * this.dest_width + x) * 4;

				tmp_r = 0;
				tmp_g = 0;
				tmp_b = 0;
				tmp_a = 0;

				const { coeffs, start: coeffs_start } = this.coeffs_h[y];
				for (let c=0; c<coeffs.length; c++) {
					const coeff_i = ((coeffs_start + c) * this.dest_width + x) * 4;
					const coeff = coeffs[c];
					tmp_r += tmp1[coeff_i] * coeff;
					tmp_g += tmp1[coeff_i+1] * coeff;
					tmp_b += tmp1[coeff_i+2] * coeff;
					tmp_a += tmp1[coeff_i+3] * coeff;
				}

				tmp2[i] = c(tmp_r);
				tmp2[i+1] = c(tmp_g);
				tmp2[i+2] = c(tmp_b);
				tmp2[i+3] = c(tmp_a);
			}
		}

		return dst;
	}
}
