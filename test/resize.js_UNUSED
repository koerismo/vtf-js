import { VImageData } from '../dist/core/image.js';
import { resizeNearest, resizeFiltered, VFilters } from '../dist/core/resize.js';
import sharp from 'sharp';

async function getInputImage(path, size=256) {
	const s = sharp(path).raw({ depth: 'uchar' }).ensureAlpha();
	const b = await s.toBuffer();
	return new VImageData(b, size, size).convert(Float32Array);
}

function writeOutputImage(path, image) {
	sharp(image.convert(Uint8Array).data, { raw: { channels: 4, width: image.width, height: image.height }}).removeAlpha().png().toFile(path);
}
const input_tiny = await getInputImage('./test/in/resize/tiny.png', 16);
const input = await getInputImage('./test/in/resize/large.png', 1024);
writeOutputImage('./test/out/resize/source.png', input);

describe('Resize functions', () => {

	it('Nearest (Ground Truth)', () => {
		const output_s = resizeNearest(input, 32, 32);
		const output_l = resizeNearest(input_tiny, 512, 512);
		writeOutputImage('./test/out/resize/nearest_s.png', output_s);
		writeOutputImage('./test/out/resize/nearest_l.png', output_l);
	});

	it('Point', () => {
		const output_s = resizeFiltered(input, 32, 32, { filter: VFilters.Point });
		const output_l = resizeFiltered(input_tiny, 512, 512, { filter: VFilters.Point });
		writeOutputImage('./test/out/resize/point_s.png', output_s);
		writeOutputImage('./test/out/resize/point_l.png', output_l);
	});

	it('Triangle', () => {
		const output_s = resizeFiltered(input, 32, 32, { filter: VFilters.Triangle });
		const output_l = resizeFiltered(input_tiny, 512, 512, { filter: VFilters.Triangle });
		writeOutputImage('./test/out/resize/triangle_s.png', output_s);
		writeOutputImage('./test/out/resize/triangle_l.png', output_l);
	});

	it('Box', () => {
		const output_s = resizeFiltered(input, 32, 32, { filter: VFilters.Box });
		const output_l = resizeFiltered(input_tiny, 512, 512, { filter: VFilters.Box });
		writeOutputImage('./test/out/resize/box_s.png', output_s);
		writeOutputImage('./test/out/resize/box_l.png', output_l);
	});

	it('Lanczos', () => {
		const output_s = resizeFiltered(input, 32, 32, { filter: VFilters.Lanczos });
		const output_l = resizeFiltered(input_tiny, 512, 512, { filter: VFilters.Lanczos });
		writeOutputImage('./test/out/resize/lanczos_s.png', output_s);
		writeOutputImage('./test/out/resize/lanczos_l.png', output_l);
	});

	it('Nice', () => {
		const output_s = resizeFiltered(input, 32, 32, { filter: VFilters.NICE });
		const output_l = resizeFiltered(input_tiny, 512, 512, { filter: VFilters.NICE });
		writeOutputImage('./test/out/resize/nice_s.png', output_s);
		writeOutputImage('./test/out/resize/nice_l.png', output_l);
	});
})