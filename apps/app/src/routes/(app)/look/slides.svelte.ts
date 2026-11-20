// The photo sliders on a project's page (page-view.svelte) and on its card (project-card.svelte), #250. Both are
// a strip of photos slid sideways with a row of dots under it. A project can hold dozens of photos (MSC Susanna:
// 36), so the row is never one dot each: at most five, sliding along with the photo in view, exactly one of them
// lit. And a photo is given its picture only just before it comes into view: every photo is a full-size file
// behind a signed link, and fetching them all as the page opens is what made the old limit of ten necessary.
import type { Attachment } from 'svelte/attachments';

const DOTS = 5;
// How many photos past the one in view already have their picture, so the next slide is there before it shows.
const AHEAD = 2;

export type DotType = { index: number; isLit: boolean; isSmall: boolean };

/**
 * The row of dots for `count` photos with photo `at` in view (both counted from 0). The row keeps the photo in
 * view in its middle until an end is reached; an end dot is small while more photos lie beyond it.
 */
export function dotsOf(at: number, count: number): DotType[] {
	const length = Math.min(DOTS, count);
	const lit = Math.max(0, Math.min(at, count - 1));
	const first = Math.max(0, Math.min(lit - 2, count - DOTS));
	const last = first + length - 1;
	return Array.from({ length }, (_, offset) => {
		const index = first + offset;
		const isLit = index === lit;
		const isHiding = (index === first && index > 0) || (index === last && index < count - 1);
		return { index, isLit, isSmall: !isLit && isHiding };
	});
}

/** One slider: which photo is in view, and how far along the photos have their pictures. */
export class Slides {
	at = $state(0);
	#reach = $state(AHEAD);
	#strip: HTMLElement | undefined;

	/** Goes on the strip: the slider follows it as it slides, and starts over when a new strip is drawn. */
	follow: Attachment<HTMLElement> = (strip) => {
		this.#strip = strip;
		const onscroll = () => this.see(strip.scrollLeft, strip.clientWidth);
		onscroll();
		strip.addEventListener('scroll', onscroll, { passive: true });
		return () => {
			strip.removeEventListener('scroll', onscroll);
			if (this.#strip === strip) this.#strip = undefined;
		};
	};

	/** The strip is `left` px along and shows `width` px: the nearer photo is the one in view. */
	see(left: number, width: number) {
		if (!width) return;
		this.at = Math.round(left / width);
		this.#reach = Math.max(this.#reach, this.at + AHEAD);
	}

	/** Slides on (1) or back (-1) by a photo. */
	step(by: number) {
		const strip = this.#strip;
		strip?.scrollTo({ left: (this.at + by) * strip.clientWidth, behavior: 'smooth' });
	}

	/** Whether photo `index` is given its picture yet. One that had it keeps it. */
	hasPicture(index: number) {
		return index <= this.#reach;
	}
}
