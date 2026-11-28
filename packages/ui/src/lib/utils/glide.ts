// Gliding to the top (Justin, 2026-11-27, What's New; 2026-11-28, the edit panels, #412): a box a tap opens moves to
// the top of the area it scrolls in, in one eased move that starts at once, while whatever opens and shuts around it
// slides. Each frame the area scrolls so the box stands where the ease puts it, whatever the slides do to the layout
// meanwhile, so the shutting, the opening and the scroll are one move, not one after the other. It stops under the
// area's own scroll padding (the room of a header that sticks over it) and the box's scroll margin, as the browser's
// scrollIntoView does. With reduced motion the box stands there at once and stays while the slides run. A finger or a
// wheel on the area stops it. The library Accordion's `snap` glides with it.

/** How long a glide takes, in milliseconds: longer than the slides it rides over. */
export const GLIDE = 320;

// The area a box scrolls in: the nearest that scrolls up and down, else the page.
function toScroller(node: HTMLElement): HTMLElement {
	for (let each = node.parentElement; each; each = each.parentElement) {
		if (/auto|scroll/.test(getComputedStyle(each).overflowY)) return each;
	}
	return (document.scrollingElement ?? document.documentElement) as HTMLElement;
}

// A length a computed style gives, `auto` and none as 0.
function toPixels(value: string): number {
	return Number.parseFloat(value) || 0;
}

/** Glides `box` to the top of the area it scrolls in, under its scroll padding and the box's scroll margin. */
export function glide(box: HTMLElement, duration = GLIDE): void {
	const area = toScroller(box);
	const isPage = area === document.scrollingElement;
	const edge = () => (isPage ? 0 : area.getBoundingClientRect().top);
	const from = box.getBoundingClientRect().top - edge();
	const to =
		toPixels(getComputedStyle(area).scrollPaddingTop) +
		toPixels(getComputedStyle(box).scrollMarginTop);
	const isStill = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const start = performance.now();
	let frame = 0;
	function stop(): void {
		cancelAnimationFrame(frame);
		area.removeEventListener('wheel', stop);
		area.removeEventListener('touchstart', stop);
	}
	function step(): void {
		const now = performance.now();
		const progress = isStill ? 1 : Math.min((now - start) / duration, 1);
		const wanted = from + (to - from) * (1 - (1 - progress) ** 3);
		const at = box.getBoundingClientRect().top - edge();
		area.scrollTo({ top: area.scrollTop + at - wanted, behavior: 'instant' });
		if (now - start < duration) frame = requestAnimationFrame(step);
		else stop();
	}
	area.addEventListener('wheel', stop, { passive: true });
	area.addEventListener('touchstart', stop, { passive: true });
	frame = requestAnimationFrame(step);
}
