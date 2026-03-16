import sharp from 'sharp';
import { VImageData, VFilters, type VFilter, type VPixelArray } from '../dist/index.js';
import { srgbToLinear, linearToSrgb }from '../dist/core/utils.js';
import assert from 'node:assert';

const loadedImages: Record<string, VImageData<Float32Array>> = {}

async function getInputImage(path: string): Promise<VImageData<Float32Array>> {
	if (path in loadedImages) return loadedImages[path];

	const s = sharp(path).raw({ depth: 'uchar' }).ensureAlpha();
	const b = await s.toBuffer({ resolveWithObject: true });
	const image = new VImageData(
		new Uint8Array(b.data),
		b.info.width,
		b.info.height
	).convert(Float32Array);

	loadedImages[path] = image;
	return image;
}

function applyToImageCopy<T extends VPixelArray>(img: VImageData<T>, func: (n: number) => number): VImageData<T> {
	const newDat = new (img.getDataConstructor())(img.data.length);
	for (let i=0; i<img.data.length; i++) newDat[i] = func(img.data[i]);
	return new VImageData(newDat, img.width, img.height);
}

// function writeOutputImage(path: string, image: VImageData) {
// 	sharp(
// 			image.convert(Uint8Array).data,
// 			{ raw: { channels: 4, width: image.width, height: image.height }}
// 		)
// 		.removeAlpha()
// 		.png()
// 		.toFile(path);
// }

async function checkResizeFilter(imFrom: string, imTo: string, filter: VFilter) {
	const fromData = await getInputImage(imFrom);
	const toData = await getInputImage(imTo);

	// Resample in srgb-linear to fix color accumulation.
	// const resampled = fromData.resize(toData.width, toData.height, { filter });

	const fromDataLinear = applyToImageCopy(fromData, srgbToLinear);
	const resampledLinear = fromDataLinear.resize(toData.width, toData.height, { filter });
	const resampled = applyToImageCopy(resampledLinear, linearToSrgb).convert(Uint8Array).convert(Float32Array);
	
	// Debug: Output a png next to the inputs.
	// writeOutputImage(imTo + '_resample.png', resampled);

	let sum_baseline = 0.0;
	let sum_resampled = 0.0;
	let delta_min = 0.0;
	let delta_max = 0.0;
	let diff = 0.0;
	
	for (let i=0; i<toData.data.length; i++) {
		sum_baseline += toData.data[i];
		sum_resampled += resampled.data[i];
		const delta = resampled.data[i] - toData.data[i];
		delta_min = Math.min(delta, delta_min);
		delta_max = Math.max(delta, delta_max);
		diff += Math.abs(delta);
	}

	return {
		diff,
		diff_avg: diff / toData.data.length,
		sum_baseline,
		sum_resampled,
		delta_min, delta_max,
	};
}

const input_folder = './test/in/resize/';
const img_baseline = input_folder + 'noise_1024x.png';

function assertLessThan(a: number, b: number, method: string) {
	if (a > b) assert.fail(`${method}: Scaling regression! Expected ≤ ${b}, but got ${a}!`);
}

describe('Resize Squoosh Comparison', () => {
	it('Point', async () => {
		const out = await checkResizeFilter(img_baseline, input_folder + 'noise_256x_affinity_nearest.png', VFilters.Point);
		// console.log('Point:', out.diff);
		assertLessThan(out.diff, 1.58824, 'Point');
	});

	it('Triangle', async () => {
		const out = await checkResizeFilter(img_baseline, input_folder + 'noise_256x_squoosh_bilinear.png', VFilters.Triangle);
		// console.log('Triangle:', out.diff);
		assertLessThan(out.diff, 0.0, 'Triangle');
	});
	
	it('Lanczos', async () => {
		const out = await checkResizeFilter(img_baseline, input_folder + 'noise_256x_squoosh_lanczos3.png', VFilters.Lanczos3);
		// console.log('Lanczos:', out.diff);
		assertLessThan(out.diff, 81.9412, 'Lanczos');
	});

	it('CatRom', async () => {
		const out = await checkResizeFilter(img_baseline, input_folder + 'noise_256x_squoosh_catrom.png', VFilters.CatRom);
		// console.log('CatRom:', out.diff);
		assertLessThan(out.diff, 29.2, 'CatRom');
	});

	it('Mitchell', async () => {
		const out = await checkResizeFilter(img_baseline, input_folder + 'noise_256x_squoosh_mitchell.png', VFilters.Mitchell);
		// console.log('Mitchell:', out.diff);
		assertLessThan(out.diff, 6.458824, 'Mitchell');
	});
});
