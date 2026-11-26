// Whether the shell's sidebar shows (#342). On a desktop it sits beside the page and can be put away (kept in this
// browser); on a phone it pops up over the page and shuts again when an entry is picked.
import { MediaQuery } from 'svelte/reactivity';

const KEEP_KEY = 'play:side-hidden';

const wide = new MediaQuery('min-width: 900px');
const side = $state({ isOpen: false, isHidden: readHidden() });

export function isWide(): boolean {
	return wide.current;
}

/** Shown beside the page (desktop) or over it (phone). */
export function isSideShown(): boolean {
	return wide.current ? !side.isHidden : side.isOpen;
}

export function toggleSide() {
	if (wide.current) {
		side.isHidden = !side.isHidden;
		keep(side.isHidden);
	} else {
		side.isOpen = !side.isOpen;
	}
}

export function shutSide() {
	side.isOpen = false;
}

function readHidden(): boolean {
	try {
		return localStorage.getItem(KEEP_KEY) === 'yes';
	} catch {
		return false;
	}
}

function keep(isHidden: boolean) {
	try {
		localStorage.setItem(KEEP_KEY, isHidden ? 'yes' : 'no');
	} catch {
		// A private window keeps nothing; the sidebar still works.
	}
}
