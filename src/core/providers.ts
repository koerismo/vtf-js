import { VImageData, type VImageEither } from './image.js';
import { VFilter, VFilters, VImageScaler } from './resize.js';
import { getMipSize, getThumbMip } from './utils.js';

// TODO:
// add generateThumb() etc.
// make shared "default" filter preset

export interface VSliceSize {
	width: number;
	height: number;
}

export interface VCollectionSize {
	/** The number of mimaps in this collection, or -1 to infer. */
	mips: number;
	/** The number of frames in this collection.  */
	frames: number;
	/** The number of faces in this collection.  */
	faces: number;
	/** The number of slices in this collection.  */
	slices: number;
}


/** A class for storing collections of mipmaps, frames, faces, and slices. */
export class VCollection {
	protected vdata: (VImageEither | undefined)[][][][] = [];

	protected mipmapCount: number = 1;
	protected frameCount: number = 1;
	protected faceCount: number = 1;
	protected sliceCount: number = 1;

	protected width: number = 0;
	protected height: number = 0;

	static fromFrames(frameList: VImageEither[], options?: Partial<Omit<VCollectionSize, 'frames'>>) {
		if (!frameList.length)
			throw Error(
				'VDataCollection.fromFrames: Requires at least one item in the provided array!',
			);
		const width = frameList[0].width,
			height = frameList[0].height;

		const col = new VCollection({ width, height, frames: frameList.length, ...options });
		for (let i = 0; i < frameList.length; i++) col.setImage(frameList[i], 0, i);
		return col;
	}

	static fromFaces(faceList: VImageEither[], options?: Partial<Omit<VCollectionSize, 'faces'>>) {
		if (!faceList.length)
			throw Error(
				'VDataCollection.fromFaces: Requires at least one item in the provided array!',
			);
		const width = faceList[0].width,
			height = faceList[0].height;

		const col = new VCollection({ width, height, faces: faceList.length, ...options });
		for (let i = 0; i < faceList.length; i++) col.setImage(faceList[i], 0, 0, i);
		return col;
	}

	constructor(width: number, height: number);
	constructor(options: VSliceSize & Partial<VCollectionSize>);
	constructor(options: number | (VSliceSize & Partial<VCollectionSize>), height?: number) {
		if (typeof options === 'object') {
			this.width = options.width;
			this.height = options.height;
			this.resize(options);
		} else {
			this.width = options;
			this.height = height!;
		}

		if (
			typeof this.width !== 'number' ||
			typeof this.height !== 'number' ||
			this.width <= 0 ||
			this.height <= 0
		) {
			throw Error(
				'VDataCollection: Invalid constructor! Expected (<w>, <h>) or ({ width: <w>, height: <h>, ... })!',
			);
		}
	}

	/** Returns whether the given coordinates (mip, frame, face, slice) are within this collection. */
	isInBounds(x: number, y: number, z: number, w: number): boolean {
		if (x < 0 || y < 0 || z < 0 || w < 0) return false;
		return (
			x < this.mipmapCount && y < this.frameCount && z < this.faceCount && w < this.sliceCount
		);
	}

	/** Returns whether this collection has valid dimensions. */
	hasValidBounds() {
		return (
			this.mipmapCount &&
			this.frameCount &&
			this.faceCount &&
			this.sliceCount &&
			this.width &&
			this.height
		);
	}

	/** Replaces the internal array with a fresh one, dereferencing all images. */
	clear(): this {
		this.vdata = [];
		this.resize();
		return this;
	}

	/** Resizes this data collection. This does not resize the actual images! */
	resize(options?: Partial<VCollectionSize>): this {
		if (options) {
			if (options.mips) this.mipmapCount = options.mips;
			if (options.frames) this.frameCount = options.frames;
			if (options.faces) this.faceCount = options.faces;
			if (options.slices) this.sliceCount = options.slices;
		}

		// TODO: ADD A BETTER WAY OF AUTO-SETTING MIP LEVELS!!!
		if (this.mipmapCount === -1) {
			this.mipmapCount = Math.max(1, getThumbMip(this.width, this.height, 1) + 1);
		}

		this.vdata.length = this.mipmapCount;
		for (let x = 0; x < this.mipmapCount; x++) {
			(this.vdata[x] ??= new Array(this.frameCount)).length = this.frameCount;
			for (let y = 0; y < this.frameCount; y++) {
				(this.vdata[x][y] ??= new Array(this.faceCount)).length = this.faceCount;
				for (let z = 0; z < this.faceCount; z++) {
					(this.vdata[x][y][z] ??= new Array(this.sliceCount)).length = this.sliceCount;
				}
			}
		}

		return this;
	}

	/** Sets or resets the image at the given position. */
	setImage(
		image: VImageEither | null,
		mip: number = 0,
		frame: number = 0,
		face: number = 0,
		slice: number = 0,
	): void {
		if (!this.isInBounds(mip, frame, face, slice))
			throw Error(`setImage: Attempted to set image out-of-bounds!`);

		if (image) {
			const [w_exp, h_exp] = getMipSize(mip, this.width, this.height);
			if (image.width !== w_exp || image.height !== h_exp)
				throw Error(
					`setImage: Expected image to be ${w_exp}x${h_exp} for mipmap ${mip}, but got ${image.width}x${image.height} instead!`,
				);
		} else {
			if (image !== undefined)
				throw Error(`setImage: Expected VImageData, VEncodedImageData, or null!`);
		}

		this.vdata[mip][frame][face][slice] = image ?? undefined;
	}

	/**
	 * Shorthand to check if a mip of the given size exists within this collection, returning it if so.
	 */
	getRawThumbMip(
		maxDim: number,
		frame: number = 0,
		face: number = 0,
		slice: number = 0,
	): VImageEither | undefined {
		const mip = getThumbMip(this.width, this.height, maxDim);
		if (mip >= this.mipmapCount) return;
		return this.getRawImage(mip, frame, face, slice);
	}

	/**
	 * Gets the specified image from the collection and decodes it if necessary.
	 * If an image is decoded, it will replace the original in this collection automatically.
	 * @see {@link VCollection.getRawImage()}
	 */
	getImage(mip: number, frame: number, face: number, slice: number): VImageData {
		let image = this.getRawImage(mip, frame, face, slice);
		if (image.isEncoded) image = this.vdata[mip][frame][face][slice] = image.decode();
		return image;
	}

	/**
	 * Gets the specified image from the collection without any decoding.
	 * @see {@link VCollection.getImage()}
	 */
	getRawImage(mip: number, frame: number, face: number, slice: number): VImageEither {
		if (!this.isInBounds(mip, frame, face, slice))
			throw Error(`VCollection.getRawImage: Attempted to get image out-of-bounds!`);

		const image = this.vdata[mip][frame][face][slice];
		if (!image)
			throw Error(
				`VCollection.getRawImage: Image at (mip=${mip}, frame=${frame}, face=${face}, slice=${slice}) does not exist in collection!`,
			);

		return image;
	}

	getSize(mip: number = 0): [number, number] {
		if (mip === 0) return [this.width, this.height];
		return getMipSize(mip, this.width, this.height);
	}

	/**
	 * Generates mipmaps for all frames/faces/slices.
	 * @param [filter=VFilters.Default] The filter to use. Defaults to {@link VFilters.Default}
	 * @param [allFromTop=true] If false, mipmaps will cascade without overwriting existing ones.
	 * @returns Whether the operation succeeded.
	 */
	generateMips(filter: VFilter = VFilters.Default, allFromTop: boolean = true): boolean {
		if (!this.hasValidBounds()) return false;

		const sharedCoeffCache: Record<string, Float32Array> = {};
		const scalerCache: Record<string, VImageScaler> = {};

		const getScaler = (from: [number, number], to: [number, number]) => {
			const key = from[0] + ',' + from[1] + ',' + to[0] + ',' + to[1];
			return key in scalerCache
				? scalerCache[key]
				: (scalerCache[key] = new VImageScaler(...from, ...to, filter, sharedCoeffCache));
		};

		for (let y = 0; y < this.frameCount; y++) {
			for (let z = 0; z < this.faceCount; z++) {
				for (let w = 0; w < this.sliceCount; w++) {
					// Only decode if absolutely necessary.
					// If all mips are in place, this won't happen.
					let lastMip = this.getRawImage(0, y, z, w);

					for (let x = 1; x < this.mipmapCount; x++) {
						let curMip = this.vdata[x][y][z][w];

						// If this mipmap doesn't already exist, fill it in.
						if (!curMip || allFromTop) {
							lastMip = lastMip.decode();

							const curMipDims = getMipSize(x, this.width, this.height);
							const scaler = getScaler([lastMip.width, lastMip.height], curMipDims);
							curMip = VImageData.blank(...curMipDims, lastMip.getDataConstructor());
							scaler.resize(lastMip, curMip);
							this.setImage(curMip, x, y, z, w);
						}

						// Continue!
						lastMip = curMip;
					}
				}
			}
		}

		return true;
	}

	getMipmapCount(): number {
		return this.mipmapCount;
	}
	getFrameCount(): number {
		return this.frameCount;
	}
	getFaceCount(): number {
		return this.faceCount;
	}
	getSliceCount(): number {
		return this.sliceCount;
	}
}
