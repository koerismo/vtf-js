import { VEncodedImageData, VImageData } from './image.js';
import { Filter, VFilters, resizeFiltered } from './resize.js';
import { getMipSize, getThumbMip } from './utils.js';

/** Defines an interface that can be used to provide image data to the Vtf encoder. */
export interface VDataProvider {
	getImage(mip: number, frame: number, face: number, slice: number): VImageData;
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded: true): VImageData|VEncodedImageData;
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded?: boolean): VImageData|VEncodedImageData;
	getSize(mip?: number, frame?: number, face?: number, slice?: number): [number, number];
	mipmapCount(): number;
	frameCount(): number;
	faceCount(): number;
	sliceCount(): number;
}

export interface VMipmapProviderOptions {
	filter?: Filter;
	wrap_h?: boolean;
	wrap_v?: boolean;
	mipmaps?: number;
}

/** A class for storing collections of mipmaps, frames, faces, and slices. */
export class VDataCollection implements VDataProvider {
	private __mipmaps: (VImageData|VEncodedImageData)[][][][];

	constructor(mipmaps: (VImageData|VEncodedImageData)[][][][]) {
		this.__mipmaps = mipmaps;
	}

	getImage(mip: number, frame: number, face: number, slice: number): VImageData;
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded: true): VImageData|VEncodedImageData;
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded: boolean=false): VImageData|VEncodedImageData {
		if (mip >= this.__mipmaps.length) throw Error(`Mipmap ${mip} does not exist in VDataCollection!`);
		if (frame >= this.__mipmaps[mip].length) throw Error(`Frame ${frame} does not exist in VDataCollection!`);
		if (face >= this.__mipmaps[mip][frame].length) throw Error(`Face ${face} does not exist in VDataCollection!`);
		if (slice >= this.__mipmaps[mip][frame][face].length) throw Error(`Slice ${slice} does not exist in VDataCollection!`);
		
		let image = this.__mipmaps[mip][frame][face][slice];
		const is_encoded = image instanceof VEncodedImageData;
		const is_decoded = image instanceof VImageData;

		if (is_encoded && !allowEncoded) image = this.__mipmaps[mip][frame][face][slice] = (<VEncodedImageData>image).decode();
		if (!is_encoded && !is_decoded) throw TypeError(`Expected VImageData or VEncodedImageData in VDataProvider, but found ${(<any>image).constructor.name} instead!`);
		
		return image;
	}

	getSize(mip: number=0, frame: number=0, face: number=0, slice: number=0): [number, number] {
		if (mip >= this.__mipmaps.length) throw Error(`Mipmap ${mip} does not exist in VDataCollection!`);
		if (frame >= this.__mipmaps[mip].length) throw Error(`Frame ${frame} does not exist in VDataCollection!`);
		if (face >= this.__mipmaps[mip][frame].length) throw Error(`Face ${face} does not exist in VDataCollection!`);
		if (slice >= this.__mipmaps[mip][frame][face].length) throw Error(`Slice ${slice} does not exist in VDataCollection!`);
		
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
	protected __frames: (VImageData|VEncodedImageData)[][][];

	__mipmapCount: number;
	__resizeMethod: Filter;
	__wrapH: boolean;
	__wrapV: boolean;

	constructor(frames: (VImageData|VEncodedImageData)[][][], options?: VMipmapProviderOptions) {
		this.__frames = frames;

		const [width, height] = this.getSize(0,0,0,0);
		this.__mipmapCount = options?.mipmaps ?? getThumbMip(width, height, 1) + 1;
		this.__resizeMethod = options?.filter ?? VFilters.Triangle;
		this.__wrapH = options?.wrap_h ?? false;
		this.__wrapV = options?.wrap_v ?? false;
	}

	getImage(mip: number, frame: number, face: number, slice: number): VImageData;
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded: true): VImageData|VEncodedImageData;
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded: boolean=false): VImageData|VEncodedImageData {
		if (mip >= this.__mipmapCount) throw new Error(`Mipmap ${mip} does not exist in VMipmapProvider!`);
		if (frame >= this.__frames.length) throw new Error(`Frame ${frame} does not exist in VMipmapProvider!`);
		if (face >= this.__frames[frame].length) throw new Error(`Face ${face} does not exist in VMipmapProvider!`);
		if (slice >= this.__frames[frame][face].length) throw new Error(`Slice ${slice} does not exist in VMipmapProvider!`);

		// Get image from storage and return if allowed
		let original = this.__frames[frame][face][slice];
		const [width, height] = this.getSize(mip, frame, face, slice);
		const size_matches = width === original.width && height === original.height;
		if (size_matches && allowEncoded) return original;

		// Decode if necessary
		if (original instanceof VEncodedImageData) original = this.__frames[frame][face][slice] = original.decode();
		else if (!(original instanceof VImageData)) throw TypeError(`Expected VImageData or VEncodedImageData in VDataProvider, but found ${(<any>original).constructor.name} instead!`);

		// Resize if necessary
		if (size_matches) return original;
		return resizeFiltered(original, width, height, { wrap_h: this.__wrapH, wrap_v: this.__wrapV, filter: this.__resizeMethod });
	}

	getSize(mip: number=0, frame: number=0, face: number=0, slice: number=0): [number, number] {
		if (mip >= this.__mipmapCount) throw new Error(`Mipmap ${mip} does not exist in VDataCollection!`);
		if (frame >= this.__frames.length) throw new Error(`Frame ${frame} does not exist in VDataCollection!`);
		if (face >= this.__frames[frame].length) throw new Error(`Face ${face} does not exist in VDataCollection!`);
		if (slice >= this.__frames[frame][face].length) throw new Error(`Slice ${slice} does not exist in VDataCollection!`);
		
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
