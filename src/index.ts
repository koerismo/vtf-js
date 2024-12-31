declare global {
	export type Float16Array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike> = Float32Array<TArrayBuffer>;
	export const Float16Array: Float16ArrayConstructor;
	export type Float16ArrayConstructor = { new (): Float16Array<ArrayBuffer> } & Float32ArrayConstructor;

	export interface Window {
		/** Determines whether vtf-js should attempt to import the optional dxt-js dependency. Set this to true if you have an alternate implementation! */
		VTF_DISABLE_BUILTIN_DXT: boolean;
		/** Determines whether vtf-js should attempt to import the optional pako dependency. If set to true, Strata compressed VTFs will not function. */
		VTF_DISABLE_PAKO: boolean;
	}
}

// Vtf class
import { Vtf, VFileHeader } from './vtf.js';
import './core/encode.js';
import './core/decode.js';

// Image data
import { VImageData, VEncodedImageData, type VPixelArray, type VPixelArrayConstructor, registerCodec, getCodec } from './core/image.js';

// Resizing filters
export { VFilters, type Filter } from './core/resize.js';

// Builtin codecs
import './formats/rgba.js';
import './formats/rgba.special.js';

// Optional DXT module
if (!globalThis.VTF_DISABLE_BUILTIN_DXT) {
	try {
		await import('./formats/dxt.js');
	}
	catch (e) {
		console.warn('vtf-js: Failed to import dependency "dxt-js". Set globalThis.VTF_DISABLE_BUILTIN_DXT before importing vtf-js to hide this warning!', e);
	}
}

// Enums
export { VFormats, VFlags } from './core/enums.js';

// Data collections
export {
	VDataProvider,
	VDataCollection,
	VMipmapProvider,
	VFrameCollection,
	VFaceCollection,
	VSliceCollection } from './core/providers.js';

// Resources
export { VResource } from './core/resources.js';

export default Vtf;
export {
	Vtf,
	VFileHeader,

	VImageData,
	VEncodedImageData,

	VPixelArray,
	VPixelArrayConstructor,

	registerCodec,
	getCodec,
}