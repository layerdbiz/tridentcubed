// How many pages a stored PDF has (#295), read on the device once and kept for as long as the app is open. A PDF
// attached to the Items panel is stored as the file it is, with no count beside it (one attached before #295 too),
// so its count is read from the PDF itself, which pdf.utils.ts opens once for the Preview and the download alike.
// Until it has been read the count is unknown; a PDF that cannot be read has no pages to print.
import { SvelteMap } from 'svelte/reactivity';
import { pdfOf } from './pdf.utils.js';

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
