import type { VCollection } from './core/collection.js';
import { VCompressionMethods, VFormats } from './core/enums.js';
import { VBaseResource, VEncodedResource, VResource, VResourceMapped, VResourceTypeMap, VThumbResource } from './core/resources.js';
import { getCodec } from './core/image.js';

import encode from './core/encode.js';
import decode from './core/decode.js';

/** Options for use with the {@link Vtf} constructor. */
export interface VtfConstructorOptions {
	version: number;
	format: VFormats;
	flags: number;
	meta: VBaseResource[];
	thumb: VThumbResource;

	reflectivity: Float32Array;
	first_frame: number;
	bump_scale: number;
	compression_level: number;
	compression_method: VCompressionMethods;
}

export type VtfDecodeOptions<HeaderOnly extends boolean = boolean> = {
	/** If true, skips decoding any of the Vtf body. @default false */
	headerOnly: HeaderOnly;
	/** If true, metadata resources will remain encoded until their data is explicitly requested. @default false */
	onDemand: boolean;
	/** If true, data will reference the original buffer and only be cloned when necessary. @default false */
	noClone: boolean;
};

/**
 * A decoded Vtf.
 * ```ts
 * const vtf = await Vtf.decode(myBuffer);
 * const image = vtf.data.getImage(0, 0, 0, 0);
 * ```
 */
export class Vtf {
	public body: VCollection;
	public thumb?: VThumbResource;
	public version: number;
	public format: VFormats;
	public flags: number;
	public meta: VResource[];

	public reflectivity: Float32Array;
	public first_frame: number;
	public bump_scale: number;
	public compression_level: number;
	public compression_method: VCompressionMethods;

	constructor(data: VCollection, options?: Partial<VtfConstructorOptions>) {
		this.body = data;

		this.version = options?.version ?? 4;
		this.format = options?.format ?? VFormats.RGBA8888;
		this.flags = options?.flags ?? 0x0;
		this.meta = options?.meta ?? [];
		this.thumb = options?.thumb;
		this.reflectivity = options?.reflectivity ?? new Float32Array(3);

		this.first_frame = options?.first_frame ?? 0;
		this.bump_scale = options?.bump_scale ?? 1.0;
		this.compression_level = options?.compression_level ?? 0;
		this.compression_method = options?.compression_method ?? VCompressionMethods.Deflate;
	}

	/**
	 * Retrieves the first resource that matches the given tag, or undefined.
	 * If the resource is encoded, it will be decoded in-place and returned.
	 */
	async getResource<T extends keyof VResourceTypeMap>(tag: T): Promise<InstanceType<VResourceTypeMap[T]> | undefined>;
	async getResource(tag: number): Promise<VResource | undefined>;
	async getResource(tag: number): Promise<VResourceMapped | VResource | undefined> {
		const idx = this.meta.findIndex((x) => x.tag === tag);
		if (idx === -1) return;

		let resource = this.meta[idx];
		if (resource instanceof VEncodedResource)
			resource = this.meta[idx] = await resource.decode();

		return resource;
	}

	/** Sets this Vtf's reflectivity from the smallest mipmap. If no mipmap exists, no action is taken and `false` is returned. */
	computeReflectivity(frame: number = 0, face: number = 0, slice: number = 0): boolean {
		const thumb = this.body.getRawThumbMip(1, frame, face, slice);
		if (!thumb) return false;

		this.reflectivity = thumb.decode().coerce(Float32Array).data.slice(0, 3);
		return true;
	}

	/** Sets this Vtf's thumbnail from the matching mipmap. If no mipmap exists, no action is taken and `false` is returned. */
	computeThumb(frame: number = 0, face: number = 0, slice: number = 0): boolean {
		const thumb = this.body.getRawThumbMip(16, frame, face, slice);
		if (!thumb) return false;

		this.thumb = new VThumbResource(0x0, thumb);
		return true;
	}

	/** Encodes this Vtf object into an ArrayBuffer. */
	encode(): Promise<ArrayBuffer> {
		return encode.call(this);
	}

	/**
	 * Parses the provided ArrayBuffer into a new Vtf object.
	 * @param data The Vtf file data.
	 * @param options Decoding-specific options. See {@link VtfDecodeOptions}.
	 */
	static decode(data: ArrayBufferLike, options?: Partial<VtfDecodeOptions<false>>): Promise<Vtf>;
	static decode(data: ArrayBufferLike, options: Partial<VtfDecodeOptions<true>>): Promise<VFileHeader>;
	static decode(data: ArrayBufferLike, options: Partial<VtfDecodeOptions>): Promise<Vtf | VFileHeader>;
	static decode(data: ArrayBufferLike, options?: Partial<VtfDecodeOptions>): Promise<Vtf | VFileHeader>;
	static decode(data: ArrayBufferLike, options?: Partial<VtfDecodeOptions>): Promise<Vtf | VFileHeader> {
		return decode.call(this, data, options);
	}
}

/** A decoded Vtf header. Returned by `Vtf.decode(...)` when `header_only` is `true`. */
export class VFileHeader {
	version!: number;
	width!: number;
	height!: number;
	flags!: number;
	frames!: number;
	first_frame!: number;
	reflectivity!: Float32Array;
	bump_scale!: number;
	format!: VFormats;
	mipmaps!: number;
	thumb_format!: VFormats;
	thumb_width!: number;
	thumb_height!: number;
	slices!: number;

	compression_method!: VCompressionMethods;
	compression_level!: number;
	compressed_lengths?: number[][][];

	/** Creates a new VFileHeader from the provided Vtf object. Used internally when encoding. */
	static fromVtf(vtf: Vtf): VFileHeader {
		const header = new VFileHeader();
		header.version = vtf.version;
		[header.width, header.height] = vtf.body.getSize();

		header.flags = vtf.flags;
		header.flags |= getCodec(vtf.format, false)?.alpha ?? 0;

		header.frames = vtf.body.getFrameCount();
		header.first_frame = vtf.first_frame;
		header.reflectivity = vtf.reflectivity;
		header.bump_scale = vtf.bump_scale;
		header.format = vtf.format;
		header.mipmaps = vtf.body.getMipmapCount();

		header.thumb_format = VFormats.DXT1;
		if (vtf.thumb) {
			header.thumb_width = vtf.thumb.image.width;
			header.thumb_height = vtf.thumb.image.height;
		} else {
			header.thumb_width = 0x0;
			header.thumb_height = 0x0;
		}

		header.slices = vtf.body.getSliceCount();
		header.compression_method = vtf.compression_method;
		header.compression_level = vtf.compression_level;
		return header;
	}
}
