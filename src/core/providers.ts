import type { VImageData } from '../image.js';

export enum VResizeKernel {
	Nearest = 0,
	Linear,
	Nice,
}

export interface VDataProvider {
	getImage(mip: number, frame: number, face: number, slice: number): VImageData;
	mipmapCount(): number;
	frameCount(): number;
	faceCount(): number;
	sliceCount(): number;
}

export interface VMipmapProviderOptions {
	method?: VResizeKernel;
	mipmaps?: number;
}

/** A class for manually defining all mipmaps/frames/faces/slices. */
export class VDataCollection implements VDataProvider {
	private __mipmaps: VImageData[][][][];
	protected __frameCount:  number;
	protected __sliceCount:  number;
	protected __mipmapCount: number;
	protected __faceCount:   number;

	constructor(mipmaps: VImageData[][][][]) {
		this.__mipmaps = mipmaps;
	}

	getImage(mip: number, frame: number, face: number, slice: number): VImageData {
		return this.__mipmaps[mip][frame][face][slice];
	}

	mipmapCount(): number { return this.__mipmapCount }
	frameCount(): number { return this.__frameCount }
	faceCount(): number { return this.__faceCount }
	sliceCount(): number { return this.__sliceCount }
}

/** A class for automatically generating mipmaps. */
export class VMipmapProvider implements VDataProvider {
	protected __frames: VImageData[][][];
	protected __frameCount:  number;
	protected __sliceCount:  number;
	protected __faceCount:   number;

	__mipmapCount: number;
	__resizeMethod: VResizeKernel;

	constructor(frames: VImageData[][][], options?: VMipmapProviderOptions) {
		this.__frames = frames;
		this.__frameCount = frames.length;
		this.__faceCount = this.__frameCount ? frames[0].length : 0;
		this.__sliceCount = this.__faceCount ? frames[0][0].length : 0;

		if (!options) return;
		this.__mipmapCount = options.mipmaps ?? 3;
		this.__resizeMethod = options.method ?? VResizeKernel.Linear;
	}

	getImage(mip: number, frame: number, face: number, slice: number): VImageData {
		// TODO: FUCK.!!!!!
		return this.__frames[frame][face][slice];
	}

	mipmapCount(): number { return this.__mipmapCount }
	frameCount(): number { return this.__frameCount }
	faceCount(): number { return this.__faceCount }
	sliceCount(): number { return this.__sliceCount }
}

/** A class for defining frames and generating mipmaps. */
export class VFrameCollection extends VMipmapProvider {
	constructor(frames: VImageData[], options?: VMipmapProviderOptions) {
		const inFrames = frames.map(frame => [[frame]]);
		super(inFrames, options);
	}
}

/** A class for defining slices and generating mipmaps. */
export class VFaceCollection extends VMipmapProvider {
	constructor(faces: VImageData[], options?: VMipmapProviderOptions) {
		const inFrames = faces.map(frame => [frame]);
		super([inFrames], options);
	}
}

/** A class for defining slices and generating mipmaps. */
export class VSliceCollection extends VMipmapProvider {
	constructor(slices: VImageData[], options?: VMipmapProviderOptions) {
		super([[slices]], options);
	}
}