import { VFlags, VFormats, VFrameCollection, VImageData, Vtf } from './dist/index.js';
import { readFileSync, writeFileSync } from 'fs';

const SIZE = 256;
const FILE = 'pistol';

const raw = new Uint8Array(readFileSync(`./test/in/${FILE}_${SIZE}x.raw`).buffer);
const image = new VImageData(raw, SIZE, SIZE);

const vtf = new Vtf(new VFrameCollection([image], { mipmaps: 3 }), {
	version: 5,
	format: VFormats.DXT1,
	flags: VFlags.OneBitAlpha,
});

const outbuf = vtf.encode();

const vtf2 = Vtf.decode(outbuf);
writeFileSync(`./test/out/${FILE}_${SIZE}x.vtf`, new Uint8Array(outbuf));
writeFileSync(`./test/out/${FILE}_${SIZE}x.raw`, vtf2.data.getImage(0,0,0,0).data)