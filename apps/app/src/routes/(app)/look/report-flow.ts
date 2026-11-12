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
