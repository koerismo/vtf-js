import { VImageData } from './image.js';

export function resizeNearest(image: VImageData, width: number, height: number) {
	const src = image.convert(Float32Array).data;
	const dest = new Float32Array(width * height * 4);

	for ( let d=0; d<dest.length; d+=4 ) {
		const pixel_dest = d / 4;
		const dx = pixel_dest % width;
		const dy = (pixel_dest - dx) / width;

		const sx = Math.round(dx * (image.width / width));
		const sy = Math.round(dy * (image.height / height));

		const pixel_src = sx + sy * image.width;
		const s = pixel_src * 4;

		dest[d] = src[s];
		dest[d+1] = src[s+1];
		dest[d+2] = src[s+2];
		dest[d+3] = src[s+3];
	}

	return new VImageData(dest, width, height);
}

/* export function resizeCubic(image: VImageData, width: number, height: number) {
	const src = image.convert(Float32Array).data;
	const dest = new Float32Array(width * height * 4);

	for ( let d=0; d<dest.length; d+=4 ) {
		const pixel_dest = d / 4;
		const dx = pixel_dest % width;
		const dy = (pixel_dest - dx) / width;

		const sx = (dx * (image.width / width));
		const sy = (dy * (image.height / height));

		const sx_floor = Math.floor(sx);
		const sy_floor = Math.floor(sy);
		const sx_ceil = Math.ceil(sx);
		const sy_ceil = Math.ceil(sy);

		const sx_ratio = (sx - sx_floor);
		const sy_ratio = (sy - sy_floor);

		const srcPixel = (x: number, y: number) => {
			return (x + y * image.width) * 4;
		}

		const lerpPixel = (offset: number) => {
			return (
				src[srcPixel(sx_floor, sy_floor)+offset] * (1-sx_ratio) * (1-sy_ratio) +
				src[srcPixel(sx_ceil, sy_floor)+offset] * (sx_ratio) * (1-sy_ratio) +
				src[srcPixel(sx_floor, sy_ceil)+offset] * (1-sx_ratio) * (sy_ratio) +
				src[srcPixel(sx_ceil, sy_ceil)+offset] * (sx_ratio) * (sy_ratio)
			);
		}

		dest[d]   = lerpPixel(0);
		dest[d+1] = lerpPixel(1);
		dest[d+2] = lerpPixel(2);
		dest[d+3] = lerpPixel(3);
	}

	return new VImageData(dest, width, height);
}

export function resizeInverseCubic(image: VImageData, width: number, height: number) {
	const src = image.convert(Float32Array).data;
	const dest = new Float32Array(width * height * 4);

	for ( let s=0; s<src.length; s+=4 ) {
		const pixel_src = s / 4;
		const sx = pixel_src % image.width;
		const sy = (pixel_src - sx) / image.width;

		const dx = (sx * (width / image.width));
		const dy = (sy * (height / image.height));

		const dx_floor = Math.floor(dx);
		const dy_floor = Math.floor(dy);
		const dx_ceil = Math.ceil(dx);
		const dy_ceil = Math.ceil(dy);

		const dx_ratio = 1-(dx - dx_floor);
		const dy_ratio = 1-(dy - dy_floor);

		const destPixel = (x: number, y: number) => {
			return (x + y * width) * 4;
		}

		const writePixel = (offset: number) => {
			const add = src[sx + sy*image.width + offset];

			// top left
			dest[destPixel(dx_floor, dy_floor)+offset] += add * dx_ratio * dy_ratio
			// top right
			dest[destPixel(dx_ceil, dy_floor)+offset] += add * (1-dx_ratio) * dy_ratio
			// bottom left
			dest[destPixel(dx_floor, dy_ceil)+offset] += add * dx_ratio * (1-dy_ratio)
			// bottom right
			dest[destPixel(dx_ceil, dy_ceil)+offset] += add * (1-dx_ratio) * (1-dy_ratio)
		}

		writePixel(0);
		writePixel(1);
		writePixel(2);
		writePixel(3);
	}

	return new VImageData(dest, width, height);
}
*/