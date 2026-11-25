// Download in parts (#240). The Preview sends its pages, pictures and all, to the export (`/api/export/pdf`), and
// the host refuses any request over 4.5 MB before the app's code runs: a report of 24 pages and 136 pictures was
// 5.43 MB, so its Download answered "The PDF could not be made" and nothing else (Michael's MSC Susana,
// 2026-11-19). The pages now go in parts that each fit, a few at a time, and the PDFs that come back are joined
// into one, in page order, on the device. A part's answer is its own PDF, so no answer comes near the cap either.
//
// What is said when it fails is plain words for the person waiting (`reasonOf`); the printer's own error text goes
// to the console and no further.

/** The most one part's request may weigh, in bytes: well under the host's 4.5 MB, whatever else rides along. */
export const PART_LIMIT = 3_000_000;

// How many parts print at the same time: each is its own export browser on the server.
const LANES = 3;
// How often a part is asked for before the download gives up: once more after a trip or a dropped connection.
const TRIES = 2;

const FALLBACK = 'The PDF could not be made. Try again.';
const NO_CONNECTION = 'No connection. Check your signal and try again.';

/** A download that failed for a reason the person can read: its message is what the toast shows. */
export class DownloadError extends Error {
	/** Whether asking again could go differently. */
	isPassing: boolean;

	constructor(message: string, isPassing = false) {
		super(message);
		this.name = 'DownloadError';
		this.isPassing = isPassing;
	}
}

/** What a text weighs in a request, in bytes: as JSON writes it, quotes and escapes included. */
export function sizeOf(text: string) {
	return new Blob([JSON.stringify(text)]).size;
}

/**
 * The pages dealt into parts, in order, none heavier than `room` bytes. A page heavier than that on its own goes
 * alone: it is the smallest thing that can be printed.
 */
export function toParts(pages: string[], room = PART_LIMIT) {
	const parts: string[][] = [];
	let part: string[] = [];
	let weight = 0;
	for (const page of pages) {
		const size = sizeOf(page);
		if (part.length && weight + size > room) {
			parts.push(part);
			part = [];
			weight = 0;
		}
		part.push(page);
		weight += size;
	}
	if (part.length) parts.push(part);
	return parts;
}

/** Why the export refused, in plain words. `message` is what the app's own route said, when it said anything. */
export function reasonOf(status: number, message?: string) {
	if (status === 401) return 'You are signed out. Sign in again, then download the PDF.';
	if (status === 413) {
		return 'One page of this report is too big to print. Take a picture off its fullest page and try again.';
	}
	if (status === 504 || status === 408) return 'Printing took too long. Try again.';
	if (status >= 400 && status < 500 && message) return message;
	return FALLBACK;
}

export type PrintOptionsType = {
	/** The page's own styles, sent with every part. */
	styles: string;
	filename: string;
	/** Sends one part's request. The app's own is a POST to the export; a test hands in its own. */
	send?: (body: string) => Promise<Response>;
	/** A part has gone to the printer; `at` is its place among the parts. */
	onstart?: (at: number) => void;
	/** A part's PDF is back. */
	ondone?: (at: number) => void;
};

function post(body: string) {
	return fetch('/api/export/pdf', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body
	});
}

async function printPart(body: string, send: (body: string) => Promise<Response>) {
	let response: Response;
	try {
		response = await send(body);
	} catch (error) {
		console.error('The PDF export could not be reached.', error);
		throw new DownloadError(NO_CONNECTION, true);
	}
	if (response.ok) return new Uint8Array(await response.arrayBuffer());
	const problem = (await response.json().catch(() => undefined)) as
		| { message?: unknown }
		| undefined;
	const message = typeof problem?.message === 'string' ? problem.message : undefined;
	console.error(`The PDF export answered ${response.status}.`, message ?? '');
	// A trip on the server may not happen twice; a refusal (signed out, too big) will.
	const isPassing = response.status >= 500 && response.status !== 504;
	throw new DownloadError(reasonOf(response.status, message), isPassing);
}

/**
 * Prints every part and hands back their PDFs in page order. A few print at a time; a part whose request trips on
 * the server, or never arrives, is asked for once more before the whole download fails.
 */
export async function printParts(
	parts: string[][],
	{ styles, filename, send = post, onstart, ondone }: PrintOptionsType
) {
	const pdfs: Uint8Array[] = [];
	let next = 0;
	// One part failing ends the download: the others take no new part and report nothing more.
	let isBroken = false;

	async function work() {
		while (next < parts.length && !isBroken) {
			const at = next;
			next += 1;
			const body = JSON.stringify({ pages: parts[at].join('\n'), styles, filename });
			onstart?.(at);
			for (let tried = 1; ; tried += 1) {
				try {
					pdfs[at] = await printPart(body, send);
					break;
				} catch (error) {
					const isWorthAnother = error instanceof DownloadError && error.isPassing;
					if (isBroken || !isWorthAnother || tried >= TRIES) {
						isBroken = true;
						throw error;
					}
				}
			}
			if (!isBroken) ondone?.(at);
		}
	}

	await Promise.all(Array.from({ length: Math.min(LANES, parts.length) }, work));
	return pdfs;
}

// The Table of Contents' links (#301). Each line is printed as a link, so the printer draws its box exactly where the
// line is in the page it lays out. Its address is the report link of its page (#216) ending in #page-<n>: the join
// finds those and makes each open page n of the PDF itself, which may be in a part printed apart from the contents.
// A link the join could not make (a page the PDF does not have) still opens that page of the Preview in the app.

/** The address a contents line's link is printed with: `address`, the report link of its page, marked with it. */
export function toPageLink(address: string, page: number) {
	return `${address}#page-${page}`;
}

/** The page a printed link opens, from 1, when it is a contents line's; 0 for any other link (a QR code's). */
export function pageOfLink(address: string) {
	const found = /#page-(\d+)$/.exec(address);
	return found ? Number(found[1]) : 0;
}

/**
 * The parts' PDFs as one, in order, every page with its links, the contents' lines opening their pages. A single
 * part is the whole report already: it is kept as the printer made it, language and tags and all, and only its
 * contents' links are changed. The library that does this is fetched when a PDF is made.
 */
export async function joinPdfs(pdfs: Uint8Array[], filename: string) {
	const { PDFDict, PDFDocument, PDFHexString, PDFName, PDFString } = await import('pdf-lib');
	const isWhole = pdfs.length === 1;
	const whole = isWhole ? await PDFDocument.load(pdfs[0]) : await PDFDocument.create();
	for (const bytes of isWhole ? [] : pdfs) {
		const part = await PDFDocument.load(bytes);
		for (const page of await whole.copyPages(part, part.getPageIndices())) whole.addPage(page);
	}

	const pages = whole.getPages();
	for (const page of pages) {
		for (const ref of page.node.Annots()?.asArray() ?? []) {
			const link = whole.context.lookup(ref);
			if (!(link instanceof PDFDict)) continue;
			const action = link.lookup(PDFName.of('A'));
			if (!(action instanceof PDFDict)) continue;
			// The printer writes an address as a string or as hex.
			const address = action.get(PDFName.of('URI'));
			const isText = address instanceof PDFString || address instanceof PDFHexString;
			const target = isText ? pages[pageOfLink(address.decodeText()) - 1] : undefined;
			if (!target) continue;
			link.delete(PDFName.of('A'));
			// The page opened at its top, at the zoom the reader is at.
			const top = target.getMediaBox().y + target.getHeight();
			link.set(PDFName.of('Dest'), whole.context.obj([target.ref, 'XYZ', null, top, null]));
		}
	}
	whole.setTitle(filename.replace(/\.pdf$/i, ''));
	return whole.save();
}

// Attached PDFs (#327; Justin, 2026-11-24): a PDF in a photo group shows on the Preview as pictures of its pages, but
// the downloaded report gets the PDF's own pages, as sharp and as searchable as the PDF itself. The Preview sends
// each of those spots empty (nothing of the picture rides in the request) and says where it is; once the parts are
// printed and joined, each page of the PDF is put in its spot here, on the device. A PDF whose pages cannot be
// copied (one locked against it) goes in as pictures of its pages instead.

/** A box on a report page, in the page's own pixels (595 by 842), from its top left. */
export type BoxType = { x: number; y: number; width: number; height: number };

/** Where a page of an attached PDF goes: which report page (from 0), its spot there, which PDF and which page (from 0). */
export type PlacementType = { page: number; box: BoxType; source: string; at: number };

/** How the device reads an attached PDF: its bytes, and a page drawn as a JPEG this wide for one it cannot copy. */
export type PdfReaderType = {
	bytes: (source: string) => Promise<Uint8Array>;
	picture: (source: string, page: number, width: number) => Promise<Uint8Array>;
};

/** A shape fitted inside a box, as big as it fits and in the middle of it: how a PDF's page sits in its spot. */
export function containOf(box: BoxType, shape: { width: number; height: number }): BoxType {
	const scale = Math.min(box.width / shape.width, box.height / shape.height);
	const width = shape.width * scale;
	const height = shape.height * scale;
	return {
		x: box.x + (box.width - width) / 2,
		y: box.y + (box.height - height) / 2,
		width,
		height
	};
}

/** A page's turn as its PDF says it is shown (/Rotate), as 0, 90, 180 or 270. */
export function toTurn(angle: number) {
	return (((Math.round(angle / 90) * 90) % 360) + 360) % 360;
}

/**
 * How a PDF's page is drawn to show upright in `fitted` (PDF points, from the bottom left), for a page its PDF turns
 * `turn` degrees clockwise when shown: the corner it is drawn from, its drawn size before the turn, and the turn the
 * library makes (counterclockwise).
 */
export function toDrawing(fitted: BoxType, size: { width: number; height: number }, turn: number) {
	const isSideways = turn === 90 || turn === 270;
	const scale = fitted.width / (isSideways ? size.height : size.width);
	const drawn = { width: size.width * scale, height: size.height * scale };
	const { x, y, width, height } = fitted;
	if (turn === 90) return { x, y: y + height, ...drawn, rotate: -90 };
	if (turn === 180) return { x: x + width, y: y + height, ...drawn, rotate: 180 };
	if (turn === 270) return { x: x + width, y, ...drawn, rotate: 90 };
	return { x, y, ...drawn, rotate: 0 };
}

/**
 * The report with each attached PDF's pages put in their spots. Each PDF is fetched once. One that cannot be fetched
 * fails the download, with words the person can act on; one whose pages cannot be copied goes in as pictures.
 */
export async function placePdfPages(
	pdf: Uint8Array,
	placements: PlacementType[],
	read: PdfReaderType,
	pageWidth = 595
) {
	if (!placements.length) return pdf;
	const { PDFDocument, degrees, rgb } = await import('pdf-lib');
	const report = await PDFDocument.load(pdf);
	const pages = report.getPages();
	const sources = new Map<string, Promise<import('pdf-lib').PDFDocument | undefined>>();

	function sourceOf(address: string) {
		let source = sources.get(address);
		if (!source) {
			source = read.bytes(address).then(
				// A PDF the library cannot open as it is (locked, or written oddly) is drawn as pictures instead.
				(bytes) =>
					PDFDocument.load(bytes)
						.then((source) => (source.getPageCount() ? source : undefined))
						.catch(() => undefined),
				(error) => {
					console.error('An attached PDF could not be fetched.', error);
					throw new DownloadError(
						'An attached PDF could not be fetched for the report. Check the connection and try again.',
						true
					);
				}
			);
			sources.set(address, source);
		}
		return source;
	}

	// Each PDF's pages go in through one copy of it (#295), so what its pages share (a letterhead, a font) is put in
	// the report once, not once a page: the report then weighs about what the PDF does.
	const embeddings = new Map<string, Promise<Map<number, import('pdf-lib').PDFEmbeddedPage>>>();
	function embeddedOf(address: string) {
		let embedded = embeddings.get(address);
		if (!embedded) {
			embedded = sourceOf(address).then(async (source) => {
				const found = new Map<number, import('pdf-lib').PDFEmbeddedPage>();
				const originals = source?.getPages() ?? [];
				const wanted = placements
					.filter((placement) => placement.source === address && originals[placement.at])
					.map((placement) => placement.at);
				const ats = [...new Set(wanted)];
				const boxes = ats.map((at) => {
					const crop = originals[at].getCropBox();
					return {
						left: crop.x,
						bottom: crop.y,
						right: crop.x + crop.width,
						top: crop.y + crop.height
					};
				});
				const pages = await report.embedPages(
					ats.map((at) => originals[at]),
					boxes
				);
				for (const [index, at] of ats.entries()) found.set(at, pages[index]);
				return found;
			});
			embeddings.set(address, embedded);
		}
		return embedded;
	}

	for (const placement of placements) {
		const page = pages[placement.page];
		if (!page) continue;
		const scale = page.getWidth() / pageWidth;
		const box = {
			x: placement.box.x * scale,
			y: page.getHeight() - (placement.box.y + placement.box.height) * scale,
			width: placement.box.width * scale,
			height: placement.box.height * scale
		};
		const source = await sourceOf(placement.source);
		const original = source?.getPages()[placement.at];
		const embedded = (await embeddedOf(placement.source)).get(placement.at);
		if (original && embedded) {
			const turn = toTurn(original.getRotation().angle);
			const shown =
				turn === 90 || turn === 270
					? { width: embedded.height, height: embedded.width }
					: { width: embedded.width, height: embedded.height };
			const fitted = containOf(box, shown);
			page.drawRectangle({ ...fitted, color: rgb(1, 1, 1) });
			const { rotate, ...drawing } = toDrawing(fitted, embedded, turn);
			page.drawPage(embedded, { ...drawing, rotate: degrees(rotate) });
			continue;
		}
		const width = Math.round(Math.min(2400, Math.max(600, placement.box.width * 3)));
		const image = await report.embedJpg(
			await read.picture(placement.source, placement.at + 1, width)
		);
		page.drawImage(image, containOf(box, { width: image.width, height: image.height }));
	}
	return report.save();
}
