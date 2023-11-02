import type { VDataProvider } from './core/providers.js';
import { VFormats } from './core/enums.js';
import { VResource } from './core/resources.js';

export interface VConstructorOptions {
	version?: 1|2|3|4|5|6;
	format?: VFormats;
	flags?: number;
	meta?: VResource[];

	reflectivity?: Float32Array;
	first_frame?: number;
	bump_scale?: number;
}

export class Vtf {
	public data: VDataProvider;
	public version: 1|2|3|4|5|6;
	public format: VFormats;
	public flags: number;
	public meta: VResource[];

	public reflectivity: Float32Array;
	public first_frame: number;
	public bump_scale: number;

	constructor(data: VDataProvider, options?: VConstructorOptions) {
		this.data = data;

		if (!options) return;
		this.version = options.version ?? 4;
		this.format = options.format ?? VFormats.RGBA8888;
		this.flags = options.flags ?? 0x0;
		this.meta = options.meta ?? [];

		this.reflectivity = options.reflectivity ?? new Float32Array([0,0,0]);
		this.first_frame = options.first_frame ?? 0;
		this.bump_scale = options.bump_scale ?? 1.0;
	}

	encode(): ArrayBuffer {
		throw('Vtf.encode: Implementation override not present!');
	}

	static decode(data: ArrayBuffer): Vtf;
	static decode(data: ArrayBuffer, header_only: false): Vtf;
	static decode(data: ArrayBuffer, header_only: true): VFileHeader;
	static decode(data: ArrayBuffer, header_only?: boolean): Vtf|VFileHeader {
		throw('Vtf.decode: Implementation override not present!');
	}
}

export class VFileHeader {
	version: 1|2|3|4|5|6;
	width: number;
	height: number;
	flags: number;
	frames: number;
	first_frame: number;
	reflectivity: Float32Array;
	bump_scale: number;
	format: VFormats;
	mipmaps: number;
	thumb_format: VFormats;
	thumb_width: number;
	thumb_height: number;
	slices: number;

	compression: number;
	compressed_lengths?: number[][][][];

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
		// header.thumb_format = VFormats.DXT1;
		// header.thumb_width = 0;
		// header.thumb_height = 0;
		header.slices = vtf.data.sliceCount();
		header.compression = 0;
		return header;
	}
}