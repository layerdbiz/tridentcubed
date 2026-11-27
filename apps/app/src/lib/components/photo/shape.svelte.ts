// #295: a picture's own size, read once from the picture itself and kept for as long as the app is open, so a stage
// laid out Free or Fit gives each attachment a spot of its own shape, and the editor its frame. Until it has been
// read, nothing is known.
import { SvelteMap } from 'svelte/reactivity';
import type { SizeType } from './photo.types';

const shapes = new SvelteMap<string, SizeType>();
const asked = new Set<string>();

/** The size of the picture at `src`; none until it has loaded. */
export function shapeOf(src: string) {
	if (src && !asked.has(src) && typeof Image !== 'undefined') {
		asked.add(src);
		const image = new Image();
		image.onload = () => {
			if (image.naturalWidth && image.naturalHeight)
				shapes.set(src, { width: image.naturalWidth, height: image.naturalHeight });
		};
		image.src = src;
	}
	return shapes.get(src);
}

/** What a picture's size is known to be, for one that drew its own: a loaded image tells it. */
export function keepShape(src: string, shape: SizeType) {
	if (src && shape.width && shape.height && !shapes.has(src)) shapes.set(src, shape);
}
