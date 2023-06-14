import { DataBuffer } from '../util/buffer.js';
import { VHeaderInfo } from '../vtf.js';
import { VDataCollection } from './providers.js';

export const VResourceTypes: {[key: string]: typeof VResource} = {};
export function registerResourceType(resource: typeof VResource) {
	if (!resource.tag) throw('registerResourceDecoder: Cannot register generic resource! (Must have static tag attribute.)');
	VResourceTypes[resource.tag] = resource;
}

export enum VHeaderTags {
	TAG_BODY = '\x30\0\0',
	TAG_THUMB = '\x01\0\0',
	TAG_AXC = 'AXC'
}

export class VHeader {
	readonly tag: string;
	readonly flags: number;
	readonly start: number;
	end: number;

	constructor(tag: string, flags: number, start: number) {
		this.tag = tag;
		this.flags = flags;
		this.start = start;
	}

	hasData() {
		return !(this.flags & 0x2);
	}
}

/** Represents a resource entry. */
export class VResource {
	static readonly tag?: string;
	readonly tag: string;
	readonly flags: number;
	data?: DataBuffer;

	constructor(tag: string, flags: number, data?: DataBuffer) {
		this.tag = tag;
		this.flags = flags;
		this.data = data;
	}

	static decode(header: VHeader, buffer: DataBuffer, info: VHeaderInfo) {
		let data: DataBuffer|undefined;

		if (!(header.flags & 0x2))
			data = buffer.subview(header.start, header.end - header.start);

		const type = VResourceTypes[header.tag] ?? VResource;
		return new type(header.tag, header.flags, data);
	}
}

export class VBodyResource extends VResource {
	images: VDataCollection;

	constructor(_tag: string, flags: number, images: VDataCollection) {
		super(VHeaderTags.TAG_BODY, flags);
		this.images = images;
	}

	static decode(header: VHeader, buffer: DataBuffer, info: VHeaderInfo): VBodyResource {
		const images = new VDataCollection([]);
		return new VBodyResource(header.tag, header.flags, images);
	}
}