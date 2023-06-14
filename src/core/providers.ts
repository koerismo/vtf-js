import type { VImageData } from '../data.js';

export enum VResizeKernel {
	Nearest = 0,
	Linear,
	Nice,
}

export interface VDataProvider {
	getImage(mip: number, frame: number, face: number, slice: number): VImageData;
	frameCount(): number;
	sliceCount(): number;
	mipmapCount(): number;
}

export interface VMipmapProviderOptions {
	method?: VResizeKernel;
	mipmaps?: number;
}

/** A class for manually defining all mipmaps/frames/faces/slices. */
export declare class VDataCollection implements VDataProvider {
	constructor(mipmaps: VImageData[][][][]);
	getImage(mip: number, frame: number, face: number, slice: number): VImageData;
	frameCount(): number;
	sliceCount(): number;
	mipmapCount(): number;
}

/** A class for automatically generating mipmaps. */
export declare class VMipmapProvider implements VDataProvider {
	constructor(frames: VImageData[][][], options?: VMipmapProviderOptions);
	getImage(mip: number, frame: number, face: number, slice: number): VImageData;
	frameCount(): number;
	sliceCount(): number;
	mipmapCount(): number;
}

/** A class for defining frames and generating mipmaps. */
export declare class VFrameCollection extends VMipmapProvider {
	constructor(frames: VImageData[], options?: VMipmapProviderOptions);
}

/** A class for defining slices and generating mipmaps. */
export declare class VSliceCollection extends VMipmapProvider {
	constructor(slices: VImageData[], options?: VMipmapProviderOptions);
}

/** A class for defining slices and generating mipmaps. */
export declare class VFaceCollection extends VMipmapProvider {
	constructor(faces: VImageData[], options?: VMipmapProviderOptions);
}