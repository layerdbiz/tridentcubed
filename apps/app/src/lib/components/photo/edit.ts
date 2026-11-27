// #295 (Justin, 2026-11-25 and 2026-11-27): how a picture is edited for the report, kept as numbers that never
// change its file: quarter turns, a mirror, a straighten in degrees, and the frame, the part of the picture that
// prints, in parts of the picture once it is turned. The crop frame grows and shrinks from its middle (Justin,
// 2026-11-27: "if I grab the bottom right edge, it will scale it from the middle"). How a stage lays its pictures
// out is routes/(app)/look/attachments.ts.
import type { CropRatioType, FitType } from '#lib/report/report.constants.js';

/** A part of a picture, from its top left, in parts of its width and height once it is turned. */
export type FrameType = { x: number; y: number; w: number; h: number };
export type EditType = {
	/** Quarter turns to the left, 0 to 3. */
	turns?: number;
	/** Mirrored side to side. */
	isFlipped?: boolean;
	/** Straightened, in degrees, -45 to 45. */
	tilt?: number;
	/**
	 * The frame's shape, when one was picked for this picture: it wins over any shape its stage sets (Justin,
	 * 2026-11-27: "I always need the option to edit or change"), Free included. None follows the stage's, or is Free
	 * where the stage sets none.
	 */
	ratio?: CropRatioType;
	/** What prints; none is the whole picture. */
	frame?: FrameType;
};

/** Each ratio's shape, its width over its height. */
export const RATIO_VALUES: Record<string, number> = {
	'16:9': 16 / 9,
	'9:16': 9 / 16,
	'1:1': 1,
	'4:3': 4 / 3
};

const WHOLE_FRAME: FrameType = { x: 0, y: 0, w: 1, h: 1 };
/** The smallest the crop frame gets, in parts of the picture. */
const LEAST = 0.08;

function clamp(value: number, low: number, high: number) {
	return Math.min(high, Math.max(low, value));
}

export function isWholeFrame(frame?: FrameType) {
	return !frame || (frame.w > 0.995 && frame.h > 0.995);
}

/** Whether anything about an edit changes the picture. */
export function hasEdit(edit?: EditType) {
	if (!edit) return false;
	return Boolean(
		edit.turns || edit.isFlipped || edit.tilt || edit.ratio || !isWholeFrame(edit.frame)
	);
}

/** An edit with nothing left at its starting value, rounded so it keeps small; none when nothing is changed. */
export function cleanEdit(edit: EditType): EditType | undefined {
	const kept: EditType = {};
	const turns = (((edit.turns ?? 0) % 4) + 4) % 4;
	if (turns) kept.turns = turns;
	if (edit.isFlipped) kept.isFlipped = true;
	if (edit.tilt) kept.tilt = Math.round(edit.tilt * 10) / 10;
	if (edit.ratio) kept.ratio = edit.ratio;
	if (edit.frame && !isWholeFrame(edit.frame)) {
		const round = (value: number) => Math.round(value * 10_000) / 10_000;
		const { x, y, w, h } = edit.frame;
		kept.frame = { x: round(x), y: round(y), w: round(w), h: round(h) };
	}
	return Object.keys(kept).length ? kept : undefined;
}

/** A picture's width over its height once turned. */
export function turnedAspect(aspect: number, edit: EditType) {
	return (edit.turns ?? 0) % 2 ? 1 / aspect : aspect;
}

/** The shape (width over height) a spot of a stage's grid has under Fill, in a page's room. */
export function centredFrame(k: number, around?: FrameType): FrameType {
	const w = k <= 1 ? k : 1;
	const h = k <= 1 ? 1 : 1 / k;
	const cx = around ? around.x + around.w / 2 : 0.5;
	const cy = around ? around.y + around.h / 2 : 0.5;
	return { x: clamp(cx - w / 2, 0, 1 - w), y: clamp(cy - h / 2, 0, 1 - h), w, h };
}

/**
 * The frame a spot prints: the edit's own, or, when a shape is kept (`locked`, width over height) and the edit's
 * frame is of another, one of that shape as big as the edit's around the same middle (the biggest that fits, for
 * the whole picture), so a stage's Ratio picked after the crop keeps what it zoomed in on.
 */
export function frameOf(edit: EditType, pictureAspect: number, locked?: number): FrameType {
	const turned = turnedAspect(pictureAspect, edit);
	const frame = edit.frame ?? WHOLE_FRAME;
	if (!locked) return frame;
	const k = locked / turned;
	if (Math.abs(frame.w / frame.h - k) < 0.01 * k) return frame;
	const area = frame.w * frame.h;
	let w = Math.sqrt(area * k);
	let h = Math.sqrt(area / k);
	if (w > 1) [w, h] = [1, 1 / k];
	if (h > 1) [w, h] = [k, 1];
	const cx = frame.x + frame.w / 2;
	const cy = frame.y + frame.h / 2;
	return { x: clamp(cx - w / 2, 0, 1 - w), y: clamp(cy - h / 2, 0, 1 - h), w, h };
}

/**
 * The shape an edit's frame keeps, its width over its height: the one picked for the picture (Original is its own
 * shape once turned), else `kept`, the one its place sets. None is free.
 */
export function keptAspectOf(edit: EditType, pictureAspect: number, kept?: number) {
	if (edit.ratio === 'original') return turnedAspect(pictureAspect, edit);
	if (edit.ratio) return RATIO_VALUES[edit.ratio];
	return kept;
}

/** The shape a spot's picture has once cropped, its width over its height. */
export function croppedAspect(edit: EditType, pictureAspect: number, locked?: number) {
	const frame = frameOf(edit, pictureAspect, locked);
	return (frame.w / frame.h) * turnedAspect(pictureAspect, edit);
}

/** How much a straightened picture grows so its frame stays covered. */
export function tiltCover(tilt: number, aspect: number) {
	const turn = (Math.abs(tilt) * Math.PI) / 180;
	return Math.cos(turn) + Math.sin(turn) * Math.max(aspect, 1 / aspect);
}

/** A corner (`nw` top left …) or an edge (`n` top …) of the crop frame, or the frame itself (`move`). */
export type HandleType = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

/**
 * The crop frame as a drag leaves it, `dx` and `dy` in parts of the picture. Inside it moves it; a corner or an
 * edge grows or shrinks it from its middle, both sides at once, keeping its shape when one is kept (`k`, its width
 * over its height in parts of the picture). It never leaves the picture: grown against an edge, it slides in.
 */
export function draggedFrame(
	start: FrameType,
	handle: HandleType,
	dx: number,
	dy: number,
	k?: number
): FrameType {
	const { x, y, w, h } = start;
	if (handle === 'move') return { x: clamp(x + dx, 0, 1 - w), y: clamp(y + dy, 0, 1 - h), w, h };
	const cx = x + w / 2;
	const cy = y + h / 2;
	// Pulling an edge out by d grows the frame by 2d, as the opposite edge moves out as far.
	const sx = handle.includes('e') ? 1 : handle.includes('w') ? -1 : 0;
	const sy = handle.includes('s') ? 1 : handle.includes('n') ? -1 : 0;
	let nw = w + 2 * sx * dx;
	let nh = h + 2 * sy * dy;
	if (k) {
		// A kept shape follows whichever way moved more; an edge alone sizes it by its own way.
		const byWidth = sx !== 0 && (sy === 0 || Math.abs(nw - w) >= Math.abs((nh - h) * k));
		const most = Math.min(1, k);
		nw = clamp(byWidth ? nw : nh * k, Math.max(LEAST, LEAST * k), most);
		nh = nw / k;
	} else {
		nw = clamp(nw, LEAST, 1);
		nh = clamp(nh, LEAST, 1);
	}
	return { x: clamp(cx - nw / 2, 0, 1 - nw), y: clamp(cy - nh / 2, 0, 1 - nh), w: nw, h: nh };
}

// ---- A picture drawn in its box with its edit. ----

/**
 * How a picture is drawn in a box `width` by `height`: the part that shows (`clip`, in the box), and inside it the
 * picture, turned, mirrored and straightened about the frame's middle. Fill covers the box with the frame; Fit shows
 * the frame whole in it.
 */
export function drawingOf(
	width: number,
	height: number,
	pictureAspect: number,
	edit: EditType,
	frame: FrameType,
	fit: FitType
) {
	const turned = turnedAspect(pictureAspect, edit);
	const frameWidth = frame.w * 1000;
	const frameHeight = (frame.h * 1000) / turned;
	const scale =
		fit === 'fit'
			? Math.min(width / frameWidth, height / frameHeight)
			: Math.max(width / frameWidth, height / frameHeight);
	const clipWidth = Math.min(width, frameWidth * scale);
	const clipHeight = Math.min(height, frameHeight * scale);
	const pictureWidth = 1000 * scale;
	const pictureHeight = (1000 / turned) * scale;
	const middleX = (frame.x + frame.w / 2) * pictureWidth;
	const middleY = (frame.y + frame.h / 2) * pictureHeight;
	const isSideways = (edit.turns ?? 0) % 2 !== 0;
	return {
		clip: {
			left: (width - clipWidth) / 2,
			top: (height - clipHeight) / 2,
			width: clipWidth,
			height: clipHeight
		},
		/** The turned picture's box, from the clip's top left. */
		picture: {
			left: clipWidth / 2 - middleX,
			top: clipHeight / 2 - middleY,
			width: pictureWidth,
			height: pictureHeight
		},
		/** The frame's middle, in the turned picture's box. */
		middle: { x: middleX, y: middleY },
		/** The image itself before its turn, in the turned picture's box. */
		image: {
			left: (pictureWidth - (isSideways ? pictureHeight : pictureWidth)) / 2,
			top: (pictureHeight - (isSideways ? pictureWidth : pictureHeight)) / 2,
			width: isSideways ? pictureHeight : pictureWidth,
			height: isSideways ? pictureWidth : pictureHeight
		},
		grow: tiltCover(edit.tilt ?? 0, frameWidth / frameHeight)
	};
}
