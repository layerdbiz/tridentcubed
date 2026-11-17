// Anything that scrolls fades out at its edges rather than stopping at a hard line (run 12 note 15). The bottom always
// fades. The top fades only once the list has moved under it: at the very top everything shows, and the fade grows
// with the first 56px scrolled (Justin, 2026-11-16). `FADE` is the class, and `fadeTop` goes on the same element to
// tell it how far it has scrolled.
import type { Attachment } from 'svelte/attachments';

const DEPTH = 56;

// Written out in full: Tailwind only makes a class it can read as it stands.
export const FADE =
	'[mask-image:linear-gradient(to_bottom,transparent,black_var(--fade-top,0px),black_calc(100%-56px),transparent)]';

export const fadeTop: Attachment<HTMLElement> = (node) => {
	function follow() {
		node.style.setProperty('--fade-top', `${Math.min(node.scrollTop, DEPTH)}px`);
	}
	follow();
	node.addEventListener('scroll', follow, { passive: true });
	return () => node.removeEventListener('scroll', follow);
};
