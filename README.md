# vtf-js
*A javascript IO library for the Valve Texture Format.*

## Overview
`vtf-js` is a platform-independent library for reading and authoring Vtfs. The library supports encoding and decoding VTF versions 7.1 - 7.6, including Strata compressed Vtfs. This library provides full control over a file's resources and image data by default (see `VCollection`), however most aspects of the conversion process can be automated with the provided methods.

The following formats are supported by default.

- `RGBA8888`
- `BGRA8888`
- `BGRX8888`
- `ABGR8888`
- `ARGB8888`
- `RGB888`
- `BGR888`
- `RGB565`
- `BGR565`
- `IA88`
- `UV88`
- `A8`
- `I8`
- `P8` [^1]
- `DXT1`
- `DXT3`
- `DXT5`
- `R32F`
- `RGB323232F`
- `RGBA16161616`
- `RGBA16161616F` [^2]
- `RGBA32323232F`

## Additional Setup

While `vtf-js` should work mostly out of the box, there are several things that this package needs help with: DXT encoding, and Strata Deflate/ZSTD compression.

`vtf-js` includes a DXT decoder by default. Unfortunately, native encoding is not supported at this time. To enable this functionality, the `vtf-js/addons/squish` module can be used to register the `libsquish-js` library for encoding/decoding.

Support for Deflate decompression is provided by default using the standard [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API), however this compression interface is limited in functionality, and a compression level of `-1` is enforced when encoding due to technical limitations.

To add external compression support, import one of `vtf-js/addons/compress/node` or `vtf-js/addons/compress/fflate` to choose a compression interface, or manually register compression/decompression methods by calling `setCompressionMethod` from `vtf-js/utils`.

```ts
// import { ... } from 'vtf-js';

// For node (using built-in zlib bindings)
// import 'vtf-js/addons/compress/node';

// For web (using fflate)
import 'vtf-js/addons/compress/fflate';
```

## Examples

### Create from image data
```ts
import { Vtf, VFormats, VFilters, VCollection, VImageData } from 'vtf-js';

// See "Additional Setup" section for info about this import.
import 'vtf-js/addons/squish';

const image = new VImageData(/* ... */);

// Use -1 to infer the mipmap count from the image size.
const frames = VCollection.fromFrames([image], { mips: -1 });
frames.generateMips(VFilters.NICE);

const vtf = new Vtf(frames, { version: 4, format: VFormats.DXT5 });
vtf.computeReflectivity();
vtf.computeThumb();

const out = await vtf.encode();
```

### Read image into an object
```ts
import { Vtf } from 'vtf-js';

// ...

const vtf = await Vtf.decode(inputBuffer);
const slice = vtf.body.getImage(
	0,  // Mipmap
	0,  // Frame
	0,  // Face
	0   // Slice
);

// The image's data may be a uint8, uint16, or float32 array depending on the format.
// The convert method normalizes the image into the desired format.
const data = slice.convert(Uint8Array);

```

### Re-encode an existing image
```ts
import { Vtf, VFormats } from 'vtf-js';

// ...

const vtf = await Vtf.decode(inbuffer);
vtf.format = VFormats.RGB565;
vtf.version = 6;
vtf.compression_level = 4;
const out = await vtf.encode();
```

[^1]: As the Vtf format does not specify a singular method of defining palettes in the file, vtf-js interprets P8 images as a single-channel greyscale image.
[^2]: This codec is registered only in environments where sec-float16array is supported.
