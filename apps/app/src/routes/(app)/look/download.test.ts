// Download in parts (#240): a report too big for one request prints as several that each fit, and the PDFs that come
// back are joined into one, in page order. The server is played by a function that answers each request; the PDFs
// are real ones, made and read back with the same library that joins them.
import { PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { describe, expect, it } from 'vite-plus/test';
import {
	DownloadError,
	joinPdfs,
	PART_LIMIT,
	printParts,
	reasonOf,
	sizeOf,
	toParts
} from './download';

const MB = 1024 * 1024;
// The host's cap on one request, which no part may reach.
const HOST_CAP = 4.5 * MB;

function pageOf(kilobytes: number, name = 'page') {
	return `<article data-page="${name}">${'x'.repeat(kilobytes * 1024)}</article>`;
}

async function pdfOf(labels: string[]) {
	const pdf = await PDFDocument.create();
	for (const label of labels) {
		const page = pdf.addPage([595, 842]);
		page.drawText(label);
		const link = pdf.context.obj({
			Type: 'Annot',
			Subtype: 'Link',
			Rect: [0, 0, 50, 50],
			A: { Type: 'Action', S: 'URI', URI: PDFString.of(`https://example.com/${label}`) }
		});
		page.node.set(PDFName.of('Annots'), pdf.context.obj([pdf.context.register(link)]));
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
	it('hands a single part back as it came', async () => {
		const only = await pdfOf(['one', 'two']);
		expect(await joinPdfs([only], 'r.pdf')).toBe(only);
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
