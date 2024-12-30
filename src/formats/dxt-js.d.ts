
declare module 'dxt-js' {
	export function compress(inputData: Uint8Array, width: number, height: number, flags: number): Uint8Array; 

	export function decompress(inputData: Uint8Array, width: number, height: number, flags: number): Uint8Array;

	export const enum flags {
		// Use DXT1 compression.
		DXT1                      = ( 1 << 0 ),
		// Use DXT3 compression.
		DXT3                      = ( 1 << 1 ),
		// Use DXT5 compression.
		DXT5                      = ( 1 << 2 ),
		// Use a very slow but very high quality colour compressor.
		ColourIterativeClusterFit = ( 1 << 8 ),
		//! Use a slow but high quality colour compressor (the default).
		ColourClusterFit          = ( 1 << 3 ),
		//! Use a fast but low quality colour compressor.
		ColourRangeFit            = ( 1 << 4 ),
		//! Use a perceptual metric for colour error (the default).
		ColourMetricPerceptual    = ( 1 << 5 ),
		//! Use a uniform metric for colour error.
		ColourMetricUniform       = ( 1 << 6 ),
		//! Weight the colour by alpha during cluster fit (disabled by default).
		WeightColourByAlpha       = ( 1 << 7 )
	}
}
