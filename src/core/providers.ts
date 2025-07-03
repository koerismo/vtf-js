import { VEncodedImageData, VImageData } from './image.js';
import { VFilter, VFilters, VImageScaler } from './resize.js';
import { getMipSize, getThumbMip } from './utils.js';

/** Defines an interface that can be used to provide image data to the Vtf encoder. */
export interface VDataProvider {
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded?: false): VImageData;
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded: true): VImageData|VEncodedImageData;
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded?: boolean): VImageData|VEncodedImageData;
	getSize(mip?: number, frame?: number, face?: number, slice?: number): [number, number];
	mipmapCount(): number;
	frameCount(): number;
	faceCount(): number;
	sliceCount(): number;
}

export interface VMipmapProviderOptions {
	filter?: VFilter;
	mipmaps?: number;
}

/** A class for storing collections of mipmaps, frames, faces, and slices. */
export class VDataCollection implements VDataProvider {
	private __mipmaps: (VImageData|VEncodedImageData)[][][][];

	constructor(mipmaps: (VImageData|VEncodedImageData)[][][][]) {
		this.__mipmaps = mipmaps;
	}

	/** Gets the specified image from the data provider, decoding if necessary unless `allowEncoded` is true. */
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded?: false): VImageData;
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
		if (!is_encoded && !is_decoded) throw TypeError(`Expected VImageData or VEncodedImageData in VDataProvider, but found ${image.constructor.name} instead!`);

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

	mipmapCount(): number { return this.__mipmaps.length }
	frameCount(): number { return this.__mipmaps[0]?.length ?? 0 }
	faceCount(): number { return this.__mipmaps[0]?.[0]?.length ?? 0 }
	sliceCount(): number { return this.__mipmaps[0]?.[0]?.[0]?.length ?? 0 }
}

/** A class that extends the base provider interface, but automatically generates mipmaps. */
export class VMipmapProvider implements VDataProvider {
	protected __frames: (VImageData|VEncodedImageData)[][][];

	protected __mipmap_count: number;
	protected __filter: VFilter;
	protected __scalers: VImageScaler[];

	constructor(frames: (VImageData|VEncodedImageData)[][][], options?: VMipmapProviderOptions) {
		this.__frames = frames;

		const [width, height] = this.getSize(0,0,0,0);
		this.__mipmap_count = options?.mipmaps ?? getThumbMip(width, height, 1) + 1;
		this.__filter = options?.filter ?? VFilters.Triangle;
		this.__scalers = new Array(this.__mipmap_count);
	}

	/** Gets the specified image from the data provider, decoding if necessary unless `allowEncoded` is true. */
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded?: false): VImageData;
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded: true): VImageData|VEncodedImageData;
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded: boolean=false): VImageData|VEncodedImageData {
		if (mip >= this.__mipmap_count) throw new Error(`Mipmap ${mip} does not exist in VMipmapProvider!`);
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
		else if (!(original instanceof VImageData)) throw TypeError(`Expected VImageData or VEncodedImageData in VDataProvider, but found ${(<object>original).constructor.name} instead!`);

		// Resize if necessary
		if (size_matches) return original;

		const scaler = (this.__scalers[mip] ??= new VImageScaler(original.width, original.height, width, height, this.__filter));
		const out_data = new (original.getDataConstructor())(width * height * 4);
		const out_image = new VImageData(out_data, width, height);
		return scaler.resize(original, out_image);
	}

	getSize(mip: number=0, frame: number=0, face: number=0, slice: number=0): [number, number] {
		if (mip >= this.__mipmap_count) throw new Error(`Mipmap ${mip} does not exist in VMipmapProvider!`);
		if (frame >= this.__frames.length) throw new Error(`Frame ${frame} does not exist in VMipmapProvider!`);
		if (face >= this.__frames[frame].length) throw new Error(`Face ${face} does not exist in VMipmapProvider!`);
		if (slice >= this.__frames[frame][face].length) throw new Error(`Slice ${slice} does not exist in VMipmapProvider!`);

		const img = this.__frames[frame][face][slice];
		return getMipSize(mip, img.width, img.height);
	}

	mipmapCount(): number { return this.__mipmap_count }
	frameCount(): number { return this.__mipmap_count ? this.__frames.length ?? 0 : 0 }
	faceCount(): number { return this.__mipmap_count ? this.__frames[0]?.length ?? 0 : 0 }
	sliceCount(): number { return this.__mipmap_count ? this.__frames[0]?.[0]?.length ?? 0 : 0 }
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
