// Download in parts (#240): a report too big for one request prints as several that each fit, and the PDFs that come
// back are joined into one, in page order. The server is played by a function that answers each request; the PDFs
// are real ones, made and read back with the same library that joins them.
import { PDFArray, PDFDocument, PDFName, PDFNumber, PDFRef, PDFString } from 'pdf-lib';
import { describe, expect, it } from 'vite-plus/test';
import {
	containOf,
	DownloadError,
	joinPdfs,
	PART_LIMIT,
	placePdfPages,
	type PdfReaderType,
	printParts,
	reasonOf,
	sizeOf,
	toDrawing,
	toPageLink,
	toParts,
	toTurn
} from './download';

const MB = 1024 * 1024;
// The host's cap on one request, which no part may reach.
const HOST_CAP = 4.5 * MB;

function pageOf(kilobytes: number, name = 'page') {
	return `<article data-page="${name}">${'x'.repeat(kilobytes * 1024)}</article>`;
}

// A printed part as the export browser makes it: each page with its QR code's link, and any other links it is given
// by its label (a contents page's lines), each a band down the page. `lang` stands for what the printer puts in the
// document itself (its language, its tags), which a part keeps when it is the whole report.
async function pdfOf(labels: string[], lines: Record<string, string[]> = {}, lang?: string) {
	const pdf = await PDFDocument.create();
	if (lang) pdf.catalog.set(PDFName.of('Lang'), PDFString.of(lang));
	for (const label of labels) {
		const page = pdf.addPage([595, 842]);
		page.drawText(label);
		const addresses = [`https://example.com/${label}`, ...(lines[label] ?? [])];
		const links = addresses.map((address, at) =>
			pdf.context.register(
				pdf.context.obj({
					Type: 'Annot',
					Subtype: 'Link',
					Rect: at ? [40, 800 - 30 * at, 555, 830 - 30 * at] : [0, 0, 50, 50],
					A: { Type: 'Action', S: 'URI', URI: PDFString.of(address) }
				})
			)
		);
		page.node.set(PDFName.of('Annots'), pdf.context.obj(links));
	}
	return pdf.save();
}

function answer(pdf: Uint8Array) {
	return new Response(Buffer.from(pdf), { headers: { 'content-type': 'application/pdf' } });
}

describe('splitting a report into parts', () => {
	it('keeps a small report in one part', () => {
		const pages = [pageOf(3), pageOf(18), pageOf(17)];
		expect(toParts(pages)).toEqual([pages]);
	});

	it('splits the report that failed (24 pages, 5.43 MB) so every part fits', () => {
		// The pages of the report that was refused on 2026-11-19, by their measured sizes in KB.
		const SIZES = [
			3, 18, 17, 14, 15, 13, 14, 14, 13, 13, 13, 16, 6, 27, 36, 325, 23, 662, 814, 815, 784, 1088,
			797, 19
		];
		const pages = SIZES.map((size, at) => pageOf(size, String(at)));
		expect(sizeOf(pages.join('\n'))).toBeGreaterThan(HOST_CAP);

		const parts = toParts(pages);

		expect(parts.length).toBeGreaterThan(1);
		expect(parts.flat()).toEqual(pages);
		for (const part of parts) expect(sizeOf(part.join('\n'))).toBeLessThanOrEqual(PART_LIMIT);
	});

	it('fills no part past the room it is given', () => {
		const pages = [pageOf(600), pageOf(600), pageOf(600)];
		expect(toParts(pages, 2 * MB)).toHaveLength(1);
		expect(toParts(pages, MB)).toHaveLength(3);
	});

	it('sends a page bigger than a part on its own', () => {
		const pages = [pageOf(10, 'a'), pageOf(3200, 'big'), pageOf(10, 'c')];
		expect(toParts(pages)).toEqual([[pages[0]], [pages[1]], [pages[2]]]);
	});

	it('counts a page as the bytes it is once written into the request', () => {
		expect(sizeOf('abc')).toBe(5);
		expect(sizeOf('say "hi"')).toBe(12);
		expect(sizeOf('é')).toBe(4);
	});

	it('has nothing to send for no pages', () => {
		expect(toParts([])).toEqual([]);
	});
});

describe('printing the parts', () => {
	it('sends every part and hands the PDFs back in page order, whichever answers first', async () => {
		const first = await pdfOf(['one']);
		const second = await pdfOf(['two']);
		const bodies: { pages: string; styles: string; filename: string }[] = [];
		const done: number[] = [];

		const pdfs = await printParts([['<p>1</p>', '<p>2</p>'], ['<p>3</p>']], {
			styles: '<style></style>',
			filename: 'KOGA-2026-11-12-J01-FR01.pdf',
			async send(body) {
				const sent = JSON.parse(body);
				bodies.push(sent);
				// The first part answers last.
				if (sent.pages.includes('<p>1</p>'))
					await new Promise((resolve) => setTimeout(resolve, 20));
				return answer(sent.pages.includes('<p>1</p>') ? first : second);
			},
			ondone: (at) => done.push(at)
		});

		expect(bodies.map((body) => body.pages).toSorted()).toEqual(['<p>1</p>\n<p>2</p>', '<p>3</p>']);
		expect(bodies.every((body) => body.styles === '<style></style>')).toBe(true);
		expect(bodies.every((body) => body.filename === 'KOGA-2026-11-12-J01-FR01.pdf')).toBe(true);
		expect(pdfs).toEqual([first, second]);
		expect(done).toEqual([1, 0]);
	});

	it('prints no more than three parts at a time', async () => {
		let open = 0;
		let most = 0;
		const pdf = await pdfOf(['x']);
		const started: number[] = [];
		await printParts([['a'], ['b'], ['c'], ['d'], ['e']], {
			styles: '',
			filename: 'r.pdf',
			async send() {
				open += 1;
				most = Math.max(most, open);
				await new Promise((resolve) => setTimeout(resolve, 5));
				open -= 1;
				return answer(pdf);
			},
			onstart: (at) => started.push(at)
		});
		expect(most).toBe(3);
		expect(started).toEqual([0, 1, 2, 3, 4]);
	});

	it('tries a part again when the server trips once', async () => {
		const pdf = await pdfOf(['x']);
		let calls = 0;
		const pdfs = await printParts([['a']], {
			styles: '',
			filename: 'r.pdf',
			async send() {
				calls += 1;
				return calls === 1 ? new Response('boom', { status: 500 }) : answer(pdf);
			}
		});
		expect(calls).toBe(2);
		expect(pdfs).toEqual([pdf]);
	});

	it('tries a part again when the connection drops once', async () => {
		const pdf = await pdfOf(['x']);
		let calls = 0;
		const pdfs = await printParts([['a']], {
			styles: '',
			filename: 'r.pdf',
			async send() {
				calls += 1;
				if (calls === 1) throw new TypeError('Failed to fetch');
				return answer(pdf);
			}
		});
		expect(pdfs).toEqual([pdf]);
	});

	it('says the connection is gone when it stays gone', async () => {
		const print = printParts([['a']], {
			styles: '',
			filename: 'r.pdf',
			async send() {
				throw new TypeError('Failed to fetch');
			}
		});
		await expect(print).rejects.toThrow(DownloadError);
		await expect(print).rejects.toThrow('No connection. Check your signal and try again.');
	});

	it('does not ask twice when the answer will not change', async () => {
		let calls = 0;
		const print = printParts([['a']], {
			styles: '',
			filename: 'r.pdf',
			async send() {
				calls += 1;
				return Response.json({ message: 'Sign in first.' }, { status: 401 });
			}
		});
		await expect(print).rejects.toThrow(
			'You are signed out. Sign in again, then download the PDF.'
		);
		expect(calls).toBe(1);
	});

	it("says what the host's refusal of a too-big part means, the answer that was shown as nothing", async () => {
		const print = printParts([['a']], {
			styles: '',
			filename: 'r.pdf',
			send: async () =>
				new Response('Request Entity Too Large\n\nFUNCTION_PAYLOAD_TOO_LARGE\n', { status: 413 })
		});
		await expect(print).rejects.toThrow(
			'One page of this report is too big to print. Take a picture off its fullest page and try again.'
		);
	});

	it('starts no new part once one has failed', async () => {
		const started: number[] = [];
		const print = printParts([['a'], ['b'], ['c'], ['d'], ['e'], ['f']], {
			styles: '',
			filename: 'r.pdf',
			send: async () => Response.json({ message: 'Sign in first.' }, { status: 401 }),
			onstart: (at) => started.push(at)
		});
		await expect(print).rejects.toThrow(DownloadError);
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(started).toEqual([0, 1, 2]);
	});

	it('does not wait twice for a printer that ran out of time', async () => {
		let calls = 0;
		const print = printParts([['a']], {
			styles: '',
			filename: 'r.pdf',
			async send() {
				calls += 1;
				return new Response('timed out', { status: 504 });
			}
		});
		await expect(print).rejects.toThrow('Printing took too long. Try again.');
		expect(calls).toBe(1);
	});
});

describe('the reason a download failed, in plain words', () => {
	it('uses what the app itself said for a refusal', () => {
		expect(reasonOf(403, 'You are waiting for access.')).toBe('You are waiting for access.');
		expect(reasonOf(400, 'No pages to print.')).toBe('No pages to print.');
	});

	it('never shows the printer’s own error text', () => {
		expect(reasonOf(500, 'Navigation timeout of 30000 ms exceeded')).toBe(
			'The PDF could not be made. Try again.'
		);
	});

	it('says printing took too long when the host gave up waiting', () => {
		expect(reasonOf(504)).toBe('Printing took too long. Try again.');
	});
});

describe('joining the parts into one PDF', () => {
	it('keeps a single part as the printer made it, its language and tags too', async () => {
		const joined = await joinPdfs([await pdfOf(['one', 'two'], {}, 'en')], 'r.pdf');

		const pdf = await PDFDocument.load(joined);
		expect(pdf.getPageCount()).toBe(2);
		expect(pdf.catalog.lookup(PDFName.of('Lang'), PDFString).decodeText()).toBe('en');
	});

	it('puts every page of every part into one PDF, in order, with its links', async () => {
		const joined = await joinPdfs(
			[await pdfOf(['p1', 'p2', 'p3']), await pdfOf(['p4']), await pdfOf(['p5', 'p6'])],
			'KOGA-2026-11-12-J01-FR01.pdf'
		);

		const pdf = await PDFDocument.load(joined);
		expect(pdf.getPageCount()).toBe(6);
		expect(pdf.getTitle()).toBe('KOGA-2026-11-12-J01-FR01');
		const addresses = pdf.getPages().map((page) => {
			const annotations = page.node.Annots();
			const link = annotations?.lookup(0) as unknown as { get(name: PDFName): unknown };
			const action = pdf.context.lookup(link.get(PDFName.of('A')) as never) as unknown as {
				get(name: PDFName): PDFString;
			};
			return action.get(PDFName.of('URI')).decodeText();
		});
		expect(addresses).toEqual(
			['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((label) => `https://example.com/${label}`)
		);
		expect(pdf.getPage(0).getSize()).toEqual({ width: 595, height: 842 });
	});
});

// A white picture one pixel square, as a JPEG: what the device draws a locked PDF's page as.
const WHITE_JPEG = Uint8Array.from(
	atob(
		'/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
	),
	(character) => character.charCodeAt(0)
);

// A report as the export browser prints one: pages 595 by 842 CSS pixels, so 446.25 by 631.5 points.
async function printedOf(count: number) {
	const pdf = await PDFDocument.create();
	for (let at = 0; at < count; at += 1) pdf.addPage([446.25, 631.5]);
	return pdf.save();
}

// An attached PDF of Letter pages, each with its number written on it; `turned` pages are shown turned a quarter.
async function attachedOf(count: number, turned: number[] = []) {
	const pdf = await PDFDocument.create();
	for (let at = 0; at < count; at += 1) {
		const page = pdf.addPage([612, 792]);
		page.drawText(`Attached page ${at + 1}`, { x: 72, y: 700 });
		if (turned.includes(at)) page.setRotation({ type: 'degrees', angle: 90 } as never);
	}
	return pdf.save();
}

// What a page draws, as its content streams say it.
async function drawnOn(bytes: Uint8Array, page: number) {
	const pdf = await PDFDocument.load(bytes);
	const { PDFRawStream, decodePDFRawStream } = await import('pdf-lib');
	const contents = pdf.getPages()[page].node.Contents();
	const streams = contents && 'asArray' in contents ? contents.asArray() : [contents];
	return streams
		.map((ref) => pdf.context.lookup(ref as never))
		.map((stream) =>
			stream instanceof PDFRawStream
				? new TextDecoder().decode(decodePDFRawStream(stream).decode())
				: String(stream)
		)
		.join('\n');
}

describe('attached PDFs in the downloaded report (#327)', () => {
	it('fits a page in its spot, as big as it goes, in the middle', () => {
		// A Letter page in a wide spot: as tall as the spot, centred across it.
		expect(
			containOf({ x: 40, y: 100, width: 515, height: 386 }, { width: 612, height: 792 })
		).toEqual({
			x: 40 + (515 - 612 * (386 / 792)) / 2,
			y: 100,
			width: 612 * (386 / 792),
			height: 386
		});
	});

	it('turns a page its PDF shows turned so it stands upright in its spot', () => {
		expect(toTurn(-90)).toBe(270);
		expect(toTurn(450)).toBe(90);
		const fitted = { x: 10, y: 20, width: 300, height: 200 };
		const size = { width: 200, height: 300 };
		expect(toDrawing(fitted, size, 90)).toEqual({
			x: 10,
			y: 220,
			width: 200,
			height: 300,
			rotate: -90
		});
		expect(toDrawing(fitted, size, 270)).toEqual({
			x: 310,
			y: 20,
			width: 200,
			height: 300,
			rotate: 90
		});
		expect(toDrawing(fitted, { width: 300, height: 200 }, 180)).toEqual({
			x: 310,
			y: 220,
			width: 300,
			height: 200,
			rotate: 180
		});
	});

	it('puts the PDF’s own pages in their spots, fetching the PDF once, and leaves the rest as it was', async () => {
		const attached = await attachedOf(3, [2]);
		const fetched: string[] = [];
		const read: PdfReaderType = {
			bytes: async (source) => {
				fetched.push(source);
				return attached;
			},
			picture: async () => {
				throw new Error('A PDF the library opens is never drawn as pictures.');
			}
		};
		const box = { width: 250, height: 188 };
		const placed = await placePdfPages(
			await printedOf(2),
			[
				{ page: 0, box: { x: 40, y: 120, ...box }, source: '/files/a', at: 0 },
				{ page: 0, box: { x: 305, y: 120, ...box }, source: '/files/a', at: 1 },
				{ page: 1, box: { x: 40, y: 120, ...box }, source: '/files/a', at: 2 }
			],
			read
		);

		const pdf = await PDFDocument.load(placed);
		expect(pdf.getPageCount()).toBe(2);
		expect(fetched).toEqual(['/files/a']);
		// Two pages drawn on the first report page, one turned upright on the second.
		expect((await drawnOn(placed, 0)).match(/ Do/g)).toHaveLength(2);
		const second = await drawnOn(placed, 1);
		expect(second.match(/ Do/g)).toHaveLength(1);
		expect(second).toMatch(/ -1 1 [\d.e-]+ 0 0 cm/);
	});

	it('draws a PDF the library cannot open as pictures of its pages', async () => {
		const asked: Array<[string, number]> = [];
		const placed = await placePdfPages(
			await printedOf(1),
			[
				{ page: 0, box: { x: 40, y: 120, width: 515, height: 386 }, source: '/files/locked', at: 1 }
			],
			{
				bytes: async () => new TextEncoder().encode('%PDF-1.7 locked'),
				picture: async (source, page) => {
					asked.push([source, page]);
					return WHITE_JPEG;
				}
			}
		);
		expect(asked).toEqual([['/files/locked', 2]]);
		expect(await drawnOn(placed, 0)).toMatch(/ Do/);
	});

	it('fails the download in plain words when an attached PDF cannot be fetched', async () => {
		const printed = await printedOf(1);
		await expect(
			placePdfPages(
				printed,
				[
					{ page: 0, box: { x: 40, y: 120, width: 515, height: 386 }, source: '/files/gone', at: 0 }
				],
				{
					bytes: async () => {
						throw new TypeError('Failed to fetch');
					},
					picture: async () => WHITE_JPEG
				}
			)
		).rejects.toThrow('An attached PDF could not be fetched');
	});

	it('hands back the report untouched when nothing is attached', async () => {
		const printed = await printedOf(1);
		const read: PdfReaderType = { bytes: async () => printed, picture: async () => WHITE_JPEG };
		expect(await placePdfPages(printed, [], read)).toBe(printed);
	});
});

// The Table of Contents' links (#301). Each line is printed as a link, so the printer draws its box exactly where
// the line is; its address is the report link of its page, ending in #page-<n>. Once the parts are one PDF, each
// such link is made to open page n of the PDF itself, whichever part printed that page.
describe('linking the contents to their pages', () => {
	const APP = 'https://dev.app.tridentcubed.com/report/project-1';

	// Each link of a page: the page of the PDF it opens (from 0), or the address it opens, and its box.
	async function linksOf(bytes: Uint8Array, at: number) {
		const pdf = await PDFDocument.load(bytes);
		const refs = pdf.getPages().map((page) => page.ref);
		const annotations = pdf.getPage(at).node.Annots()?.asArray() ?? [];
		return annotations.map((ref) => {
			const link = pdf.context.lookup(ref) as unknown as { get(name: PDFName): unknown };
			const rect = (link.get(PDFName.of('Rect')) as PDFArray)
				.asArray()
				.map((corner) => (corner as PDFNumber).asNumber());
			const dest = link.get(PDFName.of('Dest')) as PDFArray | undefined;
			if (dest) return { to: refs.indexOf(dest.get(0) as PDFRef), rect };
			const action = pdf.context.lookup(link.get(PDFName.of('A')) as never) as unknown as {
				get(name: PDFName): PDFString;
			};
			return { address: action.get(PDFName.of('URI')).decodeText(), rect };
		});
	}

	it('makes a contents line open a page another part printed, where the printer drew it', async () => {
		const joined = await joinPdfs(
			[
				await pdfOf(['cover', 'contents'], { contents: [toPageLink(`${APP}/4`, 4)] }),
				await pdfOf(['report', 'photos'])
			],
			'r.pdf'
		);

		expect(await linksOf(joined, 1)).toEqual([
			{ address: 'https://example.com/contents', rect: [0, 0, 50, 50] },
			{ to: 3, rect: [40, 770, 555, 800] }
		]);
	});

	it('links the contents of a report printed in one part', async () => {
		const lines = [toPageLink(`${APP}/1`, 1), toPageLink(`${APP}/3`, 3)];
		const joined = await joinPdfs(
			[await pdfOf(['cover', 'contents', 'report'], { contents: lines })],
			'r.pdf'
		);

		const links = await linksOf(joined, 1);
		expect(links.map((link) => ('to' in link ? link.to : link.address))).toEqual([
			'https://example.com/contents',
			0,
			2
		]);
	});

	it('leaves a line naming a page the PDF does not have as a link to the app', async () => {
		const line = toPageLink(`${APP}/9`, 9);
		const joined = await joinPdfs(
			[await pdfOf(['cover', 'contents'], { contents: [line] })],
			'r.pdf'
		);

		expect((await linksOf(joined, 1))[1]).toEqual({ address: line, rect: [40, 770, 555, 800] });
	});
});
