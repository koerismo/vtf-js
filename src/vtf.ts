import type { VDataProvider } from './core/providers.js';
import { VFormats } from './core/enums.js';

export interface VConstructorOptions {
	version?: 1|2|3|4|5|6;
	format?: VFormats;
	flags?: number;
}

export class Vtf {
	public data: VDataProvider;
	public version: 1|2|3|4|5|6;
	public format: VFormats;
	public flags: number;

	constructor(data: VDataProvider, options?: VConstructorOptions) {
		this.data = data;

		if (!options) return;
		this.version = options.version ?? 4;
		this.format = options.format ?? VFormats.RGBA8888;
		this.flags = options.flags ?? 0x0;
	}

	encode(): ArrayBuffer {
		throw('Vtf.encode: Implementation override not present!');
	}

	static decode(data: ArrayBuffer): Vtf {
		throw('Vtf.decode: Implementation override not present!');
	}
}