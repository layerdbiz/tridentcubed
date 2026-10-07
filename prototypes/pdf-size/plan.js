// PROTOTYPE (#146). The pure part worth lifting into V1: where each photo sits on the page, how
// many pixels its print JPEG gets, and the quality ladder that keeps a report under the cap.
// No I/O here; export.js is the throwaway shell around it.

/** The cap Justin set on #125: a report PDF is 10 MB at most. */
export const MAX_PDF_BYTES = 10_000_000;

/** US Letter, 0.5 in margins, a 0.4 in header, so 7.5 × 9.1 in for photos. Inches throughout. */
export const PAGE = { width: 8.5, height: 11, margin: 0.5, header: 0.4, gap: 0.15, caption: 0.25 };

/** Photos per page and the grid they sit in, as in the photo repeater prototype. */
export const LAYOUTS = {
	'1-up': { cols: 1, rows: 1 },
	'2-up': { cols: 1, rows: 2 },
	'4-up': { cols: 2, rows: 2 },
	'8-up': { cols: 2, rows: 4 }
};

/**
 * Print settings, best first. The export starts at the top and steps down only while the
 * photos' JPEG bytes plus the page overhead would go over the cap. ppi is pixels per printed
 * inch; quality is the JPEG quality (1 to 100).
 */
export const LADDER = [
	{ ppi: 200, quality: 80 },
	{ ppi: 200, quality: 70 },
	{ ppi: 175, quality: 70 },
	{ ppi: 150, quality: 70 },
	{ ppi: 150, quality: 60 },
	{ ppi: 125, quality: 60 },
	{ ppi: 100, quality: 55 }
];

/** Bytes a PDF spends beyond its photos: fonts, page objects, text. Measured at about 95 KB plus
 * 1.3 KB a page (README), rounded up. */
export function overheadBytes(pages) {
	return 100_000 + pages * 1_500;
}

/** The box (inches) one photo of a layout may fill, caption line excluded. */
export function cellOf(layout) {
	const { cols, rows } = LAYOUTS[layout];
	const areaW = PAGE.width - 2 * PAGE.margin;
	const areaH = PAGE.height - 2 * PAGE.margin - PAGE.header;
	return {
		width: (areaW - (cols - 1) * PAGE.gap) / cols,
		height: (areaH - (rows - 1) * PAGE.gap) / rows - PAGE.caption
	};
}

/** The photo's printed size (inches): the cell, shrunk to the photo's shape. */
export function printedSize(layout, photo) {
	const cell = cellOf(layout);
	const scale = Math.min(cell.width / photo.width, cell.height / photo.height);
	return { width: photo.width * scale, height: photo.height * scale };
}

/** Pixels for the photo's print JPEG at a ppi, never more than the stored photo has. */
export function printPixels(layout, photo, ppi) {
	const size = printedSize(layout, photo);
	const scale = Math.min(1, (size.width * ppi) / photo.width, (size.height * ppi) / photo.height);
	return {
		width: Math.max(1, Math.round(photo.width * scale)),
		height: Math.max(1, Math.round(photo.height * scale))
	};
}

/** Split a report's photo groups into pages: each group starts a new page. */
export function paginate(groups) {
	const pages = [];
	for (const group of groups) {
		const perPage = LAYOUTS[group.layout].cols * LAYOUTS[group.layout].rows;
		for (let i = 0; i < group.photos.length; i += perPage) {
			pages.push({ layout: group.layout, photos: group.photos.slice(i, i + perPage) });
		}
	}
	return pages;
}

/** Every nth photo, in report order, so the sample keeps the report's mix of layouts. */
export function sampleOf(items, every = SAMPLE_EVERY) {
	return items.filter((_, i) => i % every === 0);
}
export const SAMPLE_EVERY = 5;

/**
 * Walk the ladder until the photos fit under the cap with the page overhead. `photoBytes(step)`
 * returns what the photos weigh at a step: the export passes a sample estimate first (cheap), then
 * the real total, and starts again from the step the sample picked. Returns the first step that
 * fits, or the last step with `fits: false` so the caller can still export and warn.
 */
export async function chooseStep(pageCount, photoBytes, { from = 0, max = MAX_PDF_BYTES } = {}) {
	const tried = [];
	for (let i = from; i < LADDER.length; i++) {
		const step = LADDER[i];
		const estimate = (await photoBytes(step)) + overheadBytes(pageCount);
		tried.push({ ...step, estimate });
		if (estimate <= max) return { index: i, step, estimate, fits: true, tried };
	}
	return { index: LADDER.length - 1, step: LADDER.at(-1), estimate: tried.at(-1).estimate, fits: false, tried };
}
