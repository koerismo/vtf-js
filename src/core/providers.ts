import { VImageData, type VImageEither } from './image.js';
import { VFilter, VFilters, VImageScaler } from './resize.js';
import { getMipSize, getThumbMip } from './utils.js';

// TODO:
// add generateMips() func to VDataCollection
// add generateThumb() etc.
// make shared "default" filter preset

export interface VSliceSize {
	width: number;
	height: number;
}

export interface VCollectionSize {
	mips: number;
	frames: number;
	faces: number;
	slices: number;
}

export interface VDataCollectionOptions extends VCollectionSize {
	resizeFilter: VFilter;
	resizeClamp: boolean;
}

/** Defines an interface that can be used to provide image data to the Vtf encoder. */
export interface VDataProvider {
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded?: false): VImageData;
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded: true): VImageEither;
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded?: boolean): VImageEither;
	getSize(mip?: number, frame?: number, face?: number, slice?: number): [number, number];
	getMipmapCount(): number;
	getFrameCount(): number;
	getFaceCount(): number;
	getSliceCount(): number;
}

const ERROR_INVALID_CONSTRUCTOR = Error('Invalid VDataCollection constructor! Expected (<w>, <h>) or ({ width: <w>, height: <h>, ... })!');

/** A class for storing collections of mipmaps, frames, faces, and slices. */
export class VDataCollection implements VDataProvider {
	protected vdata: (VImageEither | undefined)[][][][] = [];

	protected mipmapCount: number = 1;
	protected frameCount: number = 1;
	protected faceCount: number = 1;
	protected sliceCount: number = 1;

	protected width: number = 0;
	protected height: number = 0;
	protected invalidated: boolean = false;

	public resizeFilter: VFilter = VFilters.Default;
	public resizeClamp: boolean = false;

	constructor(width: number, height: number);
	constructor(options: VSliceSize & Partial<VDataCollectionOptions>);
	constructor(
		options: number | VSliceSize & Partial<VDataCollectionOptions>,
		height?: number
	) {
		if (typeof options === 'object') {
			if (options.resizeFilter) this.resizeFilter = options.resizeFilter;
			if (options.resizeClamp) this.resizeClamp = options.resizeClamp;
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
			throw ERROR_INVALID_CONSTRUCTOR;
		}
	}

	/** Returns whether the given coordinates (mip, frame, face, slice) are within this collection. */
	isInBounds(x: number, y: number, z: number, w: number): boolean {
		if (x < 0 || y < 0 || z < 0 || w < 0) return false;
		return (x < this.mipmapCount && y < this.frameCount && z < this.faceCount && w < this.sliceCount);
	}

	/** Returns whether this collection has valid dimensions. */
	hasValidBounds() {
		return (this.mipmapCount && this.frameCount && this.faceCount && this.sliceCount && this.width && this.height);
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
		for (let x=0; x<this.mipmapCount; x++) {
			(this.vdata[x] ??= new Array(this.frameCount)).length = this.frameCount;
			for (let y=0; y<this.frameCount; y++) {
				(this.vdata[x][y] ??= new Array(this.faceCount)).length = this.faceCount;
				for (let z=0; z<this.faceCount; z++) {
					(this.vdata[x][y][z] ??= new Array(this.sliceCount)).length = this.sliceCount;
				}
			}
		}

		return this;
	}

	setImage(image: VImageEither, mip: number=0, frame: number=0, face: number=0, slice: number=0) {
		if (!this.isInBounds(mip, frame, face, slice))
			throw Error(`setImage: Attempted to set image out-of-bounds!`);

		const [w_exp, h_exp] = getMipSize(mip, this.width, this.height);
		if (image.width !== w_exp || image.height !== h_exp) throw Error(`setImage: Expected image to be ${w_exp}x${h_exp} for mipmap ${mip}, but got ${image.width}x${image.height} instead!`);

		this.vdata[mip][frame][face][slice] = image;
	}

	/**
	 * Alias to quickly check if a mip of a given size exists within this collection, returning it if so.
	 * 
	 * Unlike {@link getImage}, this method **allows encoded images by default.** Beware!
	 */
	getThumbMip(maxDim: number, frame: number, face: number, slice: number, allowEncoded: false): VImageData | undefined;
	getThumbMip(maxDim: number, frame?: number, face?: number, slice?: number, allowEncoded?: boolean): VImageEither | undefined;
	getThumbMip(maxDim: number, frame: number=0, face: number=0, slice: number=0, allowEncoded: boolean=true): VImageEither | undefined {
		const mip = getThumbMip(this.width, this.height, maxDim);
		if (mip >= this.mipmapCount) return;
		return this.getImage(mip, frame, face, slice, allowEncoded);
	}

	/** Gets the specified image from the data provider, decoding if necessary unless `allowEncoded` is true. */
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded?: false): VImageData;
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded: boolean): VImageEither;
	getImage(mip: number, frame: number, face: number, slice: number, allowEncoded: boolean=false): VImageEither {
		if (!this.isInBounds(mip, frame, face, slice))
			throw Error(`getImage: Attempted to get image out-of-bounds!`);

		let image = this.vdata[mip][frame][face][slice];
		if (!image) {
			if (mip === 0)
				throw Error(`getImage: Image at (${mip}, ${frame}, ${face}, ${slice}) does not exist in collection!`);
			else
				throw Error(`getImage: Mipmap at (${mip}, ${frame}, ${face}, ${slice}) does not exist in collection! Did you forget to run generateMips?`);
		}

		if (image.isEncoded && !allowEncoded)
			image = this.vdata[mip][frame][face][slice] = image.decode();

		return image;
	}

	getSize(mip: number=0): [number, number] {
		if (mip === 0) return [this.width, this.height];
		return getMipSize(mip, this.width, this.height);
	}

	/**
	 * Generates mipmaps for all frames/faces/slices.
	 * @param overwrite If true, all mips will be generated from the top-level image.
	 * @param filter The filter override to use.
	 * @returns Whether the operation succeeded.
	 */
	generateMips(allFromTop: boolean=false, filter: VFilter=this.resizeFilter): boolean {
		if (!this.hasValidBounds()) return false;

		const scalerCache: Record<string, VImageScaler> = {};
		const getScaler = (from: [number, number], to: [number, number]) => {
			const key = from[0] + ':' + from[1] + '/' + to[0] + ':' + to[1];
			return key in scalerCache
				? scalerCache[key]
				: (scalerCache[key] = new VImageScaler(...from, ...to, filter));
		}

		for (let y=0; y<this.frameCount; y++) {
			for (let z=0; z<this.faceCount; z++) {
				for (let w=0; w<this.sliceCount; w++) {

					// Only decode if absolutely necessary.
					// If all mips are in place, this won't happen.
					let lastMip = this.getImage(0, y, z, w, true);

					for (let x=1; x<this.mipmapCount; x++) {
						let curMip = this.vdata[x][y][z][w];
						
						// If this mipmap doesn't already exist, fill it in.
						if (!curMip || allFromTop) {
							lastMip = lastMip.decode();

							const curMipDims = getMipSize(x, this.width, this.height);
							const scaler = getScaler([lastMip.width, lastMip.height], curMipDims);
							curMip = VImageData.blank(...curMipDims, lastMip.getDataConstructor());
							scaler.resize(lastMip, curMip, this.resizeClamp);
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

	getMipmapCount(): number { return this.mipmapCount }
	getFrameCount(): number { return this.frameCount }
	getFaceCount(): number { return this.faceCount }
	getSliceCount(): number { return this.sliceCount }
}

/** A class that extends VMipmapProvider but takes an array of frames in the constructor. */
export class VFrameCollection extends VDataCollection {
	constructor(frameList: VImageData[], options?: VDataCollectionOptions) {
		if (!frameList.length) throw Error('VFrameCollection constructor requires at least one item in the provided array!');
		const width = frameList[0].width, height = frameList[0].height;
		super({ width, height, frames: frameList.length, ...options });

		for (let i=0; i<frameList.length; i++) {
			this.setImage(frameList[i], 0, i);
		}
	}
}

/** A class that extends VMipmapProvider but takes an array of faces in the constructor. */
export class VFaceCollection extends VDataCollection {
	constructor(faceList: VImageData[], options?: VDataCollectionOptions) {
		if (!faceList.length) throw Error('VFaceCollection constructor requires at least one item in the provided array!');
		const width = faceList[0].width, height = faceList[0].height;
		super({ width, height, faces: faceList.length, ...options });

		for (let i=0; i<faceList.length; i++) {
			this.setImage(faceList[i], 0, 0, i);
		}
	}
}

/** A class that extends VMipmapProvider but takes an array of slices in the constructor. */
export class VSliceCollection extends VDataCollection {
	constructor(sliceList: VImageData[], options?: VDataCollectionOptions) {
		if (!sliceList.length) throw Error('VSliceCollection constructor requires at least one item in the provided array!');
		const width = sliceList[0].width, height = sliceList[0].height;
		super({ width, height, slices: sliceList.length, ...options });

		for (let i=0; i<sliceList.length; i++) {
			this.setImage(sliceList[i], 0, 0, 0, i);
		}
	}
}
