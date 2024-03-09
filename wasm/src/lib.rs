use std::io::Read;

use wasm_bindgen::prelude::*;

// Flate library
use flate2::Compression;
use flate2::write::DeflateEncoder;
use flate2::read::DeflateDecoder;

// Dxt-rs library
use squish::{Format, Params, Algorithm, COLOUR_WEIGHTS_PERCEPTUAL};

// Resize library

#[wasm_bindgen]
pub fn test() {
    println!("Hello, world!");
}

/* =========================== Inflate/deflate bindings =========================== */

#[wasm_bindgen]
pub fn deflate(data: Vec<u8>, level: u32) -> Vec<u8> {
	let encoder = DeflateEncoder::new(data, Compression::new(level));
	let result = encoder.finish();

	return result.unwrap_or(Vec::new());
}

#[wasm_bindgen]
pub fn inflate(data: Vec<u8>) -> Vec<u8> {
	let mut decoder = DeflateDecoder::new(&data[..]);
	let mut result: Vec<u8> = Vec::new();
	decoder.read_to_end(&mut result).unwrap_or(0);

	return result;
}

/* =========================== Dxt functions =========================== */


// function dxt1Length(w: number, h: number) {
// 	return Math.ceil(w / 4) * Math.ceil(h / 4) * 8;
// }

// function dxt5Length(w: number, h: number) {
// 	return Math.ceil(w / 4) * Math.ceil(h / 4) * 16;
// }

/* =========================== Codec definitions =========================== */

pub struct ImageData {
	pub width: usize,
	pub height: usize,
	pub data: Vec<u8>
}

fn as_dxt_format(format_id: u8) -> Format {
	match format_id {
		0 => Format::Bc1,
		1 => Format::Bc2,
		_ => Format::Bc3,
	}
}

#[wasm_bindgen]
pub fn length(format: u8, width: usize, height: usize) -> usize {
	return Format::compressed_size(as_dxt_format(format), width, height);
}

#[wasm_bindgen]
pub fn encode(format: u8, width: usize, height: usize, data: Vec<u8>) -> Vec<u8> {
	let size = length(format, width, height);
	let mut out: Vec<u8> = Vec::with_capacity(size);
	Format::compress(as_dxt_format(format), &data[..], width, height, Params::default(), &mut out[..]);
	return out;
}

#[wasm_bindgen]
pub fn decode(format: u8, width: usize, height: usize, data: Vec<u8>) -> Vec<u8> {
	let size = length(format, width, height);
	let mut out: Vec<u8> = Vec::with_capacity(size);
	Format::compress(as_dxt_format(format), &data[..], width, height, Params::default(), &mut out[..]);
	// out.truncate(size);
	return out;
}