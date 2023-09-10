// Vtf class
import { Vtf } from './vtf.js';
import './core/encode.js';
import './core/decode.js';

// Image data
import { VImageData, VEncodedImageData, registerCodec, getCodec } from './image.js';

// Builtin codecs
import './image/rgba.js';

// Enums
import { VFormats, VFlags } from './core/enums.js';

// Data collections
import {
	VDataCollection,
	VFrameCollection,
	VFaceCollection,
	VSliceCollection } from './core/providers.js';

export default Vtf;
export {
	Vtf,

	VFormats,
	VFlags,

	VImageData,
	VEncodedImageData,

	VDataCollection,
	VFrameCollection,
	VFaceCollection,
	VSliceCollection,

	registerCodec,
	getCodec,
}