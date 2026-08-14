/* eslint-disable @typescript-eslint/no-explicit-any */

import * as zlib from 'node:zlib';

export const HAS_ZSTD = ('zstdCompress' in zlib);

import { setCompressionMethod } from '../../core/utils.js';
import { VCompressionMethods } from '../../core/enums.js';

function wrap(m: (data: Uint8Array, arg: any, cb: (error: Error|null, result: any) => void) => any) {
	return (data: Uint8Array, arg: any): Promise<Uint8Array> => {
		return new Promise((resolve, reject) => {
			m(data, arg, (error: Error | null, result: Uint8Array) => {
				if (error) reject(error);
				else resolve(new Uint8Array(result.buffer));
			});
		});
	}
}

const inflateNode = wrap(zlib.inflate);
const deflateNode = wrap(zlib.deflate);
const zstdDecompressNode = wrap(zlib.zstdDecompress);
const zstdCompressNode = wrap(zlib.zstdCompress);

function compressNode(data: Uint8Array, method: VCompressionMethods, level: number): Promise<Uint8Array> {
	switch (method) {
		case VCompressionMethods.Deflate:
			return deflateNode(data, { level: level });
		case VCompressionMethods.ZSTD:
			if (HAS_ZSTD) return zstdCompressNode(data, { params: { [zlib.constants.ZSTD_c_compressionLevel]: level } });
			throw Error('vtf-js: Your Node environment does not support ZSTD compression!');
	}
}

async function decompressNode(data: Uint8Array, method: VCompressionMethods, level?: number): Promise<Uint8Array> {
	switch (method) {
		case VCompressionMethods.Deflate:
			return inflateNode(data, {});
		case VCompressionMethods.ZSTD:
			if (HAS_ZSTD) return zstdDecompressNode(data, {});
			throw Error('vtf-js: Your Node environment does not support ZSTD decompression!');
	}
}

setCompressionMethod(compressNode, decompressNode);
