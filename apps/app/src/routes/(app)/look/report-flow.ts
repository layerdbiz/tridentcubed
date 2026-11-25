// PROTOTYPE (#161) run 32: how a report section runs on over as many pages as it needs (Justin, 2026-11-12: "if
// anytime a page gets too big in height, it needs to automatically create another page and automatically add it
// to the table of contents"). A section is a list of blocks that are never cut in two: a paragraph, a card, one
// row of the time log. Each is measured as it will print (report-preview.svelte), and this fills a page with
// blocks until the next one would not fit, then starts another. A block that is glued (a heading) never ends a
// page: it moves on with the block after it.

// Which blocks go on which page, by index, given each block's height and the room a page has. A block that opens
// a page may say something again above itself (a table row its headings, #242): `leads` is the room that takes.
// A block may open a part that stays whole (`starts`; Justin, 2026-11-19: the Project Report's Cargo Description
// began at a page's foot and left only its totals on the next). A part runs from its block to the next one that
// opens a part, and one that would not fit in what is left of the page starts on a new page. A part longer than a
// page starts on a new page too, and runs on from there. A block may always open a page (`breaks`; #295): a sheet of
// an Items PDF that carries on from the one before, so no page holds more of its pages than its layout says.
export function paginate(
	heights: number[],
	room: number,
	isGlued: boolean[] = [],
	leads: number[] = [],
	starts: boolean[] = [],
	breaks: boolean[] = []
) {
	const pages: number[][] = [[]];
	let used = 0;
	for (const [index, height] of heights.entries()) {
		const page = pages.at(-1)!;
		let need = isGlued[index] ? height + (heights[index + 1] ?? 0) : height;
		if (starts[index]) {
			const next = starts.indexOf(true, index + 1);
			need = heights.slice(index, next < 0 ? undefined : next).reduce((sum, each) => sum + each, 0);
		}
		if (page.length && (breaks[index] || used + need > room)) {
			pages.push([index]);
			used = height + (leads[index] ?? 0);
		} else {
			page.push(index);
			used += height;
		}
	}
	return pages;
}

// The Disclaimer's points in two columns that end as level as they can (#275; Justin, 2026-11-23: "We need to not
// allow this white space gap here"). Any point may go to either side and each side keeps the points in their own
// order; the first point always opens the left one. What is left over is spread between the shorter side's points.
// Past 16 points the list is only cut in two where the sides come out closest, in its own order.
export function columnsOf(heights: number[]): [number[], number[]] {
	const total = heights.reduce((sum, each) => sum + each, 0);
	const indexes = heights.map((_, index) => index);
	let left: number[] = [];
	if (heights.length > 16) {
		let best = Infinity;
		let sum = 0;
		for (const [cut, height] of heights.entries()) {
			sum += height;
			if (Math.abs(total - 2 * sum) < best) {
				best = Math.abs(total - 2 * sum);
				left = indexes.slice(0, cut + 1);
			}
		}
	} else {
		let best = { off: Infinity, mask: 1 };
		for (let mask = 1; mask < 1 << heights.length; mask += 2) {
			let sum = 0;
			for (const index of indexes) if (mask & (1 << index)) sum += heights[index];
			const off = Math.abs(total - 2 * sum);
			// Less than half a pixel better is no better: the first such split stays.
			if (off < best.off - 0.5) best = { off, mask };
		}
		left = indexes.filter((index) => best.mask & (1 << index));
	}
	return [left, indexes.filter((index) => !left.includes(index))];
}

// How much smaller the Disclaimer's points are drawn so their two columns fit the room left for them (#275; Justin,
// 2026-11-19: the Disclaimer never runs to a second page, "by any means"; 2026-11-22: only the bullets shrink, the
// opening, the note, the thank-you and the signature keep their size). Drawn smaller, the points rewrap at a wider
// measure and come out shorter than their size alone says, so the points are measured again at each size tried
// (`heightsAt`, their heights at that size before it is applied), and the largest size that fits is kept. 1 when they
// fit as they are.
export function columnsFitOf(heightsAt: (fit: number) => number[], room: number) {
	function tallestAt(fit: number) {
		const heights = heightsAt(fit);
		return fit * Math.max(...columnsOf(heights).map((side) => heightOf(heights, side)));
	}
	if (tallestAt(1) <= room) return 1;
	let low = 0.1;
	let high = 1;
	for (let step = 0; step < 14; step += 1) {
		const middle = (low + high) / 2;
		if (tallestAt(middle) <= room) low = middle;
		else high = middle;
	}
	return low;
}

// The font size that sets one line across the room it has (#275; Justin, 2026-11-22: the thank-you on one line, its
// font grown so the text fills its box), given the line's width at 100 px. None when that would be too small to read,
// and the line wraps at its own size instead; never above `most`.
export function lineSizeOf(widthAt100: number, room: number, least = 8, most = 14) {
	if (widthAt100 <= 0) return undefined;
	// Just under the full width, so a rounding in the browser or the printer never pushes the last letter over.
	const size = ((room * 100) / widthAt100) * 0.992;
	return size < least ? undefined : Math.min(size, most);
}

// The height a page's blocks take up together.
export function heightOf(heights: number[], page: number[]) {
	return page.reduce((sum, index) => sum + (heights[index] ?? 0), 0);
}

// A photo panel as pages (#215; Justin, 2026-11-18): each group that is switched on starts a page and runs on over
// as many as its photos need at its photos-per-page (a PDF's pages each count as a photo, #327), and a group switched off prints nothing. Only the panel's very
// first page stands under its title alone; every page after it is a continued one, whichever group it belongs to.
// Each page knows which of its group's pages it is (`part`, from 0) and how many the group has (`parts`, #259).
export type PhotoPageType = { group: number; part: number; parts: number; isContinued: boolean };

// How many spots an attachment of a photo group takes (#327): a PDF one for each of its pages, a photo or a video one.
function spotsIn(photo: unknown) {
	const { kind, pageCount } = (photo ?? {}) as { kind?: unknown; pageCount?: unknown };
	return kind === 'pdf' && typeof pageCount === 'number' && pageCount > 1
		? Math.floor(pageCount)
		: 1;
}

/** One spot on a photo group's pages (#327): a photo, a video, or one page of a PDF (`page`, from 1). */
export type SpotType<T> = { key: string; photo: T; page: number };

/**
 * A photo group's attachments as the spots its pages are laid out in, in order (#327; Justin, 2026-11-24: "PDFs lay
 * out exactly like photos per page"): each page of a PDF is a spot of its own, so its pages fill the group's layout
 * as photos do and run on over pages.
 */
export function spotsOf<T extends { id: string }>(photos: readonly T[]): SpotType<T>[] {
	const spots: SpotType<T>[] = [];
	for (const photo of photos) {
		for (let page = 1; page <= spotsIn(photo); page += 1)
			spots.push({ key: `${photo.id}:${page}`, photo, page });
	}
	return spots;
}

export function photoPagesOf(
	groups: { isEnabled: boolean; layout: number; photos: readonly unknown[] }[]
): PhotoPageType[] {
	const pages: PhotoPageType[] = [];
	for (const [group, { isEnabled, layout, photos }] of groups.entries()) {
		if (!isEnabled) continue;
		const spots = photos.reduce<number>((sum, photo) => sum + spotsIn(photo), 0);
		const parts = Math.max(1, Math.ceil(spots / layout));
		for (let part = 0; part < parts; part += 1)
			pages.push({ group, part, parts, isContinued: pages.length > 0 });
	}
	return pages;
}

/**
 * A PDF attached in the Items panel as report pages (#295; glossary "Item List": "a PDF prints its pages, laid out
 * like a photo group's photos, 1, 2, 4, 6 or 8 to a page"): its pages, from 1, dealt into sheets of `layout`, one
 * sheet to a report page.
 */
export function sheetsOf(pageCount: number, layout: number) {
	const pages = Array.from({ length: pageCount }, (_, at) => at + 1);
	const sheets: number[][] = [];
	for (let from = 0; from < pages.length; from += layout)
		sheets.push(pages.slice(from, from + layout));
	return sheets;
}

// What a photo group says after its title when its photos run over pages (#259; Justin, 2026-11-21: two pages
// both headed "Loading Operations" read the same): which of its own pages this is, "(1 of 2)". Nothing for a
// group on one page. It leaves out the word "page", which the footer already uses for the whole report.
export function markOf(part: number, parts: number) {
	return parts > 1 ? `(${part + 1} of ${parts})` : '';
}

// The pages something covers in the report, counted from 1 (#259; Justin, 2026-11-21: "project report starts on
// page 3, but it extends all the way to page 4 ... it probably should say 3-4").
export type SpanType = { first: number; last: number };

/** The first and the last page `has` picks; none when it picks no page. */
export function spanOf<PageType>(
	pages: PageType[],
	has: (page: PageType) => boolean
): SpanType | undefined {
	const first = pages.findIndex(has);
	return first < 0 ? undefined : { first: first + 1, last: pages.findLastIndex(has) + 1 };
}

/** A span as the Table of Contents prints it: one number on one page, where it starts and ends on more. */
export function rangeOf(span: SpanType) {
	return span.last > span.first ? `${span.first}-${span.last}` : `${span.first}`;
}

/**
 * The pages each headed part of a flowing section covers, by its heading. `pages` is the section's pages in order,
 * each as its blocks: a heading by its words, any other block as nothing. `first` is the page the section starts
 * on. A part runs from its heading's page to the last page it has a block on, so one whose next part opens a page
 * ends on the page before.
 */
export function partSpansOf(pages: (string | undefined)[][], first: number) {
	const spans: Record<string, SpanType> = {};
	let part: SpanType | undefined;
	for (const [at, blocks] of pages.entries())
		for (const heading of blocks) {
			if (heading) part = spans[heading] = { first: first + at, last: first + at };
			else if (part) part.last = first + at;
		}
	return spans;
}

// The Table of Contents as lines, one to a section and one to each of its parts, numbered like an ordered list (1.
// 2. 3. 3.1). Its pages are these lines dealt out like any flowing section's blocks (#277; Justin, 2026-11-24: "I
// never want to leave a section cut off"): a section opens a part that stays whole, so one that would not fit with
// all of its parts moves on to the continued page.
// Each line is a link to the page it names (#301), in the downloaded PDF and in the Preview: `to` is that page, the
// first of a span (7-12 opens 7), counted from 1 as printed; 0 when the line names none.
export type ContentLineType = {
	number: string;
	title: string;
	page: string;
	to: number;
	isSub: boolean;
};

export function contentLinesOf(
	entries: { title: string; page: string; subs: { title: string; page: string }[] }[]
) {
	const lines: ContentLineType[] = [];
	for (const [at, entry] of entries.entries()) {
		lines.push({
			number: `${at + 1}.`,
			title: entry.title,
			page: entry.page,
			to: firstPageOf(entry.page),
			isSub: false
		});
		for (const [subAt, sub] of entry.subs.entries())
			lines.push({
				number: `${at + 1}.${subAt + 1}`,
				title: sub.title,
				page: sub.page,
				to: firstPageOf(sub.page),
				isSub: true
			});
	}
	return lines;
}

/** The page a span as the contents print it starts on (`rangeOf`'s 7-12 is 7); 0 for none. */
function firstPageOf(range: string) {
	return Number.parseInt(range, 10) || 0;
}

// The number each stage of the Operations panel wears, in the panel and before its title in the Preview (Justin,
// 2026-11-19): the first is 1, the second 2, by the order they are in, so moving one renumbers them. A stage left
// out of the report has none and is not counted, so the report's numbers never skip one.
export function stageNumbersOf(groups: { isEnabled: boolean }[]) {
	let count = 0;
	return groups.map((group) => (group.isEnabled ? (count += 1) : undefined));
}

// The flowing section a panel prints as: the Time Log's (#223) and Transport Mode's (#225), each keyed by its
// panel's kind; none for a panel that prints pages of its own (a photo panel). It is found by what the panel is: a
// panel's id is the database's (#196), and looking the section up by that id left the Time Log out of every report
// and put Transport Mode back on its plain one page, without the transport's photo.
const FLOWING = ['transport', 'timelog'];

export function flowOf<FlowType extends { key: string }>(
	panel: { kind: string },
	flows: FlowType[]
) {
	return FLOWING.includes(panel.kind) ? flows.find((flow) => flow.key === panel.kind) : undefined;
}

// The page the preview opens at, by index: the open panel's page (`found`, -1 with none open); else the page a
// report link asked for (`asked`, from 1; 0 for none), held to the pages there are (#216); else the first.
export function targetOf(found: number, asked: number, count: number) {
	if (found >= 0) return found;
	return Math.max(0, Math.min(asked, count) - 1);
}

// What the preview does each time its target is worked out again (#234; Justin, 2026-11-19: "it keeps on resetting
// ... making me lose my spot"). The target is worked out whenever the page list is rebuilt, which fresh rows from
// the server do once a minute, and a rebuilt list with the same target used to glide back to it. The canvas is
// placed (`place`) the first time, again when the header over it changes height, and again once the project's own
// pages have arrived (`isWhole`: a project opens with the pages its row gives and loads the rest). After that it
// glides only when the target is another page or sits somewhere else on the canvas (`glide`), and is otherwise
// left where the User put it (`stay`).
export type FollowType = 'place' | 'glide' | 'stay';

export function createFollower() {
	let followed = '';
	let placed = '';
	return function follow(
		index: number,
		rect: { x: number; y: number },
		top: number,
		isWhole = true
	): FollowType {
		const target = `${index}:${rect.x}:${rect.y}`;
		const isSame = target === followed;
		followed = target;
		const placing = `${top}:${isWhole}`;
		if (placing !== placed) {
			placed = placing;
			return 'place';
		}
		return isSame ? 'stay' : 'glide';
	};
}
