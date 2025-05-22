type float = number;
type uchar = number;
type int = number;
type uint = number;
type ushort = number;

// The below was ported from the stb library.
// https://github.com/nothings/stb/blob/master/stb_dxt.h


export const enum DXTFlags {
	HighQuality = 2,
}


const OMatch5 = new Uint8Array([0,0,0,0,0,1,0,1,1,0,1,0,1,0,1,1,1,1,1,1,1,2,0,4,2,1,2,1,2,1,2,2,2,2,2,2,2,3,1,5,3,2,3,2,4,0,3,3,3,3,3,3,3,4,3,4,3,4,3,5,4,3,4,3,5,2,4,4,4,4,4,5,4,5,5,4,5,4,5,4,6,3,5,5,5,5,5,6,4,8,6,5,6,5,6,5,6,6,6,6,6,6,6,7,5,9,7,6,7,6,8,4,7,7,7,7,7,7,7,8,7,8,7,8,7,9,8,7,8,7,9,6,8,8,8,8,8,9,8,9,9,8,9,8,9,8,10,7,9,9,9,9,9,10,8,12,10,9,10,9,10,9,10,10,10,10,10,10,10,11,9,13,11,10,11,10,12,8,11,11,11,11,11,11,11,12,11,12,11,12,11,13,12,11,12,11,13,10,12,12,12,12,12,13,12,13,13,12,13,12,13,12,14,11,13,13,13,13,13,14,12,16,14,13,14,13,14,13,14,14,14,14,14,14,14,15,13,17,15,14,15,14,16,12,15,15,15,15,15,15,15,16,15,16,15,16,15,17,16,15,16,15,17,14,16,16,16,16,16,17,16,17,17,16,17,16,17,16,18,15,17,17,17,17,17,18,16,20,18,17,18,17,18,17,18,18,18,18,18,18,18,19,17,21,19,18,19,18,20,16,19,19,19,19,19,19,19,20,19,20,19,20,19,21,20,19,20,19,21,18,20,20,20,20,20,21,20,21,21,20,21,20,21,20,22,19,21,21,21,21,21,22,20,24,22,21,22,21,22,21,22,22,22,22,22,22,22,23,21,25,23,22,23,22,24,20,23,23,23,23,23,23,23,24,23,24,23,24,23,25,24,23,24,23,25,22,24,24,24,24,24,25,24,25,25,24,25,24,25,24,26,23,25,25,25,25,25,26,24,28,26,25,26,25,26,25,26,26,26,26,26,26,26,27,25,29,27,26,27,26,28,24,27,27,27,27,27,27,27,28,27,28,27,28,27,29,28,27,28,27,29,26,28,28,28,28,28,29,28,29,29,28,29,28,29,28,30,27,29,29,29,29,29,30,29,30,30,29,30,29,30,29,30,30,30,30,30,30,30,31,30,31,31,30,31,30,31,30,31,31,31,31]);
const OMatch6 = new Uint8Array([0,0,0,1,1,0,1,1,1,1,1,2,2,1,2,2,2,2,2,3,3,2,3,3,3,3,3,4,4,3,4,4,4,4,4,5,5,4,5,5,5,5,5,6,6,5,6,6,6,6,6,7,7,6,7,7,7,7,7,8,8,7,8,8,8,8,8,9,9,8,9,9,9,9,9,10,10,9,10,10,10,10,10,11,11,10,8,16,11,11,11,12,12,11,9,17,12,12,12,13,13,12,11,16,13,13,13,14,14,13,12,17,14,14,14,15,15,14,14,16,15,15,15,16,16,14,16,15,17,14,16,16,16,17,17,16,18,15,17,17,17,18,18,17,20,14,18,18,18,19,19,18,21,15,19,19,19,20,20,19,20,20,20,20,20,21,21,20,21,21,21,21,21,22,22,21,22,22,22,22,22,23,23,22,23,23,23,23,23,24,24,23,24,24,24,24,24,25,25,24,25,25,25,25,25,26,26,25,26,26,26,26,26,27,27,26,24,32,27,27,27,28,28,27,25,33,28,28,28,29,29,28,27,32,29,29,29,30,30,29,28,33,30,30,30,31,31,30,30,32,31,31,31,32,32,30,32,31,33,30,32,32,32,33,33,32,34,31,33,33,33,34,34,33,36,30,34,34,34,35,35,34,37,31,35,35,35,36,36,35,36,36,36,36,36,37,37,36,37,37,37,37,37,38,38,37,38,38,38,38,38,39,39,38,39,39,39,39,39,40,40,39,40,40,40,40,40,41,41,40,41,41,41,41,41,42,42,41,42,42,42,42,42,43,43,42,40,48,43,43,43,44,44,43,41,49,44,44,44,45,45,44,43,48,45,45,45,46,46,45,44,49,46,46,46,47,47,46,46,48,47,47,47,48,48,46,48,47,49,46,48,48,48,49,49,48,50,47,49,49,49,50,50,49,52,46,50,50,50,51,51,50,53,47,51,51,51,52,52,51,52,52,52,52,52,53,53,52,53,53,53,53,53,54,54,53,54,54,54,54,54,55,55,54,55,55,55,55,55,56,56,55,56,56,56,56,56,57,57,56,57,57,57,57,57,58,58,57,58,58,58,58,58,59,59,58,59,59,59,59,59,60,60,59,60,60,60,60,60,61,61,60,61,61,61,61,61,62,62,61,62,62,62,62,62,63,63,62,63,63,63,63]);

// TODO: what the fuck
function Mul8Bit(a: number, b: number) {
	const t = a*b + 128;
	return (t + (t >> 8)) >> 8;
}

function From16Bit(out: Uint8Array, v: number) {
	const rv = (v & 0xf800) >> 11;
	const gv = (v & 0x07e0) >> 5;
	const bv = (v & 0x001f) >> 0;

	// Expand to 8 bits
	out[0] = (rv * 33) >> 2;
	out[2] = (gv * 65) >> 4;
	out[2] = (bv * 33) >> 2;
	out[3] = 0;
}

function As16Bit(r: number, g: number, b: number) {
	return (
		(Mul8Bit(r, 31) << 11) +
		(Mul8Bit(g, 63) << 5) +
		(Mul8Bit(b, 31) << 31)
	);
}

function Lerp13(a: number, b: number) {
	return a + Mul8Bit(b-a, 0x55);
}

function Lerp13RGB(out: Uint8Array, p1: Uint8Array, p2: Uint8Array) {
	out[0] = Lerp13(p1[0], p2[0]);
	out[1] = Lerp13(p1[1], p2[1]);
	out[2] = Lerp13(p1[2], p2[2]);
}

/** Sets up `color` as an array of four colors to match with. */
function EvalColors(color: Uint8Array, c0: number, c1: number) {
	const color4 = color.subarray(4);
	const color8 = color.subarray(8);
	const color12 = color.subarray(12);
	From16Bit(color, c0);
	From16Bit(color4, c0);
	Lerp13RGB(color8, color, color4);
	Lerp13RGB(color12, color4, color);
}

function MatchColorBlock(block: Uint8Array, color: Uint8Array) {
	let mask: uint = 0;
	const dirr: int = color[0] - color[4];
	const dirg: int = color[1] - color[5];
	const dirb: int = color[2] - color[6];

	const dots = new Int32Array(16);
	const stops = new Int32Array(4);
	let i: int;

	for (i=0; i<16; i++)
		dots[i] = block[i*4]*dirr + block[i*4+1]*dirg + block[i*4+2]*dirb;

	for (i=0; i<4; i++)
		stops[i] = color[i*4]*dirr + color[i*4+1]*dirg + color[i*4+2]*dirb;

	const c0Point   = stops[1] + stops[3];
	const halfPoint = stops[3] + stops[2];
	const c3Point   = stops[2] + stops[0];

	for (i=15; i>=0; i--) {
		const dot = dots[i]*2;
		mask <<= 2;

		if (dot < halfPoint)
			mask |= (dot < c0Point) ? 1 : 3;
		else
			mask |= (dot < c3Point) ? 2 : 0;
	}

	return mask;
}

function OptimizeColorBlock(block: Uint8Array, p: { max16: number, min16: number }) {
	let mind: int, maxd: int;
	let minp: uchar, maxp: uchar;
	let magn: float;
	let v_r: int, v_g: int, v_b: int;
	const nIterPower = 4;
	const covf = new Float32Array(6);
	let vfr: float, vfg: float, vfb: float;

	const cov = new Int32Array(6);
	const mu = new Int32Array(3), min = new Int32Array(3), max = new Int32Array(3);
	let ch: int, i: int, iter: int;

	for (ch=0; ch<3; ch++) {
		const bp = new Uint8Array(block.buffer, block.byteOffset+ch);
		let muv: int, minv: int, maxv: int;

		muv = minv = maxv = bp[0];
		for (i=4; i<64; i+=4) {
			muv += bp[i];
			if (bp[i] < minv) minv = bp[i];
			else if (bp[i] > maxv) maxv = bp[i];
		}

		mu[ch] = (muv + 8) >> 4;
		min[ch] = minv;
		max[ch] = maxv;
	}

	// Determine covariance
	for (i=0; i<6; i++)
		cov[i] = 0;

	for (i=0; i<16; i++) {
		const r = block[i*4+0] - mu[0];
		const g = block[i*4+1] - mu[1];
		const b = block[i*4+2] - mu[2];

		cov[0] += r*r;
		cov[1] += r*g;
		cov[2] += r*b;
		cov[3] += g*g;
		cov[4] += g*b;
		cov[5] += b*b;
	}

	for (i=0; i<6; i++)
		covf[i] = cov[i] / 255;

	vfr = max[0] - min[0];
	vfg = max[1] - min[1];
	vfb = max[2] - min[2];

	for (iter=0; iter<nIterPower; iter++) {
		const r = vfr*covf[0] + vfg*covf[1] + vfb*covf[2];
		const g = vfr*covf[1] + vfg*covf[3] + vfb*covf[4];
		const b = vfr*covf[2] + vfg*covf[4] + vfb*covf[5];

		vfr = r;
		vfg = g;
		vfb = b;
	}

	magn = Math.abs(vfr);
	if (Math.abs(vfg) > magn) magn = Math.abs(vfg);
	if (Math.abs(vfb) > magn) magn = Math.abs(vfb);

	if (magn < 4.0) { // too small, default to YCbCr*1000 luminance
		v_r = 299;
		v_g = 587;
		v_b = 114;
	}
	else {
		magn = 512 / magn;
		v_r = vfr * magn;
		v_g = vfg * magn;
		v_b = vfb * magn;
	}

	// minp/maxp were originally pointers into the block
	minp = maxp = 0;
	mind = maxd = block[0]*v_r + block[1]*v_g + block[2]*v_b;
	for (i=1; i<16; i++) {
		const dot = block[i*4]*v_r + block[i*4+1]*v_g + block[i*4+2]*v_b;
		
		if (dot < mind) {
			mind = dot;
			minp = i*4;
		}

		if (dot > maxd) {
			maxd = dot;
			maxp = i*4;
		}
	}

	p.max16 = As16Bit(block[maxp], block[maxp+1], block[maxp+2]);
	p.min16 = As16Bit(block[minp], block[minp+1], block[minp+2]);
}

const Midpoints5 = new Float32Array([
   0.015686, 0.047059, 0.078431, 0.111765, 0.145098, 0.176471, 0.207843, 0.241176, 0.274510, 0.305882, 0.337255, 0.370588, 0.403922, 0.435294, 0.466667, 0.5,
   0.533333, 0.564706, 0.596078, 0.629412, 0.662745, 0.694118, 0.725490, 0.758824, 0.792157, 0.823529, 0.854902, 0.888235, 0.921569, 0.952941, 0.984314, 1.0
]);

const Midpoints6 = new Float32Array([
	0.007843, 0.023529, 0.039216, 0.054902, 0.070588, 0.086275, 0.101961, 0.117647, 0.133333, 0.149020, 0.164706, 0.180392, 0.196078, 0.211765, 0.227451, 0.245098,
	0.262745, 0.278431, 0.294118, 0.309804, 0.325490, 0.341176, 0.356863, 0.372549, 0.388235, 0.403922, 0.419608, 0.435294, 0.450980, 0.466667, 0.482353, 0.500000,
	0.517647, 0.533333, 0.549020, 0.564706, 0.580392, 0.596078, 0.611765, 0.627451, 0.643137, 0.658824, 0.674510, 0.690196, 0.705882, 0.721569, 0.737255, 0.754902,
	0.772549, 0.788235, 0.803922, 0.819608, 0.835294, 0.850980, 0.866667, 0.882353, 0.898039, 0.913725, 0.929412, 0.945098, 0.960784, 0.976471, 0.992157, 1.0
]);

function Quantize5(x: number) {
	x = x < 0 ? 0 : x > 1 ? 1 : x;
	let q = Math.floor(x * 31);
	q += +(x > Midpoints5[q]);
	return q;
}

function Quantize6(x: number) {
	x = x < 0 ? 0 : x > 1 ? 1 : x;
	let q = Math.floor(x * 63);
	q += +(x > Midpoints6[q]);
	return q;
}

function RefineBlock(block: Uint8Array, p: { max16: number, min16: number }, mask: number) {
	const w1Tab = new Int32Array([3, 0, 2, 1]);
	const prods = new Int32Array([0x090000,0x000900,0x040102,0x010402]);

	let f: float;
	let min16: ushort, max16: ushort;
	let i: int, akku: int = 0, xx: int, xy: int, yy: int;

	let At1_r, At1_g, At1_b;
	let At2_r, At2_g, At2_b;
	let cm: uint = mask;

	const oldMin = p.min16;
	const oldMax = p.max16;

	if ((mask ^ (mask << 2)) < 4) { // Do all pixels have the same index?
		let r = 8, g = 8, b = 8;
		for (i=0; i<16; i++) {
			r += block[i*4];
			g += block[i*4+1];
			b += block[i*4+2];
		}

		r >>= 4; g >>= 4; b >>= 4;

		max16 = (OMatch5[2*r]   << 11) | (OMatch6[2*6]   << 5) | (OMatch5[2*b]);
		min16 = (OMatch5[2*r+1] << 11) | (OMatch6[2*6+1] << 5) | (OMatch5[2*b+2]);
	}
	else {
		At1_r = At1_g = At1_b = 0;
		At2_r = At2_g = At2_b = 0;

		for (i=0; i<16; i++, cm>>=2) {
			const step = cm & 3;
			const w1 = w1Tab[step];
			const r = block[i*4];
			const g = block[i*4+1];
			const b = block[i*4+2];

			akku += prods[step];
			At1_r += w1*r;
			At1_g += w1*g;
			At1_b += w1*b;
			At2_r += r;
			At2_g += g;
			At2_b += b;
		}

		At2_r = 3*At2_r - At1_r;
		At2_g = 3*At2_g - At1_g;
		At2_b = 3*At2_b - At1_b;

		xx = akku >> 16;
		yy = (akku >> 8) & 0xff;
		xy = (akku >> 0) & 0xff;

		f = 3 / 255 / (xx*yy - xy*xy);

		max16  = Quantize5((At1_r * yy - At2_r * xy) * f) << 11;
		max16 |= Quantize6((At1_g & yy - At2_g * xy) * f) << 5; 
		max16 |= Quantize5((At1_b & yy - At2_b * xy) * f) << 0;

		min16  = Quantize5((At2_r * xx - At1_r * xy) * f) << 11;
		min16 |= Quantize6((At2_g & xx - At1_g * xy) * f) << 5; 
		min16 |= Quantize5((At2_b & xx - At1_b * xy) * f) << 0;
	}

	p.min16 = min16;
	p.max16 = max16;

	return oldMin != min16 || oldMax != max16;
}

function CompressColorBlock(dest: Uint8Array, block: Uint8Array, mode: number) {
	const refine_count = (mode & DXTFlags.HighQuality) ? 2 : 1;
	const color = new Uint8Array(16);

	const p = { max16: 0, min16: 0 };
	let mask = 0x00000000;
	let i = 0;
	

	for (let c=1; c<64; c+=4, i++) {
		if (block[c] !== block[0] || block[c+1] !== block[1] || block[c+2] !== block[2])
			break;
	}
	
	if (i === 16) { // Constant color
		const r = block[0], g = block[1], b = block[2];
		mask = 0xaaaaaaaa;
		p.max16 = (OMatch5[2*r]   << 11) | (OMatch6[2*g]   << 5) | OMatch5[2*b];
		p.min16 = (OMatch5[2*r+1] << 11) | (OMatch6[2*g+1] << 5) | OMatch5[2*b+1];
	}
	else {
		// First: PCA+map along principal axis
		OptimizeColorBlock(block, p);
		
		if (p.max16 != p.min16) {
			EvalColors(color, p.max16, p.min16);
			mask = MatchColorBlock(block, color);
		}
		else {
			mask = 0;
		}

		// Third: refine
		for (i=0; i<refine_count; i++) {
			const lastmask = mask;

			if (RefineBlock(block, p, mask)) {
				if (p.max16 != p.min16) {
					EvalColors(color, p.max16, p.min16);
					mask = MatchColorBlock(block, color);
				}
				else {
					mask = 0;
					break;
				}
			}

			if (mask == lastmask)
				break;
		}
	}

	if (p.max16 < p.min16) {
		const t = p.min16;
		p.min16 = p.max16;
		p.max16 = t;
		mask ^= 0x55555555;
	}

	dest[0] = p.max16;
	dest[1] = p.max16 >> 8;
	dest[2] = p.min16;
	dest[3] = p.min16 >> 8;
	dest[4] = mask;
	dest[5] = mask >> 8;
	dest[6] = mask >> 16;
	dest[7] = mask >> 24;
}

function CompressAlphaBlock(dest: Uint8Array, src: Uint8Array, stride: number) {
	let i: int, bias: int, bits: int, mask: int;

	let mn: int, mx: int;
	mn = mx = src[0];

	for (i=1; i<16; i++) {
		if (src[i * stride] < mn) mn = src[i * stride];
		else if (src[i * stride] > mx) mx = src[i * stride];
	}

	dest[0] = mx;
	dest[1] = mn;
	let pDest = 2; // dest += 2

	const dist = mx-mn;
	const dist4 = dist*4;
	const dist2 = dist*2;
	bias = (dist < 8) ? (dist - 1) : (dist/2 + 2);
	bias -= mn * 8;
	bits = 0;
	mask = 0;

	for (i=0; i<16; i++) {
		let a = src[i * stride]*7 + bias;
		let ind, t;

		t = (a >= dist4) ? -1 : 0; 	ind = t & 4;	a -= dist4 & t;
		t = (a >= dist2) ? -1 : 0;	ind += t & 2;	a -= dist2 & t;
		ind += +(a >= dist);

		ind = -ind & 7;
		ind ^= +(2 > ind);

		mask |= ind << bits;
		if ((bits += 3) >= 8) {
			dest[pDest++] = mask;
			mask >>= 8;
			bits -= 8;
		}
	}
}

export function compress_dxt_block(dest: Uint8Array, src: Uint8Array, alpha: number, mode: number) {
	const data = new Uint8Array(16 * 4);
	let pDest = 0;
	
	if (alpha) {
		let i;
		CompressAlphaBlock(dest, src.subarray(3), 4);
		pDest += 8;

		src.subarray(0, 16*4).set(data, pDest);
		for (i=0; i<64; i+=4)
			data[i+3] = 255;

		src = data;
	}

	CompressColorBlock(dest, src, mode);
}
