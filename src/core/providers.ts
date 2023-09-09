import type { VImageData } from '../image.js';
import { getMipSize } from './utils.js';

export enum VResizeKernel {
	Nearest = 0,
	Linear,
	Nice,
}

/** Defines an interface that can be used to provide image data to the Vtf encoder. */
export interface VDataProvider {
	getImage(mip: number, frame: number, face: number, slice: number): VImageData;
	getSize(mip?: number, frame?: number, face?: number, slice?: number): [number, number];
	mipmapCount(): number;
	frameCount(): number;
	faceCount(): number;
	sliceCount(): number;
}

export interface VMipmapProviderOptions {
	method?: VResizeKernel;
	mipmaps?: number;
}

/** A class for storing collections of mipmaps, frames, faces, and slices. */
export class VDataCollection implements VDataProvider {
	private __mipmaps: VImageData[][][][];

	constructor(mipmaps: VImageData[][][][]) {
		this.__mipmaps = mipmaps;
	}

	getImage(mip: number, frame: number, face: number, slice: number): VImageData {
		return this.__mipmaps[mip][frame][face][slice];
	}

	getSize(mip: number=0, frame: number=0, face: number=0, slice: number=0): [number, number] {
		const img = this.__mipmaps[mip][frame][face][slice];
		return [img.width, img.height];
	}

	mipmapCount(): number { return this.__mipmaps.length ?? 0 }
	frameCount(): number { return this.__mipmaps[0]?.length ?? 0 }
	faceCount(): number { return this.__mipmaps[0]?.[0]?.length ?? 0 }
	sliceCount(): number { return this.__mipmaps[0]?.[0]?.[0]?.length ?? 0 }
}

/** A class that extends the base provider interface, but automatically generates mipmaps. */
export class VMipmapProvider implements VDataProvider {
	protected __frames: VImageData[][][];

	__mipmapCount: number;
	__resizeMethod: VResizeKernel;

	constructor(frames: VImageData[][][], options?: VMipmapProviderOptions) {
		this.__frames = frames;

		if (!options) return;
		this.__mipmapCount = options.mipmaps ?? 3;
		this.__resizeMethod = options.method ?? VResizeKernel.Linear;
	}

	getImage(mip: number, frame: number, face: number, slice: number): VImageData {
		// TODO: FUCK !!!!!
		return this.__frames[frame][face][slice];
	}

	getSize(mip: number=0, frame: number=0, face: number=0, slice: number=0): [number, number] {
		const img = this.__frames[frame][face][slice];
		return getMipSize(mip, img.width, img.height);
	}

	mipmapCount(): number { return this.__mipmapCount }
	frameCount(): number { return this.__mipmapCount ? this.__frames.length ?? 0 : 0 }
	faceCount(): number { return this.__mipmapCount ? this.__frames[0]?.length ?? 0 : 0 }
	sliceCount(): number { return this.__mipmapCount ? this.__frames[0]?.[0]?.length ?? 0 : 0 }
}

/** A class that extends VMipmapProvider but takes an array of frames in the constructor. */
export class VFrameCollection extends VMipmapProvider {
	constructor(frames: VImageData[], options?: VMipmapProviderOptions) {
		const inFrames = frames.map(frame => [[frame]]);
		super(inFrames, options);
	}
}

/** A class that extends VMipmapProvider but takes an array of faces in the constructor. */
export class VFaceCollection extends VMipmapProvider {
	constructor(faces: VImageData[], options?: VMipmapProviderOptions) {
		const inFrames = faces.map(frame => [frame]);
		super([inFrames], options);
	}
}

/** A class that extends VMipmapProvider but takes an array of slices in the constructor. */
export class VSliceCollection extends VMipmapProvider {
	constructor(slices: VImageData[], options?: VMipmapProviderOptions) {
		super([[slices]], options);
	}
}