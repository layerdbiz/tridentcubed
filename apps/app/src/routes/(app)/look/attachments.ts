// #295 (Justin, 2026-11-25 and 2026-11-27, signed off in the attachments prototype): how a stage lays its
// attachments out on report pages, and how each one is edited.
//
// A stage (or a photo group) holds photos, PDFs and videos. Its pages take a set number of them (Per page: 1, 2, 4,
// 6 or 8, a grid of columns by rows picked on its own, or Auto, every one on one page, up to 100). Fill makes the
// spots fill the page from margin to margin and down to the footer, each picture covering its spot; Fit keeps every
// spot in the stage's Ratio (Free: each attachment's own shape), as big as the page allows, the picture whole in it.
// A PDF's pages always print whole. An attachment popped out leaves the stage's pages for pages of its own, with its
// own per page (1: alone on its page).
//
// An edit is kept as numbers and never changes the file: quarter turns, a mirror, a straighten in degrees, and the
// frame, the part of the picture that prints, in parts of the picture once it is turned. The crop frame grows and
// shrinks from its middle (Justin, 2026-11-27: "if I grab the bottom right edge, it will scale it from the middle").
import {
	DEFAULT_FIT,
	DEFAULT_RATIO,
	LAYOUTS,
	type CropRatioType,
	type FitType,
	type PageLayoutType,
	type RatioType
} from '#lib/report/report.constants.js';

import { turnedAspect, type EditType, type FrameType } from '#lib/components/photo/edit.js';

export type { CropRatioType, FitType, RatioType };
export * from '#lib/components/photo/edit.js';
export type PageGridType = { columns: number; rows: number };
/** A photo's crop from before #295 (#312): how far in, and the point of the photo at the middle of its spot. */
export type OldCropType = { zoom: number; x: number; y: number };

/** What a stage's layout reads. */
export type StageLayoutType = {
	layout: number;
	grid?: PageGridType;
	isAuto?: boolean;
	ratio?: RatioType;
	fit?: FitType;
};
/** What an attachment's place and edit read. */
export type EditedType = {
	id: string;
	kind?: 'pdf' | 'video';
	pageCount?: number;
	crop?: OldCropType;
	edit?: EditType;
	/** A PDF whose pages were edited one by one: each page's own edit, by its number from 1. */
	pageEdits?: Record<string, EditType>;
	/** Popped out, on pages of its own with this many to a page; none (or 0) keeps it in the stage's pages. */
	ownLayout?: number;
};

export const RATIOS: { id: RatioType; label: string }[] = [
	{ id: 'free', label: 'Free' },
	{ id: '16:9', label: '16:9' },
	{ id: '9:16', label: '9:16' },
	{ id: '1:1', label: '1:1' },
	{ id: '4:3', label: '4:3' }
];
export const CROP_RATIOS: { id: CropRatioType; label: string }[] = [
	{ id: 'free', label: 'Free' },
	{ id: 'original', label: 'Original' },
	...RATIOS.slice(1)
];
/** Each ratio's shape, its width over its height. */
export const RATIO_VALUES: Record<string, number> = {
	'16:9': 16 / 9,
	'9:16': 9 / 16,
	'1:1': 1,
	'4:3': 4 / 3
};
/** The most Auto puts on one page. */
export const AUTO_MOST = 100;
/** The most columns or rows the grid picker offers. */
export const GRID_MOST = 4;
/** The per-page buttons as grids: one or two fill the width, four up sit in two columns. */
export const PRESETS: Record<PageLayoutType, PageGridType> = {
	1: { columns: 1, rows: 1 },
	2: { columns: 1, rows: 2 },
	4: { columns: 2, rows: 2 },
	6: { columns: 2, rows: 3 },
	8: { columns: 2, rows: 4 }
};
/**
 * The room a page leaves for its spots, in the page's own pixels (595 by 842): between the margins, under the
 * stage's title and down to the footer. The report measures each page's own; the crop frame under Fill takes the
 * shape of a spot in this one.
 */
export const ROOM = { width: 515, height: 573 };

function clamp(value: number, low: number, high: number) {
	return Math.min(high, Math.max(low, value));
}

// ---- A stage's spots and pages. ----

/** One spot on a stage's pages (#327): a photo, a video, or one page of a PDF (`page`, from 1). */
export type SpotType<T> = { key: string; photo: T; page: number };

// How many spots an attachment takes (#327): a PDF one for each of its pages, a photo or a video one.
function spotsIn(photo: unknown) {
	const { kind, pageCount } = (photo ?? {}) as { kind?: unknown; pageCount?: unknown };
	return kind === 'pdf' && typeof pageCount === 'number' && pageCount > 1
		? Math.floor(pageCount)
		: 1;
}

/**
 * A stage's attachments as the spots its pages are laid out in, in order (#327; Justin, 2026-11-24: "PDFs lay out
 * exactly like photos per page"): each page of a PDF is a spot of its own.
 */
export function spotsOf<T>(photos: readonly T[]): SpotType<T>[] {
	const spots: SpotType<T>[] = [];
	for (const [index, photo] of photos.entries()) {
		const id = (photo as { id?: unknown } | undefined)?.id ?? index;
		for (let page = 1; page <= spotsIn(photo); page += 1)
			spots.push({ key: `${id}:${page}`, photo, page });
	}
	return spots;
}

/** The stage's grid: the one picked, else its per-page button's. */
export function gridOf(stage: StageLayoutType): PageGridType {
	return stage.grid ?? PRESETS[stage.layout as PageLayoutType] ?? PRESETS[4];
}

export function ratioOf(stage: StageLayoutType): RatioType {
	return stage.ratio ?? DEFAULT_RATIO;
}

export function fitOf(stage: StageLayoutType): FitType {
	return stage.fit ?? DEFAULT_FIT;
}

/** Whether a grid is one of the per-page buttons' own, which the buttons show picked. */
export function isPresetGrid(grid: PageGridType) {
	return LAYOUTS.some(
		(layout) => PRESETS[layout].columns === grid.columns && PRESETS[layout].rows === grid.rows
	);
}

/** A grid picked on the picker as the stage keeps it: a button's own goes back to the button. */
export function toStageGrid(grid: PageGridType): Pick<StageLayoutType, 'layout' | 'grid'> {
	const preset = LAYOUTS.find(
		(layout) => PRESETS[layout].columns === grid.columns && PRESETS[layout].rows === grid.rows
	);
	return preset ? { layout: preset, grid: undefined } : { layout: nearestLayout(grid), grid };
}

// The per-page button nearest a picked grid, which the database's `layout` keeps for anything that reads only it.
function nearestLayout(grid: PageGridType): PageLayoutType {
	const count = grid.columns * grid.rows;
	return [...LAYOUTS].reverse().find((layout) => layout <= count) ?? 1;
}

/** A grid kept as text, "3x2" (columns by rows); nothing for none. */
export function toPageGridText(grid?: PageGridType) {
	return grid ? `${grid.columns}x${grid.rows}` : '';
}

export function toPageGrid(text: unknown): PageGridType | undefined {
	const found = typeof text === 'string' ? /^(\d{1,2})x(\d{1,2})$/.exec(text) : null;
	if (!found) return undefined;
	const columns = Number(found[1]);
	const rows = Number(found[2]);
	return columns >= 1 && rows >= 1 ? { columns, rows } : undefined;
}

/** How a stage's per page reads: "4", "3 × 2" for a picked grid, or "Auto". */
export function perPageLabelOf(stage: StageLayoutType) {
	if (stage.isAuto) return 'Auto';
	if (stage.grid) return `${stage.grid.columns} × ${stage.grid.rows}`;
	return String(stage.layout);
}

/** One report page of a stage: its spots, and how they are laid out. */
export type AttachmentPageType<T> = {
	spots: SpotType<T>[];
	mode: 'grid' | 'auto' | 'alone';
	grid: PageGridType;
};

/**
 * A stage's spots dealt into report pages: a grid's worth to each (Auto up to 100), and an attachment popped out on
 * pages of its own between them, with its own per page. A stage with nothing yet still has its one page.
 */
export function stagePagesOf<T>(
	stage: StageLayoutType & { photos: readonly T[] }
): AttachmentPageType<T>[] {
	const pages: AttachmentPageType<T>[] = [];
	const grid = gridOf(stage);
	const mode = stage.isAuto ? 'auto' : 'grid';
	const size = stage.isAuto ? AUTO_MOST : grid.columns * grid.rows;
	let run: SpotType<T>[] = [];
	function flush() {
		for (let at = 0; at < run.length; at += size)
			pages.push({ spots: run.slice(at, at + size), mode, grid });
		run = [];
	}
	const spots = spotsOf(stage.photos);
	for (const spot of spots) {
		const own = (spot.photo as EditedType | undefined)?.ownLayout;
		if (!own) {
			run.push(spot);
			continue;
		}
		// Popped out: its spots start their own pages, its per page's worth to each.
		if (spot.page === 1) flush();
		const ownGrid = PRESETS[own as PageLayoutType] ?? PRESETS[1];
		const last = pages.at(-1);
		const isSameRun =
			spot.page > 1 &&
			last?.mode === 'alone' &&
			last.spots.at(-1)?.photo === spot.photo &&
			last.spots.length < ownGrid.columns * ownGrid.rows;
		if (isSameRun) last.spots.push(spot);
		else pages.push({ spots: [spot], mode: 'alone', grid: ownGrid });
	}
	flush();
	if (!pages.length) pages.push({ spots: [], mode, grid });
	return pages;
}

// ---- An attachment's edit. ----

/** A crop from before #295, in the photo's own shape around its middle, as a frame. */
export function fromOldCrop(crop: OldCropType): FrameType {
	const zoom = clamp(crop.zoom, 1, 5);
	const size = 1 / zoom;
	return {
		x: clamp(crop.x - size / 2, 0, 1 - size),
		y: clamp(crop.y - size / 2, 0, 1 - size),
		w: size,
		h: size
	};
}

/** The edit one spot is drawn with: a PDF page's own, else its attachment's, else its crop from before #295. */
export function editOf(photo: EditedType, page = 1): EditType {
	const own = photo.pageEdits?.[page] ?? photo.edit;
	if (own) return own;
	return photo.crop ? { frame: fromOldCrop(photo.crop) } : {};
}

export function cellAspectOf(grid: PageGridType, room = ROOM) {
	const gap = gapOf(grid.columns, grid.rows);
	const width = (room.width - gap * (grid.columns - 1)) / grid.columns;
	const height = (room.height - gap * (grid.rows - 1)) / grid.rows;
	return width / height;
}

/**
 * The shape the crop frame keeps (width over height), or none when it takes any shape: what the stage gives it
 * (its Ratio under Fit, the shape of its spots under Fill), else the ratio picked for it. A PDF's pages print whole
 * and an attachment popped out keeps its own shape, so neither takes the stage's.
 */
export function lockedAspectOf(
	stage: StageLayoutType,
	photo: Pick<EditedType, 'kind' | 'ownLayout'>,
	edit: EditType,
	pictureAspect: number
): number | undefined {
	const isOwn = photo.kind === 'pdf' || Boolean(photo.ownLayout);
	if (!isOwn) {
		if (fitOf(stage) === 'fit' && ratioOf(stage) !== 'free') return RATIO_VALUES[ratioOf(stage)];
		if (fitOf(stage) === 'fill' && !stage.isAuto) return cellAspectOf(gridOf(stage));
	}
	if (edit.ratio === 'original') return turnedAspect(pictureAspect, edit);
	return edit.ratio ? RATIO_VALUES[edit.ratio] : undefined;
}

/** The stage's own frame shape, when it sets one: the editor names it in place of the ratio buttons. */
export function stageAspectOf(
	stage: StageLayoutType,
	photo: Pick<EditedType, 'kind' | 'ownLayout'>
) {
	return lockedAspectOf(stage, photo, {}, 1);
}

// ---- A stage's report page: its spots placed in the room it leaves for them. ----

/** A spot placed in its page's room, in the page's own pixels from the room's top left. */
export type PlacedType<T> = { spot: SpotType<T>; x: number; y: number; w: number; h: number };

/** The room between spots: less the more there are in a row or a column. */
export function gapOf(columns: number, rows: number) {
	const most = Math.max(columns, rows);
	return most <= 4 ? 12 : Math.max(3, 12 - (most - 4) * 2);
}

/**
 * One report page's spots placed in a room `width` by `height`. `aspectOf` gives a spot's own shape once cropped
 * (width over height): Free and Fit use it, Fill fills each spot whatever it is. Under Fill the spots fill the room:
 * the page's rows share its height, and a row short of spots shares its width among the ones it has.
 */
export function placeOf<T>(
	page: AttachmentPageType<T>,
	stage: StageLayoutType,
	aspectOf: (spot: SpotType<T>) => number,
	width: number,
	height: number
): PlacedType<T>[] {
	const { spots } = page;
	if (!spots.length || width <= 0 || height <= 0) return [];
	if (page.mode === 'alone')
		return fitGrid(
			spots,
			spots.map((spot) => aspectOf(spot)),
			page.grid,
			true,
			width,
			height
		);
	const ratio = ratioOf(stage);
	const isFree = ratio === 'free';
	// Under Fit a set Ratio is every spot's shape, but a PDF's page keeps its own: it prints whole.
	const aspects = spots.map((spot) =>
		isFree || (spot.photo as EditedType | undefined)?.kind === 'pdf'
			? aspectOf(spot)
			: RATIO_VALUES[ratio]
	);
	if (fitOf(stage) === 'fill') {
		if (page.mode === 'auto') {
			const target = Math.exp(
				spots.reduce((sum, spot) => sum + Math.log(aspectOf(spot)), 0) / spots.length
			);
			return fillGrid(spots, bestGrid(spots.length, target, width, height), width, height);
		}
		return fillGrid(spots, page.grid, width, height);
	}
	if (page.mode === 'auto') {
		if (isFree) return justified(spots, aspects, width, height);
		const grid = bestGrid(spots.length, RATIO_VALUES[ratio], width, height);
		return fitGrid(spots, aspects, grid, false, width, height);
	}
	return fitGrid(spots, aspects, page.grid, isFree, width, height);
}

// Fill: the rows the spots need share the room's height, and each row's spots its width.
function fillGrid<T>(spots: SpotType<T>[], grid: PageGridType, width: number, height: number) {
	const rows = Math.max(1, Math.ceil(spots.length / grid.columns));
	const gap = gapOf(grid.columns, rows);
	const rowHeight = (height - gap * (rows - 1)) / rows;
	const placed: PlacedType<T>[] = [];
	for (let row = 0; row < rows; row += 1) {
		const inRow = spots.slice(row * grid.columns, (row + 1) * grid.columns);
		const w = (width - gap * (inRow.length - 1)) / inRow.length;
		for (const [index, spot] of inRow.entries())
			placed.push({ spot, x: index * (w + gap), y: row * (rowHeight + gap), w, h: rowHeight });
	}
	return placed;
}

// Fit: rows from the top, each spot the biggest of its shape its cell holds. Free sets each row's spots side by side
// in their own shapes across the width, no taller than a cell. Each row sits in the middle.
function fitGrid<T>(
	spots: SpotType<T>[],
	aspects: number[],
	grid: PageGridType,
	isFree: boolean,
	width: number,
	height: number
) {
	const { columns, rows } = grid;
	const gap = gapOf(columns, rows);
	const cellWidth = (width - gap * (columns - 1)) / columns;
	const cellHeight = (height - gap * (rows - 1)) / rows;
	const placed: PlacedType<T>[] = [];
	let y = 0;
	for (let at = 0; at < spots.length; at += columns) {
		const inRow = spots.slice(at, at + columns);
		const shapes = aspects.slice(at, at + columns);
		let rowHeight = Math.min(cellHeight, ...shapes.map((shape) => cellWidth / shape));
		if (isFree) {
			const across =
				(width - gap * (inRow.length - 1)) / shapes.reduce((sum, shape) => sum + shape, 0);
			rowHeight = Math.min(across, cellHeight);
		}
		const widths = shapes.map((shape) =>
			isFree ? rowHeight * shape : Math.min(cellWidth, rowHeight * shape)
		);
		const heights = shapes.map((shape, index) => (isFree ? rowHeight : widths[index] / shape));
		const rowWidth = widths.reduce((sum, each) => sum + each, 0) + gap * (inRow.length - 1);
		let x = (width - rowWidth) / 2;
		for (const [index, spot] of inRow.entries()) {
			placed.push({
				spot,
				x,
				y: y + (rowHeight - heights[index]) / 2,
				w: widths[index],
				h: heights[index]
			});
			x += widths[index] + gap;
		}
		y += rowHeight + gap;
	}
	return placed;
}

// Auto's columns and rows for `count` spots: the cells nearest `target`'s shape, with few left empty.
function bestGrid(count: number, target: number, width: number, height: number): PageGridType {
	let best = { columns: 1, rows: count, score: Infinity };
	for (let columns = 1; columns <= Math.min(count, 10); columns += 1) {
		const rows = Math.ceil(count / columns);
		if (rows > 10) continue;
		const gap = gapOf(columns, rows);
		const cell = (width - gap * (columns - 1)) / columns / ((height - gap * (rows - 1)) / rows);
		const score = Math.abs(Math.log(cell / target)) + (columns * rows - count) * 0.35;
		if (score < best.score) best = { columns, rows, score };
	}
	return { columns: best.columns, rows: best.rows };
}

// Auto, Free and Fit: rows of spots in their own shapes, each row the room's width, the rows as few as keep the page
// nearest full; drawn smaller as a whole when they would run past the footer.
function justified<T>(spots: SpotType<T>[], aspects: number[], width: number, height: number) {
	let best: { rows: number[][]; score: number } | undefined;
	for (let count = 1; count <= Math.min(spots.length, 12); count += 1) {
		const rows = splitRows(aspects, count);
		const total = rowsHeight(rows, aspects, width);
		const score = Math.abs(Math.log(total / height));
		if (!best || score < best.score) best = { rows, score };
	}
	const rows = best?.rows ?? [];
	const gap = gapOf(Math.max(...rows.map((row) => row.length)), rows.length);
	const scale = Math.min(1, height / rowsHeight(rows, aspects, width));
	const placed: PlacedType<T>[] = [];
	let y = 0;
	for (const row of rows) {
		const h =
			((width - gap * (row.length - 1)) / row.reduce((sum, at) => sum + aspects[at], 0)) * scale;
		const rowWidth = row.reduce((sum, at) => sum + aspects[at] * h, 0) + gap * (row.length - 1);
		let x = (width - rowWidth) / 2;
		for (const at of row) {
			placed.push({ spot: spots[at], x, y, w: aspects[at] * h, h });
			x += aspects[at] * h + gap;
		}
		y += h + gap;
	}
	return placed;
}

function rowsHeight(rows: number[][], aspects: number[], width: number) {
	const gap = gapOf(Math.max(...rows.map((row) => row.length)), rows.length);
	const heights = rows.map(
		(row) => (width - gap * (row.length - 1)) / row.reduce((sum, at) => sum + aspects[at], 0)
	);
	return heights.reduce((sum, each) => sum + each, 0) + gap * (rows.length - 1);
}

// Shapes into `count` rows in order, each row's shapes adding up to about the same.
function splitRows(aspects: number[], count: number) {
	const total = aspects.reduce((sum, each) => sum + each, 0);
	const rows: number[][] = [];
	let row: number[] = [];
	let sum = 0;
	for (const [at, each] of aspects.entries()) {
		const left = aspects.length - at;
		const rowsLeft = count - rows.length;
		if (
			row.length &&
			(sum + each / 2 > (total / count) * 1.02 || left < rowsLeft) &&
			rows.length < count - 1
		) {
			rows.push(row);
			row = [];
			sum = 0;
		}
		row.push(at);
		sum += each;
	}
	if (row.length) rows.push(row);
	return rows;
}
