// PROTOTYPE (#161) run 32: how a report section runs on over as many pages as it needs (Justin, 2026-11-12: "if
// anytime a page gets too big in height, it needs to automatically create another page and automatically add it
// to the table of contents"). A section is a list of blocks that are never cut in two: a paragraph, a card, one
// row of the time log. Each is measured as it will print (report-preview.svelte), and this fills a page with
// blocks until the next one would not fit, then starts another. A block that is glued (a heading) never ends a
// page: it moves on with the block after it.

// Which blocks go on which page, by index, given each block's height and the room a page has.
export function paginate(heights: number[], room: number, isGlued: boolean[] = []) {
	const pages: number[][] = [[]];
	let used = 0;
	for (const [index, height] of heights.entries()) {
		const page = pages.at(-1)!;
		const need = isGlued[index] ? height + (heights[index + 1] ?? 0) : height;
		if (page.length && used + need > room) {
			pages.push([index]);
			used = height;
		} else {
			page.push(index);
			used += height;
		}
	}
	return pages;
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

// The page the preview opens at, by index: the open panel's page (`found`, -1 with none open); else the page a
// report link asked for (`asked`, from 1; 0 for none), held to the pages there are (#216); else the first.
export function targetOf(found: number, asked: number, count: number) {
	if (found >= 0) return found;
	return Math.max(0, Math.min(asked, count) - 1);
}
