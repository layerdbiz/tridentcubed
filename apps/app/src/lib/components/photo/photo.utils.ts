// The crop's arithmetic (#312): where a photo is drawn in its box for a crop, and how a drag, a pinch, the wheel or
// a pulled-in frame changes the crop. Settled in the photo pop-up prototype (#286); photo.svelte draws it.
import { LEAST_FRAME, MOST_ZOOM, WHOLE } from './photo.constants';
import type { CropType, GripType, PointType, RectType, SizeType } from './photo.types';

const NEAR = 1e-3;

function clamp(value: number, least: number, most: number) {
	return Math.min(most, Math.max(least, value));
}

function round(value: number, places = 4) {
	return Number(value.toFixed(places));
}

/** True with no crop, or a crop that shows the whole photo as the box would anyway. */
export function isWhole(crop?: CropType | null): boolean {
	if (!crop) return true;
	return (
		Math.abs(crop.zoom - 1) < NEAR && Math.abs(crop.x - 0.5) < NEAR && Math.abs(crop.y - 0.5) < NEAR
	);
}

/** Reads a crop (stored, or about to be), kept to the allowed range and rounded to four places; nothing for a whole photo or a value that is not a crop. */
export function toCrop(value: unknown): CropType | undefined {
	if (!value || typeof value !== 'object') return undefined;
	const { zoom, x, y } = value as Record<string, unknown>;
	if (![zoom, x, y].every((part) => typeof part === 'number' && Number.isFinite(part)))
		return undefined;
	const crop = {
		zoom: round(clamp(zoom as number, 1, MOST_ZOOM)),
		x: round(clamp(x as number, 0, 1)),
		y: round(clamp(y as number, 0, 1))
	};
	return isWhole(crop) ? undefined : crop;
}

function sizeOf(photo: SizeType, box: SizeType, zoom: number): SizeType {
	const scale = zoom * Math.max(box.width / photo.width, box.height / photo.height);
	return { width: photo.width * scale, height: photo.height * scale };
}

/** The crop with its zoom kept between 1 and {@link MOST_ZOOM} and its point moved in so the photo covers the box. */
export function keptIn(photo: SizeType, box: SizeType, crop: CropType): CropType {
	const zoom = clamp(crop.zoom, 1, MOST_ZOOM);
	const size = sizeOf(photo, box, zoom);
	const halfX = box.width / 2 / size.width;
	const halfY = box.height / 2 / size.height;
	return { zoom, x: clamp(crop.x, halfX, 1 - halfX), y: clamp(crop.y, halfY, 1 - halfY) };
}

/** Where the photo is drawn in the box, in pixels from the box's top left. */
export function placeOf(photo: SizeType, box: SizeType, crop: CropType = WHOLE): RectType {
	const kept = keptIn(photo, box, crop);
	const size = sizeOf(photo, box, kept.zoom);
	return {
		width: size.width,
		height: size.height,
		left: box.width / 2 - kept.x * size.width,
		top: box.height / 2 - kept.y * size.height
	};
}

/** The place as an inline style in percentages of the box, so it holds when the box is drawn at another size (the PDF). */
export function toPlaceStyle(place: RectType, box: SizeType): string {
	const width = round((place.width / box.width) * 100);
	const height = round((place.height / box.height) * 100);
	const left = round((place.left / box.width) * 100);
	const top = round((place.top / box.height) * 100);
	return `width: ${width}%; height: ${height}%; left: ${left}%; top: ${top}%;`;
}

/** The crop after the photo is dragged by `dx`, `dy` pixels. */
export function movedBy(
	photo: SizeType,
	box: SizeType,
	crop: CropType,
	dx: number,
	dy: number
): CropType {
	const kept = keptIn(photo, box, crop);
	const size = sizeOf(photo, box, kept.zoom);
	return keptIn(photo, box, {
		zoom: kept.zoom,
		x: kept.x - dx / size.width,
		y: kept.y - dy / size.height
	});
}

/** The crop after zooming by `factor` around `at` (pixels in the box), keeping the point under it still. */
export function zoomedAt(
	photo: SizeType,
	box: SizeType,
	crop: CropType,
	factor: number,
	at: PointType
): CropType {
	const before = placeOf(photo, box, crop);
	const pointX = (at.x - before.left) / before.width;
	const pointY = (at.y - before.top) / before.height;
	const zoom = clamp(keptIn(photo, box, crop).zoom * factor, 1, MOST_ZOOM);
	const size = sizeOf(photo, box, zoom);
	const left = at.x - pointX * size.width;
	const top = at.y - pointY * size.height;
	return keptIn(photo, box, {
		zoom,
		x: (box.width / 2 - left) / size.width,
		y: (box.height / 2 - top) / size.height
	});
}

/** How far, as a share of the box, the frame may be pulled in: no further than {@link MOST_ZOOM} and {@link LEAST_FRAME} pixels. */
export function leastOf(box: SizeType, crop: CropType): number {
	return Math.min(
		1,
		Math.max(crop.zoom / MOST_ZOOM, LEAST_FRAME / Math.min(box.width, box.height))
	);
}

/**
 * The frame while a grip is pulled to `at` (pixels in the box). The frame keeps the box's shape:
 * a corner moves along the line from the opposite corner, an edge moves in from the opposite edge
 * and the frame stays centred the other way. `least` is the smallest share of the box it may reach.
 */
export function pulledIn(grip: GripType, box: SizeType, at: PointType, least: number): RectType {
	const { width, height } = box;
	const fromLeft = grip.includes('l');
	const fromTop = grip.includes('t');
	let raw: number;
	if (grip.length === 2) {
		const across = (fromLeft ? width - at.x : at.x) / width;
		const down = (fromTop ? height - at.y : at.y) / height;
		raw = (across * width * width + down * height * height) / (width * width + height * height);
	} else if (grip === 'l' || grip === 'r') {
		raw = (fromLeft ? width - at.x : at.x) / width;
	} else {
		raw = (fromTop ? height - at.y : at.y) / height;
	}
	const scale = clamp(raw, least, 1);
	const frame = { width: width * scale, height: height * scale };
	const isCorner = grip.length === 2;
	const isSide = grip === 'l' || grip === 'r';
	const left = fromLeft ? width - frame.width : isCorner || isSide ? 0 : (width - frame.width) / 2;
	const top = fromTop
		? height - frame.height
		: isCorner || !isSide
			? 0
			: (height - frame.height) / 2;
	return { left, top, ...frame };
}

/** The crop that makes what the frame (pixels in the box) shows fill the whole box. */
export function framed(photo: SizeType, box: SizeType, crop: CropType, rect: RectType): CropType {
	const place = placeOf(photo, box, crop);
	const zoom = keptIn(photo, box, crop).zoom * (box.width / rect.width);
	return keptIn(photo, box, {
		zoom,
		x: (rect.left + rect.width / 2 - place.left) / place.width,
		y: (rect.top + rect.height / 2 - place.top) / place.height
	});
}
