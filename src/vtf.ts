import type { VDataProvider } from './core/providers.js';
import { VCompressionMethods, VFormats } from './core/enums.js';
import { VResource } from './core/resources.js';
import { getThumbMip } from './core/utils.js';

export interface VConstructorOptions {
	version?: number;
	format?: VFormats;
	flags?: number;
	meta?: VResource[];

	reflectivity?: Float32Array;
	first_frame?: number;
	bump_scale?: number;
	compression_level?: number;
	compression_method?: VCompressionMethods;
}

export class Vtf {
	public data: VDataProvider;
	public version: number;
	public format: VFormats;
	public flags: number;
	public meta: VResource[];

	public reflectivity: Float32Array;
	public first_frame: number;
	public bump_scale: number;
	public compression_level: number;
	public compression_method: VCompressionMethods;

	constructor(data: VDataProvider, options?: VConstructorOptions) {
		this.data = data;

		this.version = options?.version ?? 4;
		this.format = options?.format ?? VFormats.RGBA8888;
		this.flags = options?.flags ?? 0x0;
		this.meta = options?.meta ?? [];


		if (options?.reflectivity) {
			this.reflectivity = options.reflectivity;
		}
		else {
			const smallest_mip_index = getThumbMip(...this.data.getSize(0,0,0,0), 1);
			if (smallest_mip_index < this.data.mipmapCount()) {
				const smallest_mip = this.data.getImage(smallest_mip_index, 0, 0, 0).convert(Float32Array);
				this.reflectivity = smallest_mip.data.slice(0,3);
			}
			else {
				this.reflectivity = new Float32Array(3).fill(0);
			}
		}
		
		this.first_frame = options?.first_frame ?? 0;
		this.bump_scale = options?.bump_scale ?? 1.0;
		this.compression_level = options?.compression_level ?? 0;
		this.compression_method = options?.compression_method ?? VCompressionMethods.Deflate;
	}

	encode(): Promise<ArrayBuffer> {
		throw Error('Vtf.encode: Implementation override not present!');
	}

	static decode(data: ArrayBuffer): Promise<Vtf>;
	static decode(data: ArrayBuffer, header_only: false, lazy_decode?: boolean): Promise<Vtf>;
	static decode(data: ArrayBuffer, header_only: true, lazy_decode?: boolean): Promise<VFileHeader>;
	static decode(data: ArrayBuffer, header_only: boolean=false, lazy_decode: boolean=false): Promise<Vtf|VFileHeader> {
		throw Error('Vtf.decode: Implementation override not present!');
	}
}

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

	static fromVtf(vtf: Vtf): VFileHeader {
		const header = new VFileHeader();
		header.version = vtf.version;
		[header.width, header.height] = vtf.data.getSize();
		header.flags = vtf.flags;
		header.frames = vtf.data.frameCount();
		header.first_frame = vtf.first_frame;
		header.reflectivity = vtf.reflectivity;
		header.bump_scale = vtf.bump_scale;
		header.format = vtf.format;
		header.mipmaps = vtf.data.mipmapCount();
		header.slices = vtf.data.sliceCount();
		header.compression_method = vtf.compression_method;
		header.compression_level = vtf.compression_level;
		return header;
	}
}