import { deflate, inflate } from 'node:zlib';
// import { zstdCompress, zstdDecompress, constants } from 'node:zlib';

import { setCompressionMethod } from '../../core/utils.js';
import { VCompressionMethods } from '../../core/enums.js';

function wrap(m: Function) {
	return (data: Uint8Array, arg: any): Promise<Uint8Array> => {
		return new Promise((resolve, reject) => {
			m(data, arg, (error: Error | null, result: Uint8Array) => {
				if (error) return reject(error);
				resolve(new Uint8Array(result.buffer));
			});
		});
	}
}

const inflateNode = wrap(inflate);
const deflateNode = wrap(deflate);
// const zstdDecompressNode = wrap(zstdDecompress);
// const zstdCompressNode = wrap(zstdCompress);

function compressNode(data: Uint8Array, level: number, method: VCompressionMethods): Promise<Uint8Array> {
	switch (method) {
		case VCompressionMethods.Deflate:
			return deflateNode(data, { level: level });
		case VCompressionMethods.ZSTD:
			throw Error('vtf-js: Node compression backend does not support ZSTD compression!');
			// return zstdCompressNode(data, { params: { [constants.ZSTD_c_compressionLevel]: level } });
	}
}

async function decompressNode(data: Uint8Array, level: number, method: VCompressionMethods): Promise<Uint8Array> {
	switch (method) {
		case VCompressionMethods.Deflate:
			return inflateNode(data, {});
		case VCompressionMethods.ZSTD:
			throw Error('vtf-js: Node compression backend does not support ZSTD decompression!');
			// return zstdDecompressNode(data, {});
	}
}

setCompressionMethod(compressNode, decompressNode);
