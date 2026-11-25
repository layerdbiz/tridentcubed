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

/** A box on a page, as shares of the page's width and height from its top left corner: the same at any zoom. */
export type BoxType = { x: number; y: number; width: number; height: number };

/** Where `inner` sits on `page`, both as the screen has them, as shares of the page: what the page prints at. */
export function boxIn(page: BoxType, inner: BoxType): BoxType {
	return {
		x: (inner.x - page.x) / page.width,
		y: (inner.y - page.y) / page.height,
		width: inner.width / page.width,
		height: inner.height / page.height
	};
}

/**
 * A link from one page of the PDF to another: a line of the Table of Contents to the page it names (#301). `on` and
 * `to` count the pages from 0, the cover first.
 */
export type PageLinkType = { on: number; to: number; box: BoxType };

/**
 * The parts' PDFs as one, in order, every page with its links, and the links between its pages added. The pages
 * print in parts, so a contents line on the second page may name a page another part printed: those links can only
 * go in once the parts are one. A single part with no links to add is the whole report already and comes back as
 * it is. The library that joins them is fetched only when there is something to do.
 */
export async function joinPdfs(pdfs: Uint8Array[], filename: string, links: PageLinkType[] = []) {
	if (pdfs.length === 1 && !links.length) return pdfs[0];
	const { PDFDocument } = await import('pdf-lib');
	const whole = await PDFDocument.create();
	for (const bytes of pdfs) {
		const part = await PDFDocument.load(bytes);
		for (const page of await whole.copyPages(part, part.getPageIndices())) whole.addPage(page);
	}
	const pages = whole.getPages();
	for (const { on, to, box } of links) {
		const page = pages[on];
		const target = pages[to];
		if (!page || !target) continue;
		// A PDF measures from the bottom left, in points.
		const sheet = page.getMediaBox();
		const left = sheet.x + box.x * sheet.width;
		const top = sheet.y + (1 - box.y) * sheet.height;
		const link = whole.context.obj({
			Type: 'Annot',
			Subtype: 'Link',
			Rect: [left, top - box.height * sheet.height, left + box.width * sheet.width, top],
			Border: [0, 0, 0],
			// The page opened at its top, at the zoom the reader is at.
			Dest: [target.ref, 'XYZ', null, target.getMediaBox().y + target.getHeight(), null]
		});
		page.node.addAnnot(whole.context.register(link));
	}
	whole.setTitle(filename.replace(/\.pdf$/i, ''));
	return whole.save();
}
