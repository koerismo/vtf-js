import { VImageData, VPixelArray } from './image.js';
import { clamp } from './utils.js';

export interface VResizeOptions {
	filter: Filter;
	wrap_h: boolean;
	wrap_v: boolean;
}

function sinc(x: number) {
	if (x === 0) return 1.0;
	const a = Math.PI * x;
	return Math.sin(a) / a;
}

/** @see {@link Filter} */
export const VFilters = {
	Point:		<Filter>{ radius: 0, kernel: () => 1.0 },
	Triangle:	<Filter>{ radius: 1, kernel: (x) => Math.max(0, 1.44 - Math.abs(x)) },
	Box:		<Filter>{ radius: 1, kernel: () => 1.0 },
	Lanczos:	<Filter>{ radius: 3, kernel: (x) => x < 3.0 ? sinc(x) * sinc(x / 3.0) : 0.0 },
	NICE:		<Filter>{ radius: 3, kernel: (x) => x === 0 ? 1.0 : sinc(x) * sinc(x/3.0) },
	// Bicubic: null,
	// Mitchell: null,
} as const;


/** Basic nearest-neighbor resize implementation, separate from filter methods. */
export function resizeNearest(image: VImageData, width: number, height: number) {
	const src = image.convert(Float32Array).data;
	const dest = new Float32Array(width * height * 4);

	for ( let d=0; d<dest.length; d+=4 ) {
		const pixel_dest = d / 4;
		const dx = pixel_dest % width;
		const dy = (pixel_dest - dx) / width;

		const sx = Math.floor(dx * (image.width / width));
		const sy = Math.floor(dy * (image.height / height));

		const pixel_src = sx + sy * image.width;
		const s = pixel_src * 4;

		dest[d] = src[s];
		dest[d+1] = src[s+1];
		dest[d+2] = src[s+2];
		dest[d+3] = src[s+3];
	}

	return new VImageData(dest, width, height);
}

// Some of the below was inspired by the resize-rs project.
// https://github.com/PistonDevelopers/resize/blob/master/src/lib.rs

/** Defines a filter that can be used to resize images. */
export interface Filter {
	kernel: (distance: number) => number;
	radius: number;
}

/** Computes the static kernel matrix for a given filter. */
export function computeKernel(filter: Filter, scale_x: number, scale_y: number): VImageData {
	const width = Math.ceil(filter.radius*2 * scale_x) + 1;
	const height = Math.ceil(filter.radius*2 * scale_y) + 1;
	const center_x = (width-1)/2;
	const center_y = (height-1)/2;
	
	let sum = 0;
	const kernel = new Float32Array(width * height);
	for (let y=0; y<height; y++) {
		for (let x=0; x<width; x++) {
			sum += (
				kernel[y * width + x] = filter.kernel(Math.hypot((x - center_x) / scale_x, (y - center_y) / scale_y))
			);
		}
	}

	if (sum) for (let i=0; i<kernel.length; i++) kernel[i] /= sum;
	return new VImageData(kernel, width, height);
}

/** Resizes the specified image to a new shape. Currently, upscaling will produce pixelated results. */
export function resizeFiltered<T extends VPixelArray>(image: VImageData<T>, width: number, height: number, options: VResizeOptions): VImageData<T> {
	const ratio_x = image.width / width;
	const ratio_y = image.height / height;

	const kernel = computeKernel(
		options.filter,
		Math.max(1, ratio_x),
		Math.max(1, ratio_y)
	);

	const start_x = -Math.floor(kernel.width / 2);
	const start_y = -Math.floor(kernel.height / 2);

	const get_pixel = (x: number, y: number) => {
		x = options.wrap_h ? (x + image.width) % image.width : clamp(x, 0, image.width-1);
		y = options.wrap_v ? (y + image.height) % image.height : clamp(y, 0, image.height-1);
		return (Math.floor(y) * image.width + Math.floor(x)) * 4;
	}

	// @ts-expect-error TODO: How can we make this more typescript-y?
	const out: T = new image.data.constructor(width * height * 4);
	const input = image.data;
	const scratch = new Float64Array(4);

	// Iterate over destination pixels
	for (let dy=0; dy<height; dy++) {
		const sy = Math.floor(dy * ratio_y);
		for (let dx=0; dx<width; dx++) {
			const sx = Math.floor(dx * ratio_x);

			const dest = (dy * width + dx) * 4;
			scratch.fill(0);

			for (let ky=0; ky<kernel.height; ky++) {
				for (let kx=0; kx<kernel.width; kx++) {
					const effect = kernel.data[ky * kernel.width + kx];
					const src = get_pixel(sx + start_x + kx, sy + start_y + ky);
					scratch[0] += input[src] * effect,
					scratch[1] += input[src+1] * effect,
					scratch[2] += input[src+2] * effect,
					scratch[3] += input[src+3] * effect;
				}
			}

			out.set(scratch, dest);
		}
	}

	return new VImageData(out, width, height);
}
