import { DataBuffer } from '../util/buffer.js';
import { VImageData } from '../core/image.js';

import * as Vec2 from '../util/vec2.js';
type Vec2 = Vec2.Vec2;

import * as Vec3 from '../util/vec3.js';
type Vec3 = Vec3.Vec3;

import * as Vec4 from '../util/vec4.js';
type Vec4 = Vec4.Vec4;

import * as VecD from '../util/vec.dxt.js';
import { RangeFit, ComputePrincipleComponent, ComputeWeightedCovariance } from '../util/squish.js';
import { linearToSrgb, saturate } from './dxt.common.js';

const BLOCK_SIZE_4X4 = 16;
const CMP_QUALITY0 = 0.5;

export enum CompressionFlags {
	DXT1_Alpha = 0x2,
	DXT1 = 0x4,
	DXT3 = 0x8,
	DXT5 = 0x10,

	PerceptualWeight = 0x20,
	AlphaWeight = 0x40,
}

interface BC15Options {
	quality: number;
	channelWeights: Float32Array;
	alphaTreshold: number;
	useAlpha: boolean;
}

const R = 0, G = 1, B = 2, A = 3;



function cgu_ProcessColors(
	colorMin: Vec3,
	colorMax: Vec3,
	setopt: number,
	isSRGB: boolean): { c0: number, c1: number }
{
	const scale = Vec3.create(31.0, 31.0, 31.0);
	const MinColorScaled = Vec3.create();
	const MaxColorScaled = Vec3.create();

	if (isSRGB) {
		linearToSrgb(MinColorScaled, colorMin);
		linearToSrgb(MaxColorScaled, colorMax);
	}
	else {
		Vec3.clamp(MinColorScaled, colorMin, 0, 1);
		Vec3.clamp(MaxColorScaled, colorMax, 0, 1);
	}

	switch (setopt) {
		case 0: // Min-Max processing
			Vec3.mult(MinColorScaled, MinColorScaled, scale);
			Vec3.mult(MaxColorScaled, MaxColorScaled, scale);
			Vec3.floor(MinColorScaled, MinColorScaled);
			Vec3.ceil(MaxColorScaled, MaxColorScaled);
			Vec3.div(colorMin, MinColorScaled, scale);
			Vec3.div(colorMax, MaxColorScaled, scale);
			break;
		default: // Round processing
			Vec3.mult(MinColorScaled, MinColorScaled, scale);
			Vec3.mult(MaxColorScaled, MaxColorScaled, scale);
			Vec3.round(MinColorScaled, MinColorScaled);
			Vec3.round(MaxColorScaled, MaxColorScaled);
			break;
	}

	let x = MinColorScaled[0],
		y = MinColorScaled[1],
		z = MinColorScaled[2];
	const c0 = (x << 11) | (y << 5) | z;

	x = MaxColorScaled[0],
	y = MaxColorScaled[1],
	z = MaxColorScaled[2];
	const c1 = (x << 11)  | (y << 5) | z;

	return { c0, c1 };
}

// https://github.com/GPUOpen-Tools/compressonator/blob/f4b53d79ec5abbb50924f58aebb7bf2793200b94/cmp_core/shaders/bc1_cmp.h#L1084
function cgu_getIndicesRGB(block: Float32Array, minColor: Vec3, maxColor: Vec3, getErr: boolean) {
	const cn = Vec3.createArray(4);
	let packedIndices = 0;
	let minDistance: number;
	let err = 0.0;

	if (getErr) {
		Vec3.copy(cn[0], maxColor);
		Vec3.copy(cn[1], minColor);
		VecD.blend13(cn[2], cn[0], cn[1]);
		VecD.blend13(cn[2], cn[1], cn[0]);
	}

	const Scale =	(minColor[0] - maxColor[0])**2 +
					(minColor[1] - maxColor[1])**2 +
					(minColor[2] - maxColor[2])**2;

	const ScaledRange = Vec3.sub(Vec3.create(), minColor, maxColor);
	Vec3.scale(ScaledRange, ScaledRange, Scale);
	const Bias = Vec3.dot(maxColor, maxColor) - Vec3.dot(maxColor, minColor);
	const indexMap = new Int32Array([0, 2, 3, 1]);
	let index: number;
	let diff: number;

	for (let i=0; i<16; i++) {
		const blockI = Vec3.ref(block,i*3);

		// Get offset from base scale
		diff = Vec3.dot(blockI, ScaledRange) + Bias;
		index = Math.round(diff) & 0x3;

		// remap linear offset to spec offset
		index = indexMap[index];

		// use err calc for use in higher quality code
		if (getErr) {
			minDistance = Vec3.subDot(blockI, cn[index]);
			err += minDistance;
		}

		// Map the 2 bit index into compress 32 bit block
		if (index)
			packedIndices |= (index << (2 * i));
	}

	if (getErr)
		err = err * 0.0208333;

	return { cmpindex: packedIndices, err };
}

export function cgu_RGBBlockError(block: Float32Array, compressedBlock: Vec2, isSRGB: boolean) {
	const rgbBlock = Vec3.createArray(BLOCK_SIZE_4X4);

}

export function cgu_decompressRGBBlock() {
	return;
}

// https://github.com/GPUOpen-Tools/compressonator/blob/f4b53d79ec5abbb50924f58aebb7bf2793200b94/cmp_core/shaders/bc1_cmp.h#L1338C28-L1338C45
export function cgu_CompressRGBBlock_MinMax(
		src_imageRGB: Float32Array,
		quality: number,
		isSRGB: boolean,
		srcRGB: Float32Array,
		average_rgb: Float32Array,
		errout: { value: number })
{
	const Q1CompData = Vec2.createUi(0, 0);
	const rgb = Vec3.create(0, 0, 0);

	// -------------------------------------------------------------------------------------
	// (1) Find the array of unique pixel values and sum them to find their average position
	// -------------------------------------------------------------------------------------
	// let   errLQ: number 			= 0.0;
	const fastProcess: boolean		= (quality <= CMP_QUALITY0);	// Min Max only
	const srcMin					= Vec3.create(1.0);				// Min source color
	const srcMax					= Vec3.create(0.0);				// Max source color
	const Q1compressedBlock			= Vec2.createUi(0, 0);

	average_rgb.fill(0.0);

	// Get average and modifed src
    // find average position and save list of pixels as 0F..255F range for processing
    // Note: z (blue) is average of blue+green channels
	for (let i=0, p=0; i<BLOCK_SIZE_4X4; i++, p+=3) {
		const currentPixel = Vec3.ref(src_imageRGB, p);
		Vec3.min(srcMin, srcMin, currentPixel);
		Vec3.max(srcMax, srcMax, currentPixel);
		
		if (!fastProcess) {
			if (isSRGB)  linearToSrgb(rgb, currentPixel);
			else         saturate(rgb, currentPixel);
			rgb[2]       = (rgb[1] + rgb[2]) * 0.5;  // Z-axiz => (R+G)/2
			Vec3.copy(srcRGB, rgb);
			Vec3.add(average_rgb, average_rgb, rgb);
		}
	}

	const { c0, c1 } = cgu_ProcessColors(srcMin, srcMax, +isSRGB, isSRGB);

	if (c0 < c1) {
		Q1CompData[0] = (c0 << 16) | c1;
		const { cmpindex: index, err: errLQ } = cgu_getIndicesRGB(src_imageRGB, srcMin, srcMax, false);
		Q1CompData[1] = index;
		errout = cgu_RGBBlockError(src_imageRGB, Q1CompData, isSRGB);
	}
}
