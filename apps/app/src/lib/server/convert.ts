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
import { eq, sql } from 'drizzle-orm';
import decodeHeic from 'heic-decode';
import sharp, { type Sharp } from 'sharp';
import {
	type ConvertAnswerType,
	type FieldListType,
	isFieldListKept,
	isToConvert,
	MAX_PICTURE_SIDE,
	type PictureKindType,
	QUALITY,
	type TakenType
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
import type { FileStoreType } from './store';

/** The copy the server made, ready to swap in. */
export type ConvertedType = {
	bytes: Uint8Array;
	type: 'image/webp' | 'image/jpeg';
	width: number;
	height: number;
	/** Whether the copy holds every field the original's blocks held, read back and compared. */
	isChecked: boolean;
	/** When and where, as the file itself says. */
	taken: TakenType;
	/** The original's full field list, when it is short enough to keep. */
	metadata?: FieldListType;
};

const REASONS = {
	guest: 'You are waiting for access. An Admin of the organization can let you in.',
	missing: 'No such file.',
	unreadable: 'This picture could not be read. Save it as a JPEG and add it again.'
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
// turn), sharp's own reading for anything else (it turns the picture by its Orientation).
async function toPixels(bytes: Uint8Array, kind: PictureKindType) {
	if (toPictureFormat(bytes) === 'heif') {
		try {
			const { width, height, data } = await decodeHeic({ buffer: bytes });
			const raw = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
			const image = sharp(raw, { raw: { width, height, channels: 4 } });
			// A HEIC photo has no see-through parts; libheif hands every pixel an opaque alpha all the same.
			return kind === 'photo' ? image.removeAlpha() : image;
		} catch {
			// Not a HEVC HEIC (an AVIF): sharp reads those itself.
		}
	}
	const image = sharp(bytes, { failOn: 'error' });
	await image.metadata();
	// Upright, and the colour numbers as they are: the original's own profile goes with them (`keepIccProfile`).
	return image.rotate().keepIccProfile();
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
	try {
		image = await toPixels(bytes, kind);
	} catch {
		throw new Error(REASONS.unreadable);
	}
	const fields = toFieldList(original.tags);
	const exif = toExifTaken(original.tags);
	const hasPlace = exif.latitude !== undefined && exif.longitude !== undefined;
	const taken: TakenType = exif.at || hasPlace ? { from: 'file', ...exif } : { from: '' };
	const kept = {
		taken,
		...(fields && isFieldListKept(fields) ? { metadata: fields } : {})
	};

	const webp = await encode(image, kind, 'webp');
	const carried = await carryMetadata(original, webp.bytes);
	if (carried) return { ...webp, bytes: carried, type: 'image/webp', isChecked: true, ...kept };
	if (kind === 'photo') {
		const jpeg = await encode(image, kind, 'jpeg');
		const inJpeg = await carryMetadata(original, jpeg.bytes);
		if (inJpeg) return { ...jpeg, bytes: inJpeg, type: 'image/jpeg', isChecked: true, ...kept };
	}
	// The blocks a WebP holds, unchecked, so the copy still says what it can; or none when even that fails.
	let partial = webp.bytes;
	try {
		const { exif: block, xmp, icc } = original.blocks;
		partial = writeWebp(webp.bytes, {
			exif: toUprightExif(block),
			xmp: toUprightXmp(xmp),
			icc,
			xmpExtended: []
		});
	} catch {
		// The plain copy, then.
	}
	return { ...webp, bytes: partial, type: 'image/webp', isChecked: false, ...kept };
}

// The row as the conversion reads it.
async function readRow(claims: ClaimsType, actor: ActorType, id: string) {
	const [row] = await claims.run(actor, (tx) =>
		tx
			.select({
				id: files.id,
				organizationId: files.organizationId,
				path: files.path,
				type: files.type,
				width: files.width,
				height: files.height,
				takenFrom: files.takenFrom,
				hasMetadata: sql<boolean>`${files.metadata} is not null`
			})
			.from(files)
			.where(eq(files.id, id))
	);
	return row;
}

// Whether a browser shows the stored file as it is: then a copy that falls short is not worth keeping over it.
function isShownAsItIs(type: string) {
	return ['image/webp', 'image/jpeg', 'image/png'].includes(type);
}

export type ConvertCallType = {
	claims: ClaimsType;
	actor: ActorType;
	store: FileStoreType;
	id: string;
	kind: PictureKindType;
};

/**
 * Converts the stored file with this id, when the actor's organization has it and it still needs converting, and
 * swaps the copy in. Done once the file shows as the copy the app keeps; else the reason, and the file as it was.
 */
export async function convertFile(call: ConvertCallType): Promise<ConvertAnswerType> {
	const { claims, actor, store, id, kind } = call;
	if (!actor.organizationId) return { isDone: false, reason: REASONS.guest };
	if (!UUID.test(id)) return { isDone: false, reason: REASONS.missing };
	const row = await readRow(claims, actor, id);
	if (!row) return { isDone: false, reason: REASONS.missing };
	if (!isToConvert(row, kind)) return { isDone: true };

	let converted: ConvertedType;
	try {
		converted = await takeTurn(async () => convertPicture(await store.read(row.path), kind));
	} catch {
		return { isDone: false, reason: REASONS.unreadable };
	}
	// A picture that shows as it is stays as it came rather than swap in a copy that lost something.
	if (!converted.isChecked && isShownAsItIs(row.type)) return { isDone: true };

	const ending = converted.type === 'image/webp' ? 'webp' : 'jpg';
	const path = `${row.organizationId}/${id}-${MAX_PICTURE_SIDE[kind]}.${ending}`;
	await store.write(path, converted.bytes, converted.type);
	// The device's reading of when and where stands when it read them from the file: it knows its own time zone.
	const isTakenKept = row.takenFrom === 'file' || converted.taken.from !== 'file';
	const { taken } = converted;
	await claims.run(actor, (tx) =>
		tx
			.update(files)
			.set({
				path,
				type: converted.type,
				size: converted.bytes.byteLength,
				width: converted.width,
				height: converted.height,
				originalPath: row.path,
				...(isTakenKept
					? {}
					: {
							takenFrom: 'file',
							takenAt: taken.at ? new Date(taken.at) : null,
							latitude: taken.latitude ?? null,
							longitude: taken.longitude ?? null
						}),
				...(row.hasMetadata || !converted.metadata ? {} : { metadata: converted.metadata })
			})
			.where(eq(files.id, id))
	);
	if (!converted.isChecked) return { isDone: true };
	try {
		await store.remove(row.path);
		await claims.run(actor, (tx) =>
			tx.update(files).set({ originalPath: null }).where(eq(files.id, id))
		);
	} catch {
		// The copy shows; the untouched file stays named on the row until it is deleted.
	}
	return { isDone: true };
}
