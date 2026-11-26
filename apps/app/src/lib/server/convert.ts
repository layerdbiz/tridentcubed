// Converting a picture on the server (#294; ADR 0004; research #281, section 5). A device that cannot read a photo
// (HEIC in Chrome on Windows and Android, TIFF), or whose own copy fell short of carrying every field (#292), sends it
// untouched and then asks for it to be converted. The server turns it into the same copy a device makes: a WebP at most
// 2048 px on its long side (1024 for a logo), drawn upright, with the original's EXIF, XMP and ICC blocks carried byte
// for byte by the same carry the device uses (`#lib/metadata`), only Orientation turned upright, and read back to check.
//
// HEIC's pixels come from libheif (`heic-decode`, WebAssembly; LGPL, which running on the server does not distribute);
// everything else's from sharp, which also shrinks and encodes. Colours stay the numbers the original holds, since its
// own profile goes with them. A photo whose blocks a WebP cannot hold (a JPEG's XMP past 64 KB) is kept as a JPEG,
// which can.
//
// Then the swap: the copy is written beside the untouched file, the file row moves to it, and the untouched file is
// deleted once the copy checks out. A copy that cannot carry every field (a TIFF, whose fields are woven into the
// file rather than kept in a block: ExifTool's work, not built yet) is still swapped in so the photo shows, and the
// untouched file is kept beside it, named on the row (`original_path`), so nothing of it is lost.
import { and, eq, isNull } from 'drizzle-orm';
import decodeHeic from 'heic-decode';
import sharp, { type Sharp } from 'sharp';
import {
	type ConvertAnswerType,
	type FieldListType,
	isFieldListKept,
	isShownType,
	isToConvert,
	MAX_PICTURE_SIDE,
	type PictureKindType,
	QUALITY,
	type TakenType,
	toEnding,
	toStorableJson,
	UNREADABLE
} from '#lib/files/files.schema.js';
import {
	carryMetadata,
	readMetadata,
	toExifTaken,
	toFieldList,
	toPictureFormat,
	toUprightExif,
	toUprightXmp,
	writeWebp
} from '#lib/metadata/metadata.utils.js';
import type { ActorType, ClaimsType } from './db/claims';
import { file as files } from './db/schema';
import { readFile } from './files';
import type { FileStoreType } from './store';

/** The copy the server made, ready to swap in. */
export type ConvertedType = {
	bytes: Uint8Array;
	type: 'image/webp' | 'image/jpeg';
	width: number;
	height: number;
	/** Whether the copy holds every field the original's blocks held, read back and compared. */
	isChecked: boolean;
	/** #343: whether the copy holds some of the original's fields, when not every one (the blocks a WebP holds). */
	hasSome: boolean;
	/** #343: the original's pixel size, drawn upright. */
	full: { width: number; height: number };
	/** When and where, as the file itself says. */
	taken: TakenType;
	/** The original's full field list, when it is short enough to keep. */
	metadata?: FieldListType;
};

const REASONS = {
	missing: 'No such file.',
	notYours: 'Only the person who added this picture can have it converted.'
};

// How many pictures one server works on at once: a 12 MP HEIC takes 250 to 390 MB while it is drawn (research #281).
const AT_ONCE = 2;

let running = 0;
const waiting: Array<() => void> = [];

// Runs the work when a place is free, so pictures sent together take turns rather than run the server out of memory.
async function takeTurn<T>(work: () => Promise<T>) {
	if (running >= AT_ONCE) await new Promise<void>((resolve) => waiting.push(resolve));
	running += 1;
	try {
		return await work();
	} finally {
		running -= 1;
		waiting.shift()?.();
	}
}

// sharp's pipeline with the picture's pixels in it, drawn upright: libheif's for a HEIC (it applies the HEIC's own
// turn), sharp's own reading for anything else (it turns the picture by its Orientation). With it, the original's
// pixel size drawn upright (#343).
async function toPixels(bytes: Uint8Array, kind: PictureKindType) {
	if (toPictureFormat(bytes) === 'heif') {
		try {
			const { width, height, data } = await decodeHeic({ buffer: bytes });
			const raw = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
			const image = sharp(raw, { raw: { width, height, channels: 4 } });
			// A HEIC photo has no see-through parts; libheif hands every pixel an opaque alpha all the same.
			return { image: kind === 'photo' ? image.removeAlpha() : image, full: { width, height } };
		} catch {
			// Not a HEVC HEIC (an AVIF): sharp reads those itself.
		}
	}
	const image = sharp(bytes, { failOn: 'error' });
	const { width, height, orientation = 1 } = await image.metadata();
	// Orientation 5 to 8 turn the picture a quarter, so upright its sides swap.
	const full = orientation >= 5 ? { width: height, height: width } : { width, height };
	// Upright, and the colour numbers as they are: the original's own profile goes with them (`keepIccProfile`).
	return { image: image.rotate().keepIccProfile(), full };
}

async function encode(image: Sharp, kind: PictureKindType, format: 'webp' | 'jpeg') {
	const max = MAX_PICTURE_SIDE[kind];
	const quality = Math.round(QUALITY[kind] * 100);
	const shrunk = image.clone().resize(max, max, { fit: 'inside', withoutEnlargement: true });
	const encoded = format === 'webp' ? shrunk.webp({ quality }) : shrunk.jpeg({ quality });
	const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
	return { bytes: new Uint8Array(data), width: info.width, height: info.height };
}

/**
 * A picture's bytes turned into the copy the app keeps: a WebP (a JPEG for a photo whose blocks only a JPEG holds)
 * with every metadata field carried and checked. When nothing can carry every field, a WebP with the blocks it can
 * hold, not checked (`isChecked` false), so the caller keeps the original.
 */
export async function convertPicture(
	bytes: Uint8Array,
	kind: PictureKindType
): Promise<ConvertedType> {
	const original = await readMetadata(bytes);
	let image: Sharp;
	let full: ConvertedType['full'];
	try {
		({ image, full } = await toPixels(bytes, kind));
	} catch {
		throw new Error(UNREADABLE);
	}
	const fields = toFieldList(original.tags);
	const exif = toExifTaken(original.tags);
	const hasPlace = exif.latitude !== undefined && exif.longitude !== undefined;
	const taken: TakenType = exif.at || hasPlace ? { from: 'file', ...exif } : { from: '' };
	const kept = {
		taken,
		full,
		...(fields && isFieldListKept(fields) ? { metadata: fields } : {})
	};

	const webp = await encode(image, kind, 'webp');
	const carried = await carryMetadata(original, webp.bytes);
	const checked = { isChecked: true, hasSome: true, ...kept };
	if (carried) return { ...webp, bytes: carried, type: 'image/webp', ...checked };
	if (kind === 'photo') {
		const jpeg = await encode(image, kind, 'jpeg');
		const inJpeg = await carryMetadata(original, jpeg.bytes);
		if (inJpeg) return { ...jpeg, bytes: inJpeg, type: 'image/jpeg', ...checked };
	}
	// The blocks a WebP holds, unchecked, so the copy still says what it can; or none when even that fails.
	let partial = webp.bytes;
	let hasSome = false;
	try {
		const { exif: block, xmp, icc } = original.blocks;
		partial = writeWebp(webp.bytes, {
			exif: toUprightExif(block),
			xmp: toUprightXmp(xmp),
			icc,
			xmpExtended: []
		});
		hasSome = Boolean(block || xmp || icc);
	} catch {
		// The plain copy, then.
	}
	return { ...webp, bytes: partial, type: 'image/webp', isChecked: false, hasSome, ...kept };
}

// A logo is kept at logo size; every other picture column holds a photo (as `image-field.svelte` picks its kind).
function toPictureKind(column: string): PictureKindType {
	return column === 'logo' ? 'logo' : 'photo';
}

/**
 * Converts the stored file with this id and swaps the copy in, when the actor sent it and it still needs converting;
 * what kind of picture it is comes from the column it is for. Done once the file shows as the copy the app keeps;
 * else the reason, and the file as it was.
 */
export async function convertFile(
	claims: ClaimsType,
	actor: ActorType,
	store: FileStoreType,
	id: string
): Promise<ConvertAnswerType> {
	const file = await readFile(claims, actor, id);
	if (!file) return { isDone: false, reason: REASONS.missing };
	// Whoever asked for the upload address passed the permission check for it, so only they convert it.
	if (file.uploadedBy !== actor.userId) return { isDone: false, reason: REASONS.notYours };
	const kind = toPictureKind(file.for.column);
	if (!isToConvert(file, kind)) return { isDone: true };

	let converted: ConvertedType;
	try {
		converted = await takeTurn(async () => convertPicture(await store.read(file.path), kind));
	} catch {
		return { isDone: false, reason: UNREADABLE };
	}
	// A picture that shows as it is stays as it came rather than swap in a copy that lost something: the original,
	// every field of it there (#343).
	if (!converted.isChecked && isShownType(file.type)) {
		await claims.run(actor, (tx) =>
			tx.update(files).set({ metadataCarried: 'all' }).where(eq(files.id, id))
		);
		return { isDone: true };
	}

	const path = `${actor.organizationId}/${id}-${MAX_PICTURE_SIDE[kind]}.${toEnding(converted.type, '')}`;
	await store.write(path, converted.bytes, converted.type);
	// The device's reading of when and where stands when it read them from the file: it knows its own time zone.
	const isTakenKept = file.taken.from === 'file' || converted.taken.from !== 'file';
	const { taken, metadata, full } = converted;
	// #343: the original as it arrived is the untouched file, its pixel size read here when the device could not.
	const original = file.original ?? { type: file.type, size: file.size };
	const carried = converted.isChecked ? 'all' : converted.hasSome ? 'some' : 'none';
	await claims.run(actor, async (tx) => {
		await tx
			.update(files)
			.set({
				path,
				type: converted.type,
				size: converted.bytes.byteLength,
				width: converted.width,
				height: converted.height,
				originalPath: file.path,
				originalType: original.type,
				originalSize: original.size ?? null,
				originalWidth: original.width ?? full.width,
				originalHeight: original.height ?? full.height,
				metadataCarried: carried,
				...(isTakenKept
					? {}
					: {
							takenFrom: 'file',
							takenAt: taken.at ? new Date(taken.at) : null,
							latitude: taken.latitude ?? null,
							longitude: taken.longitude ?? null
						})
			})
			.where(eq(files.id, id));
		// The field list the device read stands; else the one read here, written as Postgres keeps it.
		if (metadata) {
			await tx
				.update(files)
				.set({ metadata: toStorableJson(metadata) as FieldListType })
				.where(and(eq(files.id, id), isNull(files.metadata)));
		}
	});
	if (!converted.isChecked) return { isDone: true };
	try {
		await store.remove(file.path);
		await claims.run(actor, (tx) =>
			tx.update(files).set({ originalPath: null }).where(eq(files.id, id))
		);
	} catch {
		// The copy shows; the untouched file stays named on the row until it is deleted.
	}
	return { isDone: true };
}
