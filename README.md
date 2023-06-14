# vtf-js
*A javascript IO library for the Valve Texture Format.*

## Overview
`vtf-js` supports encoding and decoding VTF versions `7.1`-`7.6`. Compressed VTFs are encoded and decoded via the `pako` library. A `VtfWorker` object can be passed to encode/decode VTFS in that worker thread rather than in the main thread.

The following formats are supported by default. (However, additional ones can be registered.)

- `RGBA8888`
- `ABGR8888`
- `RGB888`
- `BGR888`
- `RGB565`
- `I8`
- `IA88`
- `P8`
- `A8`
- `ARGB8888`
- `BGRA8888`
- `DXT1`
- `DXT3`
- `DXT5`
- `BGR565`

## Examples

### Re-encode an existing image
```ts
import { Vtf, VFormats } from 'vtf-js';

const vtf = Vtf.decode(inbuffer);
vtf.format = VFormats.RGBA8888;
const outbuffer = vtf.encode();
```

### Create from an ImageData object
```ts
import { Vtf, VFormats, VFrameCollection } from 'vtf-js';

const frames = new VFrameCollection([image]);
const vtf = new Vtf(frames, { version: 4, format: VFormats.DXT5 });
```