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
// page starts on a new page too, and runs on from there.
export function paginate(
	heights: number[],
	room: number,
	isGlued: boolean[] = [],
	leads: number[] = [],
	starts: boolean[] = []
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
		if (page.length && used + need > room) {
			pages.push([index]);
			used = height + (leads[index] ?? 0);
		} else {
			page.push(index);
			used += height;
		}
	}
	return pages;
}

// How much smaller a section that must stay on one page is drawn (Justin, 2026-11-19: the Disclaimer never runs to
// a second page, "by any means"): its blocks and what stands under them (`extra`: the signature and the clear
// space over it) together, against the room a page has. 1 when it fits as it is.
export function fitOf(heights: number[], extra: number, room: number) {
	const need = heights.reduce((sum, each) => sum + each, 0) + extra;
	return need > room ? room / need : 1;
}

// The height a page's blocks take up together.
export function heightOf(heights: number[], page: number[]) {
	return page.reduce((sum, index) => sum + (heights[index] ?? 0), 0);
}

// A photo panel as pages (#215; Justin, 2026-11-18): each group that is switched on starts a page and runs on over
// as many as its photos need at its photos-per-page, and a group switched off prints nothing. Only the panel's very
// first page stands under its title alone; every page after it is a continued one, whichever group it belongs to.
export type PhotoPageType = { group: number; part: number; isContinued: boolean };

export function photoPagesOf(
	groups: { isEnabled: boolean; layout: number; photos: unknown[] }[]
): PhotoPageType[] {
	const pages: PhotoPageType[] = [];
	for (const [group, { isEnabled, layout, photos }] of groups.entries()) {
		if (!isEnabled) continue;
		const parts = Math.max(1, Math.ceil(photos.length / layout));
		for (let part = 0; part < parts; part += 1)
			pages.push({ group, part, isContinued: pages.length > 0 });
	}
	return pages;
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
