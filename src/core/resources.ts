import { VEncodedImageData, getCodec, type VImageEither } from './image.js';
import { getFaceCount, getMipSize, compress, decompress } from './utils.js';
import { VFileHeader, VtfDecodeOptions } from '../vtf.js';
import { NO_DATA, VFormats } from './enums.js';
import { VCollection } from './collection.js';
import { DataBuffer } from './buffer.js';


// #region Headers


/** A collection of common resource header tags as BE 24-bit integers. */
export const VHeaderTags = {
	TAG_LEGACY_BODY: 0x30_00_00,
	TAG_LEGACY_THUMB: 0x01_00_00,
	TAG_CRC: 0x43_52_43,
	TAG_KVD: 0x48_56_44,
	TAG_LOD: 0x4c_4f_44,
	TAG_SHEET: 0x10_00_00,
	TAG_TS0: 0x54_54_30,
	TAG_AXC: 0x41_58_43,
	TAG_HOTSPOT: 0x2b_00_00, // +\0\0
} as const satisfies Record<string, number>;

/** Implements a resource header. This serves as a container to provide to {@link VResourceStatic} when decoding. */
export class VHeader {
	constructor(
		public readonly tag: number,
		public readonly flags: number,
		public readonly start: number
	) {}

	/** Returns true if the `0x2` flag is unset. */
	hasData(): boolean {
		return !(this.flags & NO_DATA);
	}
}


export type Awaitable<T> = T | Promise<T>;
export type ValueOf<T> = T[keyof T];

/** Defines a resource decoder. */
export interface VResourceStatic {
	/** If true, this resource should be considered a "legacy" resource with no predefined length. Defaults to false. */
	readonly isLegacy?: boolean;
	/** Decodes this resource from its raw data. */
	decode(header: VHeader, view: DataBuffer | undefined, info: VFileHeader, options: VtfDecodeOptions): Awaitable<VResource>;
}

/** Defines a generic resource entry. All resources are required to implement this interface! */
export interface VResource {
	/** The tag of this resource. Accessed by `Vtf` to encode the resource header. */
	readonly tag: number;
	/** The flags of this resource. Accessed by `Vtf` to encode the resource header. */
	flags: number;
	/** Encode the body of this resource into an ArrayBuffer. */
	encode(info: VFileHeader): Awaitable<ArrayBuffer | undefined>;
}

/** Implements a generic resource entry. This can be subclassed to quickly implement {@link VResource}. */
export class VBaseResource implements VResource {
	static readonly isLegacy: boolean = false;

	constructor(
		public readonly tag: number,
		public flags: number,
		public raw?: DataBuffer) {
	}

	static decode(header: VHeader, view: DataBuffer | undefined, info: VFileHeader, options: VtfDecodeOptions): Awaitable<VBaseResource> {
		return new VBaseResource(header.tag, header.flags, view);
	}

	encode(info: VFileHeader): Awaitable<ArrayBuffer | undefined> {
		return this.raw?.buffer;
	}
}

/**
 * A resource which has not yet been decoded. See {@link VEncodedResource.decode()}.
 */
export class VEncodedResource extends VBaseResource {
	constructor(
		protected readonly header: VHeader,
		protected readonly view: DataBuffer | undefined,
		protected readonly info: VFileHeader,
		protected readonly options: VtfDecodeOptions,
	) {
		super(header.tag, header.flags, view);
	}

	isKnown(): boolean {
		return this.tag in VResourceTypes;
	}

	decode(): Awaitable<VResource> {
		return getResourceByType(this.tag)
			.decode(this.header, this.view, this.info, this.options);
	}
}

/** @internal The hi-res image data resource. This is managed internally! */
export class VBodyResource extends VBaseResource {
	static readonly isLegacy = true;

	constructor(
			flags: number,
			public images: VCollection
		) {
		super(VHeaderTags.TAG_LEGACY_BODY, flags);
	}

	static async decode(header: VHeader, view: DataBuffer, info: VFileHeader, options: VtfDecodeOptions): Promise<VBodyResource> {
		const face_count = getFaceCount(info);
		const codec = getCodec(info.format);
		const collection = new VCollection({
			width: info.width,
			height: info.height,
			mips: info.mipmaps,
			frames: info.frames,
			faces: face_count,
			slices: info.slices,
		});

		for ( let x=info.mipmaps-1; x>=0; x-- ) { // Vtfs store mipmaps smallest-to-largest
			for ( let y=0; y<info.frames; y++ ) {
				for ( let z=0; z<face_count; z++ ) {
					const [width, height] = getMipSize(x, info.width, info.height);
					const uncompressed_length = codec.length(width, height);

					// AXC compression works on every mip/frame/face, but joins all slices together
					let subview: DataBuffer;
					if (info.compression_level !== 0) {
						const compressed_length = info.compressed_lengths![x][y][z];
						const slice_data = view.read_u8array(compressed_length, false);
						subview = new DataBuffer(await decompress(slice_data, info.compression_method, info.compression_level));
					} else {
						const collated_length = uncompressed_length * info.slices;
						subview = view.ref(view.inc(collated_length), collated_length);
					}

					for ( let w=0; w<info.slices; w++ ) {
						const data = subview.read_u8array(uncompressed_length, !options.noClone);
						const image = new VEncodedImageData(data, width, height, info.format);
						collection.setImage(image, x, y, z, w);
					}
				}
			}
		}

		return new VBodyResource(header.flags, collection);
	}

	async encode(info: VFileHeader): Promise<ArrayBuffer> {
		const face_count = getFaceCount(info);
		const codec = getCodec(info.format);

		const packed_slices: Uint8Array[] = [];
		let packed_length = 0;

		const cl_mipmaps = info.compressed_lengths = new Array<number[][]>(info.mipmaps);
		for ( let x=info.mipmaps-1; x >= 0; x-- ) { // mipmaps
			
			const cl_frames = cl_mipmaps[x] = new Array<number[]>(info.frames);
			for ( let y=0; y < info.frames; y++ ) { // frames
				
				const cl_faces = cl_frames[y] = new Array<number>(face_count);
				for ( let z=0; z < face_count; z++ ) { // faces

					const [width, height] = getMipSize(x, info.width, info.height);
					const uncompressed_length = codec.length(width, height);
					const subview = new DataBuffer(uncompressed_length * info.slices);

					for ( let w=0; w < info.slices; w++ ) { // slices
						const slice = this.images.getRawImage(x, y, z, w);

						// If slice is encoded, .encode() will no-op if the format matches. Otherwise, it is re-encoded.
						// If slice isn't encoded, it will be encoded into the desired format.
						const sliceData = slice.encode(info.format).data;
						subview.write_u8array(sliceData);
					}

					// Compress
					let data: Uint8Array = subview;
					if (info.compression_level !== 0) {
						data = await compress(data, info.compression_method, info.compression_level);
					}

					cl_faces[z] = data.length;
					packed_slices.push(data);
					packed_length += data.length;
				}
			}
		}

		const view = new DataBuffer(packed_length);
		for (let i=0; i<packed_slices.length; i++) {
			view.write_u8array(packed_slices[i]);
		}
		return view.buffer;
	}
}

/** The low-res image data resource. */
export class VThumbResource extends VBaseResource {
	static readonly isLegacy = true;
	public image: VImageEither;

	constructor(
			flags: number,
			image?: VImageEither
		) {
		super(VHeaderTags.TAG_LEGACY_THUMB, flags);
		this.image = image ?? new VEncodedImageData(new Uint8Array(0), 0, 0, VFormats.DXT1);
		this.flags = (flags ^ (flags & NO_DATA)) | (this.hasImage() ? 0 : NO_DATA);
	}

	static decode(header: VHeader, view: DataBuffer | undefined, info: VFileHeader, options: VtfDecodeOptions): VThumbResource {
		const codec = getCodec(info.thumb_format);
		if (!view) {
			if (info.thumb_width === 0 || info.thumb_height === 0) return new VThumbResource(header.flags);
			throw Error('VThumbnailResource: Attempted to decode non-empty thumbnail without any data!');
		}
		const data = view.read_u8array(codec.length(info.thumb_width, info.thumb_height), !options.noClone);
		const image = new VEncodedImageData(data, info.thumb_width, info.thumb_height, info.thumb_format);
		return new VThumbResource(header.flags, image);
	}

	hasImage(): boolean {
		return this.image.width !== 0 && this.image.height !== 0;
	}

	encode(info: VFileHeader): ArrayBuffer {
		if (!this.hasImage()) return new ArrayBuffer(0);
		return this.image.encode(info.thumb_format).data.buffer as ArrayBuffer;
	}
}

// Sprite sheet parsing adapted from Jasper's Noclip code
// https://github.com/magcius/noclip.website/blob/master/src/SourceEngine/ParticleSystem.ts#L1191-L1200

export interface SheetFrame {
	coords: Float32Array[]; // [u0, v0, u1, v1][]
	duration: number;
}

export interface SheetSequence {
	id: number;
	clamp: boolean;
	duration: number;
	frames: SheetFrame[];
}

export class VSheetResource extends VBaseResource {
	constructor(
		flags: number,
		public version: number,
		public sequences: SheetSequence[]) {
		super(VHeaderTags.TAG_SHEET, flags);
	}

	static decode(header: VHeader, view: DataBuffer, info: VFileHeader): VSheetResource {
		const version = view.read_u32();
		if (version < 0 || version > 1)
			throw Error(`VSheetResource: Invalid sheet resource version! (${version})`);

		const coordsPerFrame = version === 1 ? 4 : 1;
		const sequenceCount = view.read_u32();
		const sequences = new Array<SheetSequence>(sequenceCount);

		for (let i=0; i<sequenceCount; i++) {
			const id = view.read_u32();
			const clamp = !!view.read_u32();
			const frameCount = view.read_u32();
			const duration = view.read_f32();

			const frames = new Array<SheetFrame>(frameCount);
			for (let j=0; j<frameCount; j++) {
				const duration = view.read_f32();

				const coords = new Array<Float32Array>(coordsPerFrame);
				for (let k=0; k<coordsPerFrame; k++) {
					coords[k] = view.read_f32array(4, true);
				}

				frames[j] = { duration, coords };
			}

			sequences[i] = { id, clamp, duration, frames };
		}

		return new VSheetResource(header.flags, version, sequences);
	}

	encode(info: VFileHeader): ArrayBuffer {
		const coordsPerFrame = this.version === 1 ? 4 : 1;

		let buffer_length = 4;
		for (let i=0; i<this.sequences.length; i++) {
			buffer_length +=
				16 + this.sequences[i].frames.length * (4 + 16 * coordsPerFrame);
		}

		const view = new DataBuffer(buffer_length);
		view.write_u32(this.version);

		for (let i=0; i<this.sequences.length; i++) {
			const sequence = this.sequences[i];
			view.write_u32(sequence.id);
			view.write_u32(sequence.clamp ? 0xff : 0x00);
			view.write_u32(sequence.frames.length);
			view.write_f32(sequence.duration);

			for (let j=0; j<sequence.frames.length; j++) {
				const frame = sequence.frames[j];
				view.write_f32(frame.duration);

				if (coordsPerFrame !== frame.coords.length)
					throw Error(`VSheetResource: Expected ${coordsPerFrame} coordinate sets, but got ${frame.coords.length}!`);
				for (let k=0; k<coordsPerFrame; k++) {
					if (frame.coords[k].length !== 4)
						throw Error('VSheetResource: SheetFrame coords must be of length 4!');
					view.write_f32array(frame.coords[k]);
				}
			}
		}

		return view.buffer;
	}
}

export class VExtendedSettingsResource extends VBaseResource {
	constructor(
		flags: number,
		public textureFlags: number) {
		super(VHeaderTags.TAG_TS0, flags);
	}

	static decode(header: VHeader, view?: DataBuffer): VExtendedSettingsResource {
		if (!view) return new VExtendedSettingsResource(0, 0);
		return new VExtendedSettingsResource(header.flags, view.read_u32());
	}

	encode(): ArrayBuffer {
		const view = new DataView(new ArrayBuffer(4));
		view.setUint32(0, this.textureFlags, true);
		return view.buffer;
	}
}

export class VLodControlResource extends VBaseResource {
	constructor(
		flags: number,
		public resolutionClampX: number,
		public resolutionClampY: number,
		public x360_resolutionClampX: number,
		public x360_resolutionClampY: number) {
		super(VHeaderTags.TAG_LOD, flags);
	}

	static decode(header: VHeader, view?: DataBuffer): VLodControlResource {
		if (!view) throw Error(`VLodControlResource.decode: No body data present for resource!`);
		return new VLodControlResource(
			header.flags,
			view[0],
			view[1],
			view[2],
			view[3]
		);
	}

	encode(): ArrayBuffer {
		const arr = new Uint8Array(4);
		arr[0] = this.resolutionClampX;
		arr[1] = this.resolutionClampY;
		arr[2] = this.x360_resolutionClampX;
		arr[3] = this.x360_resolutionClampY;
		return arr.buffer;
	}
}

/** Defines flags which can be used to modify the behavior of Hotspot regions. */
export const HotSpotRectFlags = {
	AllowRotation: 0x1,
	AllowReflection: 0x2,
	AltGroup: 0x4,
	TileX: 0x8,
	TileY: 0x10,
} as const;

/** Defines a Hotspot rect in pixel space. */
export class HotspotRect {
	constructor(
		public flags: number,
		public min_x: number,
		public min_y: number,
		public max_x: number,
		public max_y: number,
	) {}

	get width(): number { return this.max_x - this.min_x; }
	get height(): number { return this.max_y - this.min_y; }

	canRotate(): boolean { return !!(this.flags & HotSpotRectFlags.AllowRotation); }
	canReflect(): boolean { return !!(this.flags & HotSpotRectFlags.AllowReflection); }
	isAltGroup(): boolean { return !!(this.flags & HotSpotRectFlags.AltGroup); }
	canTileX(): boolean { return !!(this.flags & HotSpotRectFlags.TileX); }
	canTileY(): boolean { return !!(this.flags & HotSpotRectFlags.TileY); }
}

/** The Hotspot data resource. See {@link https://wiki.stratasource.org/modding/formats/vtf-hotspot-resource this page} for more information. */
export class VHotspotResource extends VBaseResource {
	constructor(
			flags: number,
			public version: number,
			public editorFlags: number,
			public rects: HotspotRect[]
		) {
		super(VHeaderTags.TAG_HOTSPOT, flags);
	}

	static decode(header: VHeader, view: DataBuffer, info: VFileHeader): VHotspotResource {
		if (!header.hasData())
			return new VHotspotResource(header.flags, 0, 0, []);

		const version = view.read_u8();
		if (version !== 0x1) throw Error(`VSheetResource.decode: Invalid version! (Expected 1, got ${version})`);

		const flags     = view.read_u8();
		const rectCount = view.read_u16();

		const rects = Array<HotspotRect>(rectCount);
		for (let i=0; i<rectCount; i++) {
			rects[i] = new HotspotRect(
				view.read_u8(),
				view.read_u16(),
				view.read_u16(),
				view.read_u16(),
				view.read_u16(),
			);
		}

		return new VHotspotResource(header.flags, version, flags, rects);
	}

	encode(info: VFileHeader): ArrayBuffer {
		if (this.version !== 0x1)
			throw Error(`VHotspotResource.encode: Invalid version! (Expected 1, got ${this.version})`);

		const length = 4 + this.rects.length * 9;
		const view = new DataBuffer(length);

		view.write_u8(this.version);
		view.write_u8(this.editorFlags);
		view.write_u16(this.rects.length);

		for (let i=0; i<this.rects.length; i++) {
			const rect = this.rects[i];
			view.write_u8(rect.flags);
			view.write_u16(rect.min_x);
			view.write_u16(rect.min_y);
			view.write_u16(rect.max_x);
			view.write_u16(rect.max_y);
		}

		return view.buffer;
	}
}


// #region Resource Types

export type VResourceMapped = VResourceTypeMap[keyof VResourceTypeMap];

export interface VResourceTypeMap {
	[VHeaderTags.TAG_SHEET]: typeof VSheetResource;
	[VHeaderTags.TAG_TS0]: typeof VExtendedSettingsResource;
	[VHeaderTags.TAG_LOD]: typeof VLodControlResource;
	[VHeaderTags.TAG_HOTSPOT]: typeof VHotspotResource;
}

/**
 * A map of header tags and their corresponding decoders.
 * Using {@link registerResourceType} to register new tags is recommended!
 */
export const VResourceTypes: Record<number, VResourceStatic> = {
	[VHeaderTags.TAG_SHEET]: VSheetResource,
	[VHeaderTags.TAG_TS0]: VExtendedSettingsResource,
	[VHeaderTags.TAG_LOD]: VLodControlResource,
	[VHeaderTags.TAG_HOTSPOT]: VHotspotResource,
} satisfies VResourceTypeMap;


/** Registers a resource to be used when the specified tag is encountered. */
export function registerResourceType<T extends keyof VResourceTypeMap>(resource: VResourceTypeMap[T], tag: T): void;
/**
 * @deprecated
 * Resource not defined in typings!
 * 
 * ## Add this resource by re-declaring `VResourceTypeMap` to get intellisense!
 * 
 * @example
 * ```ts
 * declare module "vtf-js/resources" {
 *     interface VResourceTypeMap {
 *         [VHeaderTags.TAG_KVD]: typeof CustomKeyValuesResource;
 *     }
 * }
 * ```
 */
export function registerResourceType(resource: VResourceStatic, tag: number): void;
export function registerResourceType(resource: VResourceStatic, tag: number) {
	VResourceTypes[tag] = resource;
}

/** Gets the resource associated with the given tag, or {@link VBaseResource} if none is associated. */
export function getResourceByType(tag: number): VResourceStatic {
	return VResourceTypes[tag] ?? VBaseResource;
}
