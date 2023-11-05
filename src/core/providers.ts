import { VImageData } from './image.js';
import { resizeNearest } from './resize.js';
import { getMipSize, getThumbMip } from './utils.js';

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
		if (mip > this.__mipmaps.length) throw new Error(`Mipmap ${mip} does not exist in VDataCollection!`);
		if (frame > this.__mipmaps[mip].length) throw new Error(`Frame ${frame} does not exist in VDataCollection!`);
		if (face > this.__mipmaps[mip][frame].length) throw new Error(`Face ${face} does not exist in VDataCollection!`);
		if (slice > this.__mipmaps[mip][frame][face].length) throw new Error(`Slice ${slice} does not exist in VDataCollection!`);
		return this.__mipmaps[mip][frame][face][slice];
	}

	getSize(mip: number=0, frame: number=0, face: number=0, slice: number=0): [number, number] {
		if (this.__mipmaps.length <= mip) throw new Error(`Mipmap ${mip} does not exist in VDataCollection!`);
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

		const first_image = this.getImage(0,0,0,0);
		this.__mipmapCount = options?.mipmaps ?? getThumbMip(first_image.width, first_image.height, 1);
		this.__resizeMethod = options?.method ?? VResizeKernel.Linear;
	}

	getImage(mip: number, frame: number, face: number, slice: number): VImageData {
		if (frame > this.__frames.length) throw new Error(`Frame ${frame} does not exist in VMipmapProvider!`);
		if (face > this.__frames[frame].length) throw new Error(`Face ${face} does not exist in VMipmapProvider!`);
		if (slice > this.__frames[frame][face].length) throw new Error(`Slice ${slice} does not exist in VMipmapProvider!`);

		const original = this.__frames[frame][face][slice];
		const [width, height] = this.getSize(mip, frame, face, slice);

		// TODO: Use anything that is *not* nearest sampling for mipmaps. NICE maybe?
		return resizeNearest(original, width, height);
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
