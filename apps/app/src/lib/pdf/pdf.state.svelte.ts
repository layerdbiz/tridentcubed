// How many pages a stored PDF has (#295), read on the device once and kept for as long as the app is open. A PDF
// attached to the Items panel is stored as the file it is, with no count beside it (one attached before #295 too),
// so its count is read from the PDF itself, which pdf.utils.ts opens once for the Preview and the download alike.
// Until it has been read the count is unknown; a PDF that cannot be read has no pages to print.
import { SvelteMap } from 'svelte/reactivity';
import { pageOf, pdfOf } from './pdf.utils.js';

const counts = new SvelteMap<string, number>();
const asked = new Set<string>();

/** How many pages the stored PDF at `address` has: none until it has been read, 0 when it cannot be read. */
export function pageCountOf(address: string) {
	if (address && !asked.has(address)) {
		asked.add(address);
		pdfOf(address).then(
			(pdf) => counts.set(address, pdf.numPages),
			() => counts.set(address, 0)
		);
	}
	return counts.get(address);
}

// #295: each page's shape (its width and height as shown), read once, so a stage laid out Free or Fit gives a PDF's
// page a spot of its own shape. Until it has been read, a page reads as A4 upright.
const shapes = new SvelteMap<string, { width: number; height: number }>();
const measured = new Set<string>();

/** A stored PDF's page shape, `page` from 1; none until it has been read. */
export function pageShapeOf(address: string, page: number) {
	const key = `${address}#${page}`;
	if (address && !measured.has(key)) {
		measured.add(key);
		pdfOf(address)
			.then((pdf) => pdf.getPage(page))
			.then(
				(each) => {
					const { width, height } = each.getViewport({ scale: 1 });
					if (width > 0 && height > 0) shapes.set(key, { width, height });
				},
				() => undefined
			);
	}
	return shapes.get(key);
}

// #295: a page drawn as a picture for the photo pop-up's editor, at one width, kept like the rest.
const pictures = new SvelteMap<string, string>();
const drawing = new Set<string>();

/** A stored PDF's page as a picture's address, `page` from 1, `width` pixels wide; none until it is drawn. */
export function pagePictureOf(address: string, page: number, width = 1600) {
	const key = `${address}#${page}@${width}`;
	if (address && !drawing.has(key)) {
		drawing.add(key);
		pageOf(address, page, width).then(
			(picture) => pictures.set(key, picture),
			() => drawing.delete(key)
		);
	}
	return pictures.get(key);
}
