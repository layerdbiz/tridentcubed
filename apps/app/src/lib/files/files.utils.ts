// Getting a picture ready on the device (ADR 0004; spec #179 "Files"; #187; #292). The file is read once: the time
// and place it was taken, its full field list for the File row, and its metadata blocks. Then it is shrunk: a photo to
// at most 2048 px on its long side as a WebP (the app's own encoder where the browser cannot write one, as on Safari;
// a JPEG if that fails too), and a logo to at most 1024 px, kept as WebP or PNG so its clear background stays. The
// copy gets every metadata field of the original, only Orientation turned upright (`#lib/metadata`); when it cannot,
// a photo goes untouched instead, and the server converts it (#294). A picture the device cannot read at all (HEIC in
// Chrome on Windows and Android, TIFF) goes untouched for the server too; one the server cannot convert either is
// turned down with a reason. When the file says neither when nor where, the device's clock (and its place, only if
// the User already allowed it: a picture never asks) stand in, with a flag saying so.
import {
	carryMetadata,
	type ExifTakenType,
	type MetadataType,
	readMetadata,
	toExifTaken,
	toFieldList
} from '#lib/metadata/metadata.utils.js';
import {
	type CarriedType,
	type FieldListType,
	isConvertibleType,
	isFieldListKept,
	isShownType,
	isToConvert,
	MAX_FILE_BYTES,
	MAX_PICTURE_SIDE,
	PictureError,
	type PictureKindType,
	QUALITY,
	type TakenType,
	toPictureType,
	toTyped,
	UNREADABLE,
	type UploadRequestType
} from './files.schema';

/** #343: the file the User picked, as it arrived: its type and size, and its pixel size once it is read. */
export type PickedType = NonNullable<UploadRequestType['original']>;

export type PlaceType = { latitude: number; longitude: number };

/** A picture shrunk and ready to send, or the original untouched for the server to convert. */
export type PreparedType = {
	blob: Blob;
	/** Its size in pixels; unknown for a picture the device could not read. */
	width?: number;
	height?: number;
	taken: TakenType;
	/** The original's full field list, for the File row (#292). */
	metadata?: FieldListType;
	/** The device could not read it, so it cannot show it either: its spot shows its name (#294). */
	isUnreadable?: boolean;
	/** It went untouched and the server makes the copy the app keeps (#294). */
	shouldConvert?: boolean;
	/** #343: the file the User picked, its pixel size unknown when the device could not read it. */
	original?: PickedType;
	/** #343: whether what goes holds every metadata field of the original; the server says when it converts. */
	carried?: CarriedType;
};

/** The size a picture is drawn at: its own, or smaller so its long side is at most `max`, never larger. */
export function toFittedSize(width: number, height: number, max: number) {
	const scale = Math.min(1, max / Math.max(width, height, 1));
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale))
	};
}

/** What can turn a drawn picture into a file: a canvas, or anything with its `toBlob`. */
export type BlobMakerType = {
	toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: number): void;
};

function toBlob(canvas: BlobMakerType, type: string, quality?: number) {
	return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/** The app's own WebP encoder, for a browser that cannot write WebP from a canvas (Safari). */
export type WebpEncoderType = () => Promise<Blob>;

/**
 * The drawn picture as a file: a WebP when the browser can write one (a browser that cannot write a type hands back a
 * PNG instead, which is how it is noticed), else a WebP from the app's own encoder, else a JPEG for a photo and a PNG
 * for a logo.
 */
export async function encodePicture(
	canvas: BlobMakerType,
	kind: PictureKindType,
	encodeWebp?: WebpEncoderType
) {
	const webp = await toBlob(canvas, 'image/webp', QUALITY[kind]);
	if (webp?.type === 'image/webp') return webp;
	try {
		if (encodeWebp) return await encodeWebp();
	} catch {
		// The encoder did not load or failed: the older format still works everywhere.
	}
	const fallback =
		kind === 'photo'
			? await toBlob(canvas, 'image/jpeg', QUALITY.photo)
			: await toBlob(canvas, 'image/png');
	if (!fallback) throw new Error('This browser could not shrink the picture.');
	return fallback;
}

// jSquash's encoder, loaded once and shared by every photo, and loaded again only after a failed try.
let encoderReady: Promise<typeof import('@jsquash/webp/encode.js')> | undefined;

function loadEncoder() {
	encoderReady ??= (async () => {
		const [encoder, { default: fastUrl }, { default: plainUrl }] = await Promise.all([
			import('@jsquash/webp/encode.js'),
			import('@jsquash/webp/codec/enc/webp_enc_simd.wasm?url'),
			import('@jsquash/webp/codec/enc/webp_enc.wasm?url')
		]);
		// jSquash picks its SIMD build where the browser has SIMD, else the plain one for an older phone.
		await encoder.init({
			locateFile: (path: string) => (path.includes('simd') ? fastUrl : plainUrl)
		});
		return encoder;
	})().catch((error: unknown) => {
		encoderReady = undefined;
		throw error;
	});
	return encoderReady;
}

/** A WebP from jSquash (Google's libwebp as WebAssembly, research #281), loaded only on a browser that needs it. */
export async function encodeWebpInWasm(image: ImageData, quality: number) {
	const { default: encode } = await loadEncoder();
	const bytes = await encode(image, { quality: Math.round(quality * 100) });
	return new Blob([bytes], { type: 'image/webp' });
}

/**
 * How long after it was taken a photo counts as just taken. Phones hand a browser photos with their place taken out
 * (Chrome on Android, found 2026-11-26), so a photo just taken with no place of its own takes the device's place:
 * the device is still where the photo was taken. An older one from the gallery never does.
 */
export const JUST_TAKEN_MS = 15 * 60 * 1000;

/** Whether a photo taken at this time was taken just now, give or take a clock a little off. */
export function isJustTaken(at: string | undefined, now: Date) {
	const time = at ? Date.parse(at) : Number.NaN;
	return Number.isFinite(time) && Math.abs(now.getTime() - time) <= JUST_TAKEN_MS;
}

/**
 * When and where it was taken: the file's own word first, else the device's, else nothing. A photo just taken that
 * says when but not where takes the device's place, flagged as such.
 */
export function toTaken(exif: ExifTakenType, device: { now?: Date; place?: PlaceType }): TakenType {
	const hasPlace = exif.latitude !== undefined && exif.longitude !== undefined;
	if (exif.at && !hasPlace && device.place && device.now && isJustTaken(exif.at, device.now)) {
		return { from: 'file-device', at: exif.at, ...device.place };
	}
	if (exif.at || hasPlace) {
		return {
			from: 'file',
			...(exif.at ? { at: exif.at } : {}),
			...(hasPlace ? { latitude: exif.latitude, longitude: exif.longitude } : {})
		};
	}
	if (!device.now && !device.place) return { from: '' };
	return {
		from: 'device',
		...(device.now ? { at: device.now.toISOString() } : {}),
		...(device.place ? device.place : {})
	};
}

// Whether this browser has already asked for the device's place once (ADR 0004: asked once, never required). A
// browser that keeps nothing counts as asked, so it is never asked over and over.
const ASKED_KEY = 'trident:place-asked';

function hasAskedForPlace() {
	try {
		return localStorage.getItem(ASKED_KEY) === 'yes';
	} catch {
		return true;
	}
}

function markAskedForPlace() {
	try {
		localStorage.setItem(ASKED_KEY, 'yes');
	} catch {
		// Nothing kept: hasAskedForPlace says asked.
	}
}

async function readPlace(): Promise<PlaceType | undefined> {
	if (!navigator.geolocation) return undefined;
	const permission = await navigator.permissions
		?.query({ name: 'geolocation' })
		.catch(() => undefined);
	const state = permission?.state ?? 'prompt';
	if (state === 'denied') return undefined;
	const isAsking = state !== 'granted';
	if (isAsking) {
		if (hasAskedForPlace()) return undefined;
		markAskedForPlace();
	}
	// Asking waits for the User's answer, a while; a place already allowed is read quickly or not at all.
	const waitMs = isAsking ? 20_000 : 3_000;
	return new Promise((resolve) => {
		const giveUp = setTimeout(() => resolve(undefined), waitMs);
		navigator.geolocation.getCurrentPosition(
			({ coords }) => {
				clearTimeout(giveUp);
				resolve({ latitude: coords.latitude, longitude: coords.longitude });
			},
			() => {
				clearTimeout(giveUp);
				resolve(undefined);
			},
			{ timeout: 3_000, maximumAge: 60_000 }
		);
	});
}

let placeReading: Promise<PlaceType | undefined> | undefined;

/**
 * The device's place: where the User allowed it, or the first time a photo needs it, after the browser asks once
 * (ADR 0004). Never required and never asked again; photos added together share one reading.
 */
export function readDevicePlace(): Promise<PlaceType | undefined> {
	placeReading ??= readPlace()
		.catch(() => undefined)
		.finally(() => {
			placeReading = undefined;
		});
	return placeReading;
}

/** What goes to storage: the carried copy, the original untouched, or the copy alone with nothing carried. */
export type SentType = 'copy' | 'original' | 'plain';

/** Whether storage takes a picture of this type and size untouched: one it shows, or one the server converts (#294). */
export function isKeptAsItIs(file: { type: string; size: number }) {
	return (isShownType(file.type) || isConvertibleType(file.type)) && file.size <= MAX_FILE_BYTES;
}

/**
 * Which file goes: the copy when it carries every field and the field list fits. Otherwise a photo goes untouched,
 * when storage takes its type, so nothing of it is lost, and the server converts it (ADR 0004, #294); a logo, or a
 * photo storage cannot take (over 20 MB), goes as the copy, with whatever it carried.
 */
export function toSent(choice: {
	kind: PictureKindType;
	file: { type: string; size: number };
	isCarried: boolean;
	isListKept: boolean;
}): SentType {
	if (choice.isCarried && choice.isListKept) return 'copy';
	if (choice.kind === 'photo' && isKeptAsItIs(choice.file)) return 'original';
	return choice.isCarried ? 'copy' : 'plain';
}

/**
 * Whether what goes holds every metadata field of the original (#343): a carried copy or the original kept as it
 * came does, a plain copy holds none, and the server says for an original it converts.
 */
export function toCarried(sent: SentType, shouldConvert: boolean): CarriedType {
	if (sent === 'plain') return 'none';
	return sent === 'original' && shouldConvert ? '' : 'all';
}

/**
 * A picture the device could not read, as it goes untouched for the server to convert, typed by its name when the
 * browser gave it no type (a HEIC dropped on Windows); turned down, with the reason the User reads, when the server
 * cannot convert it either (camera RAW, a broken file).
 */
export function toUntouched(file: File): Blob {
	const type = toPictureType(file);
	if (!isConvertibleType(type)) throw new PictureError(UNREADABLE);
	return toTyped(file, type);
}

// The picture drawn upright at its shrunk size and encoded. `none` keeps the picture's own colour numbers, for a
// copy its colour profile is carried into (#281); `default` turns them into sRGB, for a copy with no profile.
async function drawPicture(
	file: File,
	kind: PictureKindType,
	colorSpaceConversion: ColorSpaceConversion
) {
	const bitmap = await createImageBitmap(file, { colorSpaceConversion });
	const full = { width: bitmap.width, height: bitmap.height };
	const { width, height } = toFittedSize(bitmap.width, bitmap.height, MAX_PICTURE_SIDE[kind]);
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext('2d');
	context?.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();
	const blob = await encodePicture(canvas, kind, async () => {
		if (!context) throw new Error('This browser cannot read a drawn picture.');
		return encodeWebpInWasm(context.getImageData(0, 0, width, height), QUALITY[kind]);
	});
	return { blob, width, height, full };
}

// The time and place it was taken: the file's own, else (for a photo) the device's. The device's place is read for
// a photo that says nothing of either, or that was just taken and came without its place.
async function toPictureTaken(original: MetadataType, kind: PictureKindType) {
	const exif = toExifTaken(original.tags);
	const now = new Date();
	const isPlaceMissing = exif.latitude === undefined || exif.longitude === undefined;
	if (kind === 'photo' && isPlaceMissing && (!exif.at || isJustTaken(exif.at, now))) {
		return toTaken(exif, { now, place: await readDevicePlace() });
	}
	return toTaken(exif, {});
}

/**
 * A picked picture read, then shrunk and encoded on the device, ready to send: the copy with every metadata field of
 * the original carried into it, and the original's field list (#292). See `toSent` for what goes when that fails,
 * and `toUntouched` for a picture the device cannot read (#294).
 */
export async function preparePicture(file: File, kind: PictureKindType): Promise<PreparedType> {
	const original = await readMetadata(new Uint8Array(await file.arrayBuffer()));
	const picked: PickedType = { type: toPictureType(file) || file.type, size: file.size };
	const taken = await toPictureTaken(original, kind);
	const fields = toFieldList(original.tags);
	const isListKept = !fields || isFieldListKept(fields);
	const metadata = isListKept ? fields : undefined;
	const hasProfile = Boolean(original.blocks.icc);
	let drawn: Awaited<ReturnType<typeof drawPicture>>;
	try {
		drawn = await drawPicture(file, kind, hasProfile ? 'none' : 'default');
	} catch (error) {
		// A JPEG, PNG or WebP every browser draws failed for another reason (a big one can run the device out of
		// memory): an upload to retry, not a picture to convert.
		if (isShownType(toPictureType(file))) throw error;
		const blob = toUntouched(file);
		return {
			blob,
			taken,
			metadata,
			isUnreadable: true,
			shouldConvert: true,
			original: picked,
			carried: ''
		};
	}
	const facts = { ...picked, ...drawn.full };
	const copy = await carryMetadata(original, new Uint8Array(await drawn.blob.arrayBuffer()));
	const typed = toTyped(file, toPictureType(file) || file.type);
	const sent = toSent({ kind, file: typed, isCarried: Boolean(copy), isListKept });
	if (sent === 'original') {
		const shouldConvert = isToConvert({ type: typed.type, ...drawn.full }, kind);
		const carried = toCarried(sent, shouldConvert);
		return { blob: typed, ...drawn.full, taken, metadata, shouldConvert, original: facts, carried };
	}
	const carried = toCarried(sent, false);
	if (sent === 'copy' && copy) {
		const blob = new Blob([copy], { type: drawn.blob.type });
		const { width, height } = drawn;
		return { blob, width, height, taken, metadata, original: facts, carried };
	}
	// Nothing carried, so no profile goes with the colours: draw them again in sRGB if they were kept as they were.
	const plain = hasProfile ? await drawPicture(file, kind, 'default') : drawn;
	const { blob, width, height } = plain;
	return { blob, width, height, taken, metadata, original: facts, carried };
}
