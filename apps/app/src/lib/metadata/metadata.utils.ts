// Carrying a photo's metadata into the copy the app makes (ADR 0004; #292; research #281, "carry"). No encoder keeps
// metadata as it was, so the app copies the original's EXIF, XMP and ICC blocks byte for byte into the WebP or JPEG
// it encoded, changing only Orientation, to upright, since the copy is drawn upright. ExifReader says where each
// block sits; this file unwraps them, writes them in, and reads the copy back to check every field came across. It
// works on bytes only, so the phone uses it now and the server's conversions (#294) can use it too.
//
// A field a WebP has no slot for (IPTC, PNG text, RAW maker data) is kept in the File row's field list instead
// (`toFieldList`; Justin, 2026-11-24, on #281).
import type { ExpandedTags, MetadataBlock } from 'exifreader';
import { type FieldListType, toStorableJson } from '#lib/files/files.schema.js';

/** The original's metadata as plain blocks: EXIF from its TIFF header on, XMP, ICC, and a JPEG's Photoshop block. */
export type MetadataBlocksType = {
	exif?: Uint8Array;
	xmp?: Uint8Array;
	/** A JPEG's XMP beyond 64 KB, in segments of its own (a portrait's depth map): only a JPEG can hold it. */
	xmpExtended: Uint8Array[];
	icc?: Uint8Array;
	/** The Photoshop block (IPTC inside): only a JPEG can hold it. */
	iptc?: Uint8Array;
};

/** What a file says about itself: ExifReader's fields, and its blocks. `isRead` is false when it could not be read. */
export type MetadataType = {
	tags?: ExpandedTags;
	blocks: MetadataBlocksType;
	isRead: boolean;
};

export type PictureFormatType = 'jpeg' | 'png' | 'webp' | 'heif' | 'other';

/** What the file's own metadata says of when and where, when it says anything. */
export type ExifTakenType = { at?: string; latitude?: number; longitude?: number };

const XMP_ID = 'http://ns.adobe.com/xap/1.0/\0';
const XMP_EXTENDED_ID = 'http://ns.adobe.com/xmp/extension/\0';
const ICC_ID = 'ICC_PROFILE\0';
const EXIF_ID = 'Exif\0\0';
const PHOTOSHOP_ID = 'Photoshop 3.0\0';

/** The biggest body a JPEG APP segment holds: 64 KB less its two length bytes. */
const MAX_SEGMENT = 0xffff - 2;

/** The groups compared after carrying: everything the copy holds byte for byte (a JPEG also holds IPTC). */
const CARRIED_GROUPS = ['exif', 'gps', 'xmp', 'icc', 'Thumbnail', 'makerNotes'] as const;
const JPEG_ONLY_GROUPS = ['iptc', 'photoshop'] as const;

const NO_BLOCKS: MetadataBlocksType = { xmpExtended: [] };

// One character per byte (windows-1252 maps every byte to one), so a character's place is its byte's place.
const BYTE_TEXT = new TextDecoder('latin1');

function toText(bytes: Uint8Array, start = 0, length = bytes.length - start) {
	return BYTE_TEXT.decode(bytes.subarray(start, start + length));
}

function startsWith(bytes: Uint8Array, text: string) {
	return bytes.length >= text.length && toText(bytes, 0, text.length) === text;
}

function toBytes(text: string) {
	return Uint8Array.from(text, (character) => character.charCodeAt(0));
}

function readBig16(bytes: Uint8Array, at: number) {
	return (bytes[at] << 8) | bytes[at + 1];
}

function readBig32(bytes: Uint8Array, at: number) {
	return ((bytes[at] << 24) >>> 0) + (bytes[at + 1] << 16) + (bytes[at + 2] << 8) + bytes[at + 3];
}

function readLittle32(bytes: Uint8Array, at: number) {
	return (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;
}

function concat(parts: Uint8Array[]) {
	const joined = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
	let at = 0;
	for (const part of parts) {
		joined.set(part, at);
		at += part.length;
	}
	return joined;
}

function isEqual(a?: Uint8Array, b?: Uint8Array) {
	if (!a || !b) return a === b;
	return a.length === b.length && a.every((byte, at) => byte === b[at]);
}

async function inflate(bytes: Uint8Array) {
	const stream = new Blob([bytes as BlobPart])
		.stream()
		.pipeThrough(new DecompressionStream('deflate'));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** The format of a picture, by its first bytes. */
export function toPictureFormat(bytes: Uint8Array): PictureFormatType {
	if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpeg';
	if (bytes[0] === 0x89 && toText(bytes, 1, 3) === 'PNG') return 'png';
	if (toText(bytes, 0, 4) === 'RIFF' && toText(bytes, 8, 4) === 'WEBP') return 'webp';
	if (toText(bytes, 4, 4) === 'ftyp') return 'heif';
	return 'other';
}

// The pieces of a block that comes in several: a JPEG's ICC profile in numbered segments, a HEIC item in extents.
type PartsType = { icc: Array<{ order: number; data: Uint8Array }>; heifExif: Uint8Array[] };

// One block as ExifReader found it, unwrapped from its container. Offsets come from the file, so each is clamped.
async function addBlock(
	found: MetadataBlocksType,
	parts: PartsType,
	bytes: Uint8Array,
	format: PictureFormatType,
	block: MetadataBlock
) {
	const raw = bytes.subarray(Math.max(0, block.start), Math.min(block.end, bytes.length));
	if (format === 'jpeg') {
		// After the marker and the length: FF E1 nn nn. A second EXIF segment is not the camera's: the first is kept.
		const body = raw.subarray(4);
		if (block.type === 'exif' && startsWith(body, EXIF_ID))
			found.exif ??= body.subarray(EXIF_ID.length);
		else if (block.type === 'xmp' && startsWith(body, XMP_ID))
			found.xmp ??= body.subarray(XMP_ID.length);
		else if (block.type === 'xmp' && startsWith(body, XMP_EXTENDED_ID))
			found.xmpExtended.push(body);
		else if (block.type === 'icc' && startsWith(body, ICC_ID)) {
			parts.icc.push({ order: body[ICC_ID.length], data: body.subarray(ICC_ID.length + 2) });
		} else if (block.type === 'iptc' && startsWith(body, PHOTOSHOP_ID)) {
			found.iptc ??= body.subarray(PHOTOSHOP_ID.length);
		}
	} else if (format === 'png') {
		// Length, type, data, CRC.
		const type = toText(raw, 4, 4);
		const data = raw.subarray(8, 8 + Math.min(readBig32(raw, 0), Math.max(0, raw.length - 8)));
		if (type === 'eXIf') found.exif = data;
		else if (type === 'iTXt' && block.type === 'xmp') {
			// Keyword \0, compressed flag, method, language \0, translated keyword \0, text.
			const keywordEnd = data.indexOf(0);
			const isCompressed = data[keywordEnd + 1] === 1;
			const languageEnd = data.indexOf(0, keywordEnd + 3);
			const translatedEnd = data.indexOf(0, languageEnd + 1);
			const text = data.subarray(translatedEnd + 1);
			found.xmp = isCompressed ? await inflate(text) : text;
		} else if (type === 'iCCP') {
			// Profile name \0, method, the zlib-compressed profile.
			parts.icc.push({ order: 1, data: await inflate(data.subarray(data.indexOf(0) + 2)) });
		}
	} else if (format === 'webp') {
		// Type, little-endian length, data.
		const type = toText(raw, 0, 4);
		const data = raw.subarray(8, 8 + Math.min(readLittle32(raw, 4), Math.max(0, raw.length - 8)));
		if (type === 'EXIF')
			found.exif = startsWith(data, EXIF_ID) ? data.subarray(EXIF_ID.length) : data;
		else if (type === 'XMP ') found.xmp = data;
		else if (type === 'ICCP') parts.icc.push({ order: 1, data });
	} else if (format === 'heif') {
		// An item may lie in several extents, in order. The Exif item starts with the distance to its TIFF header.
		if (block.type === 'exif') parts.heifExif.push(raw);
		else if (block.type === 'icc') parts.icc.push({ order: parts.icc.length + 1, data: raw });
		else if (block.type === 'xmp') found.xmp = found.xmp ? concat([found.xmp, raw]) : raw;
	}
}

async function toBlocks(bytes: Uint8Array, tags: ExpandedTags) {
	const blocks: MetadataBlocksType = { xmpExtended: [] };
	const parts: PartsType = { icc: [], heifExif: [] };
	const format = toPictureFormat(bytes);
	for (const block of tags.metadataRange?.blocks ?? []) {
		await addBlock(blocks, parts, bytes, format, block);
	}
	if (parts.icc.length) {
		blocks.icc = concat(parts.icc.toSorted((a, b) => a.order - b.order).map(({ data }) => data));
	}
	if (parts.heifExif.length) {
		const item = concat(parts.heifExif);
		blocks.exif = item.subarray(Math.min(4 + readBig32(item, 0), item.length));
	}
	return blocks;
}

/** What a file's metadata says, field by field, and its blocks: read once, for the time and place and the copy. */
export async function readMetadata(bytes: Uint8Array): Promise<MetadataType> {
	let tags: ExpandedTags;
	try {
		const library = await import('exifreader');
		// Node's own loader hands back ExifReader's CommonJS build as `default`; bundlers spread it.
		const { load, errors } =
			(library as unknown as { default?: typeof library }).default ?? library;
		try {
			tags = await load(bytes, {
				expanded: true,
				includeUnknown: true,
				includeOffsets: true,
				async: true
			});
		} catch (error) {
			// A file with no metadata at all has nothing to carry; one ExifReader cannot read may have some.
			return { blocks: NO_BLOCKS, isRead: error instanceof errors.MetadataMissingError };
		}
	} catch {
		// ExifReader itself did not load (a lost connection): the picture still goes, without its metadata read.
		return { blocks: NO_BLOCKS, isRead: false };
	}
	try {
		return { tags, blocks: await toBlocks(bytes, tags), isRead: true };
	} catch {
		return { tags, blocks: NO_BLOCKS, isRead: false };
	}
}

/** The EXIF block with Orientation set to 1, upright: two bytes change, nothing else. */
export function toUprightExif(exif?: Uint8Array) {
	if (!exif || exif.length < 8) return exif;
	const upright = exif.slice();
	const isLittle = upright[0] === 0x49;
	const view = new DataView(upright.buffer, upright.byteOffset, upright.length);
	const ifd0 = view.getUint32(4, isLittle);
	if (ifd0 + 2 > upright.length) return upright;
	const count = view.getUint16(ifd0, isLittle);
	for (const index of Array.from({ length: count }).keys()) {
		const entry = ifd0 + 2 + index * 12;
		if (entry + 12 > upright.length) break;
		const isOrientation = view.getUint16(entry, isLittle) === 0x0112;
		const isOneShort =
			view.getUint16(entry + 2, isLittle) === 3 && view.getUint32(entry + 4, isLittle) === 1;
		if (isOrientation && isOneShort) view.setUint16(entry + 8, 1, isLittle);
	}
	return upright;
}

const XMP_ORIENTATION = [
	{ pattern: /tiff:Orientation=(["'])[1-8]\1/g, digit: 'tiff:Orientation='.length + 1 },
	{ pattern: /<tiff:Orientation>[1-8]<\/tiff:Orientation>/g, digit: '<tiff:Orientation>'.length }
];

/** The XMP with `tiff:Orientation` set to 1: one byte changes where it is written, nothing else. */
export function toUprightXmp(xmp?: Uint8Array) {
	if (!xmp) return xmp;
	const upright = xmp.slice();
	const text = toText(upright);
	for (const { pattern, digit } of XMP_ORIENTATION) {
		for (const match of text.matchAll(pattern)) upright[match.index + digit] = 0x31;
	}
	return upright;
}

function toChunk(type: string, data: Uint8Array) {
	const head = new Uint8Array(8);
	head.set(toBytes(type));
	new DataView(head.buffer).setUint32(4, data.length, true);
	// A chunk of odd length is padded to even with one zero byte.
	return concat(data.length % 2 ? [head, data, new Uint8Array(1)] : [head, data]);
}

type ChunkType = { type: string; data: Uint8Array };

function toChunks(webp: Uint8Array) {
	const chunks: ChunkType[] = [];
	let at = 12;
	while (at + 8 <= webp.length) {
		const size = readLittle32(webp, at + 4);
		chunks.push({ type: toText(webp, at, 4), data: webp.subarray(at + 8, at + 8 + size) });
		at += 8 + size + (size % 2);
	}
	return chunks;
}

// A WebP's canvas size and whether it has see-through parts, from its VP8X, VP8 or VP8L chunk.
function toCanvas(chunks: ChunkType[]) {
	const extended = chunks.find(({ type }) => type === 'VP8X')?.data;
	if (extended && extended.length >= 10) {
		return {
			width: 1 + (extended[4] | (extended[5] << 8) | (extended[6] << 16)),
			height: 1 + (extended[7] | (extended[8] << 8) | (extended[9] << 16)),
			hasAlpha: (extended[0] & 0x10) !== 0
		};
	}
	const lossy = chunks.find(({ type }) => type === 'VP8 ')?.data;
	if (lossy && lossy.length >= 10) {
		return {
			width: (lossy[6] | (lossy[7] << 8)) & 0x3fff,
			height: (lossy[8] | (lossy[9] << 8)) & 0x3fff,
			hasAlpha: false
		};
	}
	const lossless = chunks.find(({ type }) => type === 'VP8L')?.data;
	if (lossless && lossless.length >= 5) {
		const bits = readLittle32(lossless, 1);
		return {
			width: (bits & 0x3fff) + 1,
			height: ((bits >>> 14) & 0x3fff) + 1,
			hasAlpha: ((bits >>> 28) & 1) === 1
		};
	}
	throw new Error('This WebP holds no picture.');
}

/**
 * A WebP from any encoder (a canvas, jSquash, sharp) written again in the extended format with the original's ICC,
 * EXIF and XMP. Whatever metadata the encoder wrote itself is dropped first, so a file never holds two profiles.
 */
export function writeWebp(webp: Uint8Array, { exif, xmp, icc }: MetadataBlocksType) {
	const chunks = toChunks(webp);
	const { width, height, hasAlpha } = toCanvas(chunks);
	const kept = chunks.filter(({ type }) => !['VP8X', 'ICCP', 'EXIF', 'XMP '].includes(type));
	const isSeeThrough = hasAlpha || kept.some(({ type }) => type === 'ALPH');
	const header = new Uint8Array(10);
	header[0] = (icc ? 0x20 : 0) | (isSeeThrough ? 0x10 : 0) | (exif ? 0x08 : 0) | (xmp ? 0x04 : 0);
	header.set([(width - 1) & 0xff, ((width - 1) >> 8) & 0xff, ((width - 1) >> 16) & 0xff], 4);
	header.set([(height - 1) & 0xff, ((height - 1) >> 8) & 0xff, ((height - 1) >> 16) & 0xff], 7);
	const body = concat([
		toBytes('WEBP'),
		toChunk('VP8X', header),
		...(icc ? [toChunk('ICCP', icc)] : []),
		...kept.map(({ type, data }) => toChunk(type, data)),
		...(exif ? [toChunk('EXIF', exif)] : []),
		...(xmp ? [toChunk('XMP ', xmp)] : [])
	]);
	const riff = new Uint8Array(8);
	riff.set(toBytes('RIFF'));
	new DataView(riff.buffer).setUint32(4, body.length, true);
	return concat([riff, body]);
}

function toSegment(marker: number, ...parts: Uint8Array[]) {
	const data = concat(parts);
	if (data.length > MAX_SEGMENT) throw new Error('This block is too big for a JPEG segment.');
	const head = Uint8Array.of(0xff, marker, (data.length + 2) >> 8, (data.length + 2) & 0xff);
	return concat([head, data]);
}

function toIccSegments(icc?: Uint8Array) {
	if (!icc) return [];
	const size = MAX_SEGMENT - ICC_ID.length - 2;
	const count = Math.ceil(icc.length / size);
	return Array.from({ length: count }, (_, index) =>
		toSegment(
			0xe2,
			toBytes(ICC_ID),
			Uint8Array.of(index + 1, count),
			icc.subarray(index * size, (index + 1) * size)
		)
	);
}

/**
 * A JPEG from any encoder with the original's EXIF, XMP, extended XMP, ICC and Photoshop blocks written after its
 * JFIF header. Whatever metadata the encoder wrote itself is dropped first, so a file never holds two profiles.
 */
export function writeJpeg(
	jpeg: Uint8Array,
	{ exif, xmp, xmpExtended, icc, iptc }: MetadataBlocksType
) {
	const head = [jpeg.subarray(0, 2)];
	const rest: Uint8Array[] = [];
	let at = 2;
	// Every segment up to the start of the picture data (SOS, FF DA).
	while (at + 4 <= jpeg.length && jpeg[at] === 0xff && jpeg[at + 1] !== 0xda) {
		const marker = jpeg[at + 1];
		const end = Math.min(at + 2 + readBig16(jpeg, at + 2), jpeg.length);
		const body = jpeg.subarray(at + 4, end);
		const isExifOrXmp =
			startsWith(body, EXIF_ID) || startsWith(body, XMP_ID) || startsWith(body, XMP_EXTENDED_ID);
		const isMetadata =
			(marker === 0xe1 && isExifOrXmp) ||
			(marker === 0xe2 && startsWith(body, ICC_ID)) ||
			marker === 0xed;
		if (marker === 0xe0) head.push(jpeg.subarray(at, end));
		else if (!isMetadata) rest.push(jpeg.subarray(at, end));
		at = end;
	}
	return concat([
		...head,
		...(exif ? [toSegment(0xe1, toBytes(EXIF_ID), exif)] : []),
		...(xmp ? [toSegment(0xe1, toBytes(XMP_ID), xmp)] : []),
		...xmpExtended.map((body) => toSegment(0xe1, body)),
		...toIccSegments(icc),
		...(iptc ? [toSegment(0xed, toBytes(PHOTOSHOP_ID), iptc)] : []),
		...rest,
		jpeg.subarray(at)
	]);
}

// A group's fields as text to compare, Orientation and the raw XMP packet left out (the blocks are compared byte
// for byte), and pictures' bytes written out so a changed thumbnail shows.
function toComparable(tags: ExpandedTags | undefined, groups: readonly string[]) {
	const picked = Object.fromEntries(
		groups.map((group) => [group, (tags as Record<string, unknown> | undefined)?.[group]])
	);
	return JSON.stringify(picked, (key, value) => {
		if (key === 'Orientation' || key === '_raw') return undefined;
		if (value instanceof ArrayBuffer) return Array.from(new Uint8Array(value));
		return value;
	});
}

// Whether the copy holds every block and field it was given: the blocks byte for byte, the fields one by one.
function isCarried(
	original: MetadataType,
	written: MetadataBlocksType,
	copy: MetadataType,
	isJpeg: boolean
) {
	if (!copy.isRead) return false;
	const isSameBlocks =
		isEqual(written.exif, copy.blocks.exif) &&
		isEqual(written.xmp, copy.blocks.xmp) &&
		isEqual(written.icc, copy.blocks.icc) &&
		(!isJpeg || isEqual(written.iptc, copy.blocks.iptc));
	const groups = isJpeg ? [...CARRIED_GROUPS, ...JPEG_ONLY_GROUPS] : CARRIED_GROUPS;
	return isSameBlocks && toComparable(original.tags, groups) === toComparable(copy.tags, groups);
}

/**
 * The encoded copy with every metadata block of the original carried into it, Orientation upright; or nothing when
 * that cannot be done faithfully (the copy is not a WebP or JPEG, a block has no place in it, or the copy read back
 * differs), and the caller decides what goes instead (ADR 0004).
 */
export async function carryMetadata(original: MetadataType, encoded: Uint8Array) {
	if (!original.isRead) return undefined;
	const format = toPictureFormat(encoded);
	const { blocks } = original;
	// A WebP has no place for a JPEG's extended XMP.
	const isWebp = format === 'webp' && !blocks.xmpExtended.length;
	if (!isWebp && format !== 'jpeg') return undefined;
	try {
		const written = { ...blocks, exif: toUprightExif(blocks.exif), xmp: toUprightXmp(blocks.xmp) };
		const copy = isWebp ? writeWebp(encoded, written) : writeJpeg(encoded, written);
		return isCarried(original, written, await readMetadata(copy), !isWebp) ? copy : undefined;
	} catch {
		return undefined;
	}
}

/**
 * The original's full field list as the File row keeps it (Justin, 2026-11-24, on #281): every group ExifReader
 * reads, unknown tags included, so a field the copy has no slot for (IPTC, PNG text, RAW maker data) is never lost.
 * Pictures inside the metadata (a thumbnail, a second picture) are not fields: their bytes are noted by size only.
 */
export function toFieldList(tags?: ExpandedTags): FieldListType | undefined {
	if (!tags) return undefined;
	const { metadataRange: _range, ...groups } = tags;
	return toStorableJson(groups) as FieldListType;
}

/**
 * A photo's "2026:05:12 09:30:00" with its "+02:00", as an ISO time; without an offset it is read in the time zone of
 * whatever reads it (the device's on the phone, which is why the server keeps the device's reading, #294).
 */
export function toExifTime(dateTime?: string, offset?: string) {
	const match = dateTime?.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
	if (!match) return undefined;
	const [, year, month, day, hour, minute, second] = match;
	const local = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
	const zone = offset?.match(/^[+-]\d{2}:\d{2}$/) ? offset : '';
	const time = new Date(`${local}${zone}`);
	return Number.isNaN(time.getTime()) ? undefined : time.toISOString();
}

/** What a file's metadata says of when and where, from the fields ExifReader read. */
export function toExifTaken(tags?: ExpandedTags): ExifTakenType {
	if (!tags) return {};
	const description = (tag?: { description?: string }) => tag?.description;
	const at = toExifTime(
		description(tags.exif?.DateTimeOriginal) ?? description(tags.exif?.DateTime),
		description(tags.exif?.OffsetTimeOriginal)
	);
	const { Latitude: latitude, Longitude: longitude } = tags.gps ?? {};
	const hasPlace = Number.isFinite(latitude) && Number.isFinite(longitude);
	return { at, ...(hasPlace ? { latitude, longitude } : {}) };
}
