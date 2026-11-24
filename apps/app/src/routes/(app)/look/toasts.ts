// The toasts stacked over the app's screens (#293), each the library's Toast (look.svelte): the PDF download's, and
// one for each set of photos picked together. They live here, apart from the screens' state, so the many tests of
// that state do not load the UI library.
import { Progress } from '@layerd/ui';
import { SvelteSet } from 'svelte/reactivity';

const download = new Progress();
const photos = new SvelteSet<Progress>();

/** The PDF download's toast (#240). */
export function downloadToast() {
	return download;
}

/** A new toast for photos picked together, stacked under the download's. Toasts whose photos are all stored go. */
export function createPhotoToast() {
	for (const done of photos) if (!done.isOpen && done.percent === 100) photos.delete(done);
	const toast = new Progress();
	photos.add(toast);
	return toast;
}

/** The photo toasts on show, oldest first. A closed one comes back when one of its photos is tried again. */
export function photoToasts() {
	return [...photos].filter((toast) => toast.isOpen);
}
