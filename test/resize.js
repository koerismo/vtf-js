import { VImageData } from '../dist/core/image.js';
import { resizeNearest, resizeFiltered, computeKernel, VFilters } from '../dist/core/resize.js';
// import assert from 'node:assert';
import sharp from 'sharp';

async function getInputImage(path, size=256) {
	const s = sharp(path).raw({ depth: 'uchar' }).ensureAlpha();
	const b = await s.toBuffer();
	return new VImageData(b, size, size);
}

function writeOutputImage(path, image) {
	sharp(image.convert(Uint8Array).data, { raw: { channels: 4, width: image.width, height: image.height }}).removeAlpha().png().toFile(path);
}

describe('Resize functions', async () => {

	const input_tiny = await getInputImage('./test/in/resize/tiny.png', 16);
	const input = await getInputImage('./test/in/resize/source.png');
	writeOutputImage('./test/out/resize/source.png', input);

	it('Nearest', async () => {
		const output_s = resizeNearest(input, 32, 32);
		const output_l = resizeNearest(input_tiny, 512, 512);
		writeOutputImage('./test/out/resize/nearest_s.png', output_s);
		writeOutputImage('./test/out/resize/nearest_l.png', output_l);
	});

	// it('Kernel generator', () => {
	// 	console.log(computeKernel({
	// 		radius: 1,
	// 		kernel: function(x) {
	// 			return Math.max(0, 1.44 - x);
	// 		}
	// 	}, 2, 1));
	// });

	it('Triangle', async () => {
		const output_s = resizeFiltered(input, 32, 32, { filter: VFilters.Triangle });
		const output_l = resizeFiltered(input_tiny, 512, 512, { filter: VFilters.Triangle });
		writeOutputImage('./test/out/resize/triangle_s.png', output_s);
		writeOutputImage('./test/out/resize/triangle_l.png', output_l);
	});

	it('Box', async () => {
		const output_s = resizeFiltered(input, 32, 32, { filter: VFilters.Box });
		const output_l = resizeFiltered(input_tiny, 512, 512, { filter: VFilters.Box });
		writeOutputImage('./test/out/resize/box_s.png', output_s);
		writeOutputImage('./test/out/resize/box_l.png', output_l);
	});

	it('Lanczos', async () => {
		const output_s = resizeFiltered(input, 32, 32, { filter: VFilters.Lanczos });
		const output_l = resizeFiltered(input_tiny, 512, 512, { filter: VFilters.Lanczos });
		writeOutputImage('./test/out/resize/lanczos_s.png', output_s);
		writeOutputImage('./test/out/resize/lanczos_l.png', output_l);
	});

	it('Nice', async () => {
		const output_s = resizeFiltered(input, 32, 32, { filter: VFilters.NICE });
		const output_l = resizeFiltered(input_tiny, 512, 512, { filter: VFilters.NICE });
		writeOutputImage('./test/out/resize/nice_s.png', output_s);
		writeOutputImage('./test/out/resize/nice_l.png', output_l);
	});
})