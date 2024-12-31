# vtf-js
*A javascript IO library for the Valve Texture Format.*

## Overview
`vtf-js` is a canvas-independent library for reading and authoring Vtfs. The library supports encoding and decoding VTF versions 7.1 - 7.6, including Strata-format compressed Vtfs. Mipmap generation is automated by default, however interfaces for manually specifying image data for each mipmap are also available (see `VDataCollection`).

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

## Examples

### Create from image data
```ts
import { Vtf, VFormats, VFilters, VFrameCollection } from 'vtf-js';

// ...

const frames = new VFrameCollection([image], { mipmaps: 3, filter: VFilters.NICE });
const vtf = new Vtf(frames, { version: 4, format: VFormats.DXT5 });
const out = vtf.encode();
```

### Read image into an object
```ts
import { Vtf } from 'vtf-js';

// ...

const vtf = Vtf.decode(inbuffer);
const slice = vtf.data.getImage(
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

const vtf = Vtf.decode(inbuffer);
vtf.format = VFormats.RGB565;
vtf.version = 6;
vtf.compression = 4;
const out = vtf.encode();
```

[^1]: As the Vtf format does not specify a singular method of defining palettes in the file, vtf-js interprets P8 images as a single-channel greyscale image.
[^2]: This codec is registered only in environments where sec-float16array is supported.
