// Getting a picture ready on the device (ADR 0004; spec #179 "Files"; #187; #292). The file is read once: the time
// and place it was taken, its full field list for the File row, and its metadata blocks. Then it is shrunk: a photo to
// at most 2048 px on its long side as a WebP (the app's own encoder where the browser cannot write one, as on Safari;
// a JPEG if that fails too), and a logo to at most 1024 px, kept as WebP or PNG so its clear background stays. The
// copy gets every metadata field of the original, only Orientation turned upright (`#lib/metadata`); when it cannot,
// a photo goes untouched instead. When the file says neither when nor where, the device's clock (and its place, only
// if the User already allowed it: a picture never asks) stand in, with a flag saying so.
import type { ExpandedTags } from 'exifreader';
import {
	carryMetadata,
	type MetadataType,
	readMetadata,
	toFieldList
} from '#lib/metadata/metadata.utils.js';
import {
	FILE_TYPES,
	type FieldListType,
	isFieldListKept,
	MAX_FILE_BYTES,
	type TakenType
} from './files.schema';

export type PictureKindType = 'photo' | 'logo';

export const MAX_PICTURE_SIDE: Record<PictureKindType, number> = { photo: 2048, logo: 1024 };

/** What the file's own metadata says, when it says anything. */
export type ExifTakenType = { at?: string; latitude?: number; longitude?: number };

export type PlaceType = { latitude: number; longitude: number };

/** A picture shrunk and ready to send. */
export type PreparedPictureType = {
	blob: Blob;
	width: number;
	height: number;
	taken: TakenType;
	/** The original's full field list, for the File row (#292). */
	metadata?: FieldListType;
};

/** How well each kind of picture is kept, from 0 to 1: a photo's detail, a logo's sharp edges. */
const QUALITY: Record<PictureKindType, number> = { photo: 0.82, logo: 0.9 };

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

/** When and where it was taken: the file's own word first, else the device's, else nothing. */
export function toTaken(exif: ExifTakenType, device: { now?: Date; place?: PlaceType }): TakenType {
	const hasPlace = exif.latitude !== undefined && exif.longitude !== undefined;
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

/** A photo's "2026:05:12 09:30:00" with its "+02:00", as an ISO time; without an offset it is read as this device's. */
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

/** The device's place, only when the User already allowed it; a picture never asks, and never waits long. */
export async function readDevicePlace(): Promise<PlaceType | undefined> {
	try {
		const permission = await navigator.permissions?.query({ name: 'geolocation' });
		if (permission?.state !== 'granted') return undefined;
		return await new Promise((resolve) =>
			navigator.geolocation.getCurrentPosition(
				({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
				() => resolve(undefined),
				{ timeout: 3000, maximumAge: 60_000 }
			)
		);
	} catch {
		return undefined;
	}
}

/** What goes to storage: the carried copy, the original untouched, or the copy alone with nothing carried. */
export type SentType = 'copy' | 'original' | 'plain';

/** Whether storage keeps a picture of this type and size as it is. */
export function isKeptAsItIs(file: { type: string; size: number }) {
	return (
		file.type.startsWith('image/') &&
		Object.hasOwn(FILE_TYPES, file.type) &&
		file.size <= MAX_FILE_BYTES
	);
}

/**
 * Which file goes: the copy when it carries every field and the field list fits. Otherwise a photo goes untouched,
 * when storage keeps its type, so nothing of it is lost until the server converts it (ADR 0004, #294); a logo, or a
 * photo storage cannot keep (HEIC, over 20 MB), goes as the copy, with whatever it carried.
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

// The time and place it was taken: the file's own, else (for a photo) the device's.
async function toPictureTaken(original: MetadataType, kind: PictureKindType) {
	const exif = toExifTaken(original.tags);
	if (kind === 'photo' && !exif.at && exif.latitude === undefined) {
		return toTaken(exif, { now: new Date(), place: await readDevicePlace() });
	}
	return toTaken(exif, {});
}

/**
 * A picked picture read, then shrunk and encoded on the device, ready to send: the copy with every metadata field of
 * the original carried into it, and the original's field list (#292). See `toSent` for what goes when that fails.
 */
export async function preparePicture(
	file: File,
	kind: PictureKindType
): Promise<PreparedPictureType> {
	const original = await readMetadata(new Uint8Array(await file.arrayBuffer()));
	const taken = await toPictureTaken(original, kind);
	const fields = toFieldList(original.tags);
	const isListKept = !fields || isFieldListKept(fields);
	const metadata = isListKept ? fields : undefined;
	const hasProfile = Boolean(original.blocks.icc);
	const drawn = await drawPicture(file, kind, hasProfile ? 'none' : 'default');
	const copy = await carryMetadata(original, new Uint8Array(await drawn.blob.arrayBuffer()));
	const sent = toSent({ kind, file, isCarried: Boolean(copy), isListKept });
	if (sent === 'original') return { blob: file, ...drawn.full, taken, metadata };
	if (sent === 'copy' && copy) {
		const blob = new Blob([copy], { type: drawn.blob.type });
		return { blob, width: drawn.width, height: drawn.height, taken, metadata };
	}
	// Nothing carried, so no profile goes with the colours: draw them again in sRGB if they were kept as they were.
	const plain = hasProfile ? await drawPicture(file, kind, 'default') : drawn;
	return { blob: plain.blob, width: plain.width, height: plain.height, taken, metadata };
}
