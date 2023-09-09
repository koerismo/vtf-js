import { DataBuffer } from '../util/buffer.js';
import { VFormats } from './enums.js';
import { VFileHeader, Vtf } from '../vtf.js';

function write_format(id: number) {
	if (VFormats[id] == undefined) throw(`Encountered invalid format (id=${id}) in header!`);
	return id;
}

Vtf.prototype.encode = function(this: Vtf): ArrayBuffer {
	const buf = new DataBuffer(file_length);
	buf.set_endian(true);
	buf.write_str('VTF\0', 4);

	// File format version
	buf.write_u32(7);
	buf.write_u32(this.version);
	buf.write_u32(header_length);

	// Other properties
	const [width, height] = this.data.getSize();
	buf.write_u16(width);
	buf.write_u16(height);
	buf.write_u32(this.flags);
	buf.write_u16(this.data.frameCount());
	buf.write_u16(this.first_frame);
	buf.pad(4);
	buf.write_f32(this.reflectivity);
	buf.pad(4);
	buf.write_f32(this.bump_scale);
	buf.write_u32(write_format(this.format));
	buf.write_u8(this.data.mipmapCount());

	// Thumbnail
	buf.write_u32(write_format(this.thumb_format));
	buf.write_u8(this.thumb_width);
	buf.write_u8(this.thumb_height);

	// v7.2 +
	if (this.version > 1) {
		buf.write_u16(this.slices);
	}

	if (this.version < 3) {
		buf.write_u8(this.data);
		buf.write_u8(body_chunk.data);
		return buf.buffer;
	}

	// v7.3 +
	buf.pad(3);
	buf.write_u32(this.resources.length + 2);
	buf.pad(8);

	return buf.buffer;
}