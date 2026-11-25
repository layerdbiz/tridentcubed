// PDFs on the device (#327; glossary "Attachment"): a PDF in a photo group is read here with PDF.js. When it is
// added, its page count is read and its first page drawn as the picture that shows for it (in its tile, the photo
// slider and the pop-up). On the Preview each of its pages is drawn as a picture, once, and kept for as long as the
// app is open; the downloaded PDF puts in the PDF's own pages instead (the Preview's download.ts), and a page only
// as a picture when the PDF is locked against copying its pages.
//
// PDF.js is fetched only once a PDF is there to read, with its worker. Its legacy build is the one that runs on the
// older iPhones the app still serves (Vite's default target).
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PictureError } from '#lib/files/files.schema.js';
import type { MadeType } from '#lib/files/files.state.svelte.js';

/** What the User reads about a PDF that opens only with a password. */
export const LOCKED = 'This PDF needs a password to open. Save it without one and add it again.';

/** What the User reads about a file that is not a PDF the app can read. */
export const UNREADABLE_PDF = 'This PDF could not be read. Save it again and add it once more.';

/** How wide a PDF's first page is drawn as its picture, in pixels. */
const PICTURE_WIDTH = 1400;

/** How sharp a page is drawn on the Preview: this many times the width of its spot. */
export const SHARPNESS = 2.5;

type LibraryType = typeof import('pdfjs-dist');

let library: Promise<LibraryType> | undefined;

function loadLibrary() {
	library ??= (async () => {
		const [pdfjs, worker] = await Promise.all([
			import('pdfjs-dist/legacy/build/pdf.mjs'),
			import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')
		]);
		pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
		return pdfjs as LibraryType;
	})();
	library.catch(() => (library = undefined));
	return library;
}

/** A PDF opened from its bytes. PDF.js takes the bytes it is given to its worker, so it is given a copy. */
export async function openPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
	const pdfjs = await loadLibrary();
	try {
		return await pdfjs.getDocument({ data: bytes.slice() }).promise;
	} catch (error) {
		if (error instanceof Error && error.name === 'PasswordException')
			throw new PictureError(LOCKED);
		throw new PictureError(UNREADABLE_PDF);
	}
}

/** A page of an open PDF drawn `width` pixels wide on white, as a JPEG. */
export async function drawPage(pdf: PDFDocumentProxy, page: number, width: number) {
	const proxy = await pdf.getPage(page);
	const scale = width / proxy.getViewport({ scale: 1 }).width;
	const viewport = proxy.getViewport({ scale });
	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, Math.round(viewport.width));
	canvas.height = Math.max(1, Math.round(viewport.height));
	try {
		await proxy.render({ canvas, viewport, background: '#ffffff' }).promise;
		return await new Promise<Blob>((resolve, reject) =>
			canvas.toBlob(
				(blob) => (blob ? resolve(blob) : reject(new Error('The page could not be drawn.'))),
				'image/jpeg',
				0.86
			)
		);
	} finally {
		proxy.cleanup();
		// A phone keeps only so much canvas: let this one go at once.
		canvas.width = 0;
		canvas.height = 0;
	}
}

/** A page's own shape, its rotation taken in: what its spot shows it as. */
export async function shapeOf(pdf: PDFDocumentProxy, page: number) {
	const viewport = (await pdf.getPage(page)).getViewport({ scale: 1 });
	return { width: viewport.width, height: viewport.height };
}

/** A picked PDF, read before it goes (#327): how many pages it has, and its first page as the picture that shows. */
export async function readPdf(file: File): Promise<MadeType> {
	const pdf = await openPdf(new Uint8Array(await file.arrayBuffer()));
	try {
		const blob = await drawPage(pdf, 1, PICTURE_WIDTH);
		const name = `${file.name.replace(/\.pdf$/i, '')}.jpg`;
		return {
			picture: new File([blob], name, { type: 'image/jpeg' }),
			pageCount: pdf.numPages
		};
	} catch (error) {
		if (error instanceof PictureError) throw error;
		throw new PictureError(UNREADABLE_PDF);
	} finally {
		void pdf.loadingTask.destroy();
	}
}

// The PDFs fetched, and the pages drawn, by address, for as long as the app is open.
const fetched = new Map<string, Promise<Uint8Array>>();
const opened = new Map<string, Promise<PDFDocumentProxy>>();
const drawn = new Map<string, Promise<string>>();

/** A stored PDF's bytes (`/files/<id>`), fetched once. */
export function bytesOf(address: string) {
	let bytes = fetched.get(address);
	if (!bytes) {
		bytes = fetch(address).then(async (response) => {
			if (!response.ok) throw new Error(`The PDF answered ${response.status}.`);
			return new Uint8Array(await response.arrayBuffer());
		});
		bytes.catch(() => fetched.delete(address));
		fetched.set(address, bytes);
	}
	return bytes;
}

/** A stored PDF, open, once. */
export function pdfOf(address: string) {
	let pdf = opened.get(address);
	if (!pdf) {
		pdf = bytesOf(address).then(openPdf);
		pdf.catch(() => opened.delete(address));
		opened.set(address, pdf);
	}
	return pdf;
}

/** A page of a stored PDF as a picture's address on this device, drawn once at each width asked for. */
export function pageOf(address: string, page: number, width: number) {
	const key = `${address}#${page}@${width}`;
	let picture = drawn.get(key);
	if (!picture) {
		picture = pdfOf(address)
			.then((pdf) => drawPage(pdf, page, width))
			.then((blob) => URL.createObjectURL(blob));
		picture.catch(() => drawn.delete(key));
		drawn.set(key, picture);
	}
	return picture;
}

/** The width a page is drawn at for a spot this wide: sharp enough to print, in steps so few widths are drawn. */
export function toDrawnWidth(spotWidth: number) {
	const step = 400;
	return Math.min(2400, Math.max(step, Math.ceil((spotWidth * SHARPNESS) / step) * step));
}
