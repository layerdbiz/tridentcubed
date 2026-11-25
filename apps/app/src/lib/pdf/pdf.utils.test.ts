import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { LibraryFiles, toDrawnWidth } from './pdf.utils.js';

describe('LibraryFiles: the files PDF.js reads for some PDFs (#327)', () => {
	let asked: string[];

	beforeEach(() => {
		asked = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (address: string) => {
				asked.push(address);
				return new Response(new Uint8Array([1, 2, 3]));
			})
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it.each([
		['wasmUrl', 'openjpeg.wasm'],
		['wasmUrl', 'jbig2.wasm'],
		['cMapUrl', 'UniJIS-UTF16-H.bcmap'],
		['standardFontDataUrl', 'FoxitDingbats.pfb'],
		['standardFontDataUrl', 'LiberationSans-Regular.ttf']
	])('hands PDF.js its %s file %s from the app', async (kind, filename) => {
		const bytes = await new LibraryFiles().fetch({ kind, filename });

		expect([...bytes]).toEqual([1, 2, 3]);
		expect(asked).toHaveLength(1);
		expect(asked[0]).toContain(filename.replace(/\.[^.]+$/, ''));
	});

	it('says so for a file PDF.js does not have, without fetching anything', async () => {
		await expect(
			new LibraryFiles().fetch({ kind: 'wasmUrl', filename: 'nothing.wasm' })
		).rejects.toThrow('PDF.js has no file nothing.wasm.');
		expect(asked).toEqual([]);
	});

	it('says so when the file does not come', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('', { status: 404 }))
		);

		await expect(
			new LibraryFiles().fetch({ kind: 'wasmUrl', filename: 'openjpeg.wasm' })
		).rejects.toThrow("PDF.js's openjpeg.wasm answered 404.");
	});
});

describe('toDrawnWidth: how wide a PDF page is drawn on the Preview', () => {
	it('is sharp enough to print, in steps of 400 pixels so few widths are drawn', () => {
		expect(toDrawnWidth(100)).toBe(400);
		expect(toDrawnWidth(250)).toBe(800);
		expect(toDrawnWidth(500)).toBe(1600);
	});

	it('is never wider than 2400 pixels, nor narrower than 400', () => {
		expect(toDrawnWidth(2000)).toBe(2400);
		expect(toDrawnWidth(0)).toBe(400);
	});
});
