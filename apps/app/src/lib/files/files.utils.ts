// Getting a picture ready on the device (ADR 0004; spec #179 "Files"; #187). Before anything else, the time and
// place it was taken are read from the file; then it is shrunk: a photo to at most 2048 px on its long side as a WebP,
// or a JPEG where the browser cannot write WebP (Safari), and a logo to at most 1024 px, kept as WebP or PNG so its
// clear background stays. When the file says neither when nor where, the device's clock (and its place, only if the
// User already allowed it: a picture never asks) stand in, with a flag saying so.
import type { TakenType } from './files.schema';

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

/**
 * The drawn picture as a file: a WebP when the browser can write one, else a JPEG for a photo and a PNG for a logo
 * (a browser that cannot write a type hands back a PNG instead, which is how it is noticed).
 */
export async function encodePicture(canvas: BlobMakerType, kind: PictureKindType) {
	const webp = await toBlob(canvas, 'image/webp', kind === 'photo' ? 0.82 : 0.9);
	if (webp?.type === 'image/webp') return webp;
	const fallback =
		kind === 'photo' ? await toBlob(canvas, 'image/jpeg', 0.82) : await toBlob(canvas, 'image/png');
	if (!fallback) throw new Error('This browser could not shrink the picture.');
	return fallback;
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

/** What the file's own metadata says of when and where (ExifReader, loaded only when a picture is picked). */
export async function readExif(file: File): Promise<ExifTakenType> {
	try {
		const { load } = await import('exifreader');
		const tags = await load(file, { expanded: true });
		const description = (tag?: { description?: string }) => tag?.description;
		const at = toExifTime(
			description(tags.exif?.DateTimeOriginal) ?? description(tags.exif?.DateTime),
			description(tags.exif?.OffsetTimeOriginal)
		);
		const { Latitude: latitude, Longitude: longitude } = tags.gps ?? {};
		const hasPlace = Number.isFinite(latitude) && Number.isFinite(longitude);
		return { at, ...(hasPlace ? { latitude, longitude } : {}) };
	} catch {
		return {};
	}
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

/** A picked picture read, then shrunk and encoded on the device, ready to send. */
export async function preparePicture(
	file: File,
	kind: PictureKindType
): Promise<PreparedPictureType> {
	const exif = await readExif(file);
	const taken =
		kind === 'photo' && !exif.at && exif.latitude === undefined
			? toTaken(exif, { now: new Date(), place: await readDevicePlace() })
			: toTaken(exif, {});
	const bitmap = await createImageBitmap(file);
	const { width, height } = toFittedSize(bitmap.width, bitmap.height, MAX_PICTURE_SIDE[kind]);
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();
	return { blob: await encodePicture(canvas, kind), width, height, taken };
}
