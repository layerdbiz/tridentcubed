// The files PDF.js reads only for some PDFs (#327), served with the app: the decoders of scanned pages (JBIG2, JPEG
// 2000), the fonts a PDF names without carrying them, and the character maps of Chinese, Japanese and Korean text.
// The build gives each its own address, listed here by where it sits in pdfjs-dist. This list is fetched only once a
// PDF asks for one of them (`LibraryFiles` in pdf.utils.ts), and each file only when a PDF needs it.
export const LIBRARY_FILES = import.meta.glob<string>(
	'/node_modules/pdfjs-dist/{wasm/*.wasm,cmaps/*.bcmap,standard_fonts/*.{pfb,ttf}}',
	{ query: '?url', import: 'default', eager: true }
);

/** Where in pdfjs-dist each kind of file PDF.js asks for sits. */
export const LIBRARY_FOLDERS: Record<string, string> = {
	wasmUrl: 'wasm',
	cMapUrl: 'cmaps',
	standardFontDataUrl: 'standard_fonts'
};
