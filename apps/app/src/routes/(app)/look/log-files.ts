// The files an imported time log may come in (#359), read to their words on the device, which then go through the
// same check as pasted text (log-import.ts). Pasted text, a text file, a Word file (.docx), a PDF with text in it
// and a spreadsheet are read here. A scanned PDF and a photo of a handwritten log hold no text to read: their writing
// needs reading (OCR), which is not built, so the person is told to type or paste it.
import { readFile as readSheet } from './spreadsheet';

/** The words a file holds, or why none could be read. */
export type LogFileType = { text: string } | { reason: string };

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decode(text: string) {
	return text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (whole, name: string) => {
		if (name[0] === '#')
			return String.fromCodePoint(
				name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1))
			);
		return ENTITIES[name] ?? whole;
	});
}

// The words of a piece of a Word document: the text of its runs, a run's tab and line break as written, a
// paragraph's end a new line. Nothing else counts: the spaces between the file's own tags, text struck out with
// tracked changes (written as deleted text) and the codes of fields are not words of the document.
const PIECES = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:(?:br|cr)\b[^>]*\/>|<\/w:p>/g;

function runsOf(xml: string) {
	let text = '';
	for (const [piece, words] of xml.matchAll(PIECES)) {
		if (words !== undefined) text += words;
		else if (piece === '<w:tab/>') text += '\t';
		else text += '\n';
	}
	return text;
}

/** The words of a Word file's document.xml: a line per paragraph, a table's row as one line of its cells. */
export function wordText(xml: string) {
	const rows = xml.replace(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g, (_, row: string) => {
		const cells = [...row.matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g)].map(([, cell]) =>
			runsOf(cell)
				.replace(/\s*\n\s*/g, ' ')
				.trim()
		);
		return `<w:t>${cells.join('\t')}</w:t></w:p>`;
	});
	return decode(runsOf(rows));
}

/** One piece of a PDF page's text, where it sits on the page (PDF.js gives its place as a transform). */
export type PdfWordsType = {
	str: string;
	x: number;
	y: number;
	width: number;
	height: number;
	hasEOL: boolean;
};

/**
 * A PDF page's text as lines: a new line where the text moves down, an empty line where it moves down more than a
 * line's height (a new paragraph), a space where words on a line stand apart.
 */
export function pdfLines(items: PdfWordsType[]) {
	let text = '';
	let last: PdfWordsType | undefined;
	for (const item of items) {
		if (last && item.str) {
			const drop = last.y - item.y;
			const height = Math.max(2, last.height);
			if (drop > height * 1.9) text = `${text.replace(/\n*$/, '')}\n\n`;
			else if (!last.hasEOL && Math.abs(drop) > height / 2) text += '\n';
			else if (item.x > last.x + last.width + 1 && !/\s$/.test(text) && !/^\s/.test(item.str))
				text += ' ';
		}
		text += item.str;
		if (item.hasEOL) text += '\n';
		if (item.str) last = item;
	}
	return text.replace(/[ \t]+\n/g, '\n').trim();
}

const PICTURES = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'gif', 'tif', 'tiff', 'bmp'];
const SHEETS = ['xlsx', 'xls', 'xlsm', 'xlsb', 'ods', 'numbers', 'csv', 'tsv', 'tab'];
const TEXTS = ['txt', 'text', 'md', 'log'];

export const HANDWRITING =
	'A photo of a handwritten log needs its writing read, which the app does not do yet. Type or paste it instead.';
const SCANNED =
	'This PDF is a picture of the pages, with no text in it, so its writing needs reading, which the app does not do yet. Type or paste it instead.';
const OLD_WORD =
	'This is an older Word file. Save it as .docx in Word, or copy its text and paste it.';
const UNKNOWN = 'The app cannot read this kind of file. Copy its text and paste it.';

function kindOf(file: File) {
	return file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
}

async function readWord(file: File): Promise<LogFileType> {
	// The spreadsheet reader holds a reader of zip files, which a .docx is: no other library is loaded.
	const { CFB } = await import('xlsx');
	const zip = CFB.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
	const document = CFB.find(zip, '/word/document.xml');
	if (!document) return { reason: 'This Word file could not be read. Copy its text and paste it.' };
	return { text: wordText(new TextDecoder().decode(document.content)) };
}

async function readPdfText(file: File): Promise<LogFileType> {
	const { openPdf } = await import('#lib/pdf/pdf.utils.js');
	let pdf;
	try {
		pdf = await openPdf(new Uint8Array(await file.arrayBuffer()));
	} catch (error) {
		return { reason: error instanceof Error ? error.message : 'This PDF could not be read.' };
	}
	try {
		const pages: string[] = [];
		for (let number = 1; number <= pdf.numPages; number += 1) {
			const page = await pdf.getPage(number);
			const content = await page.getTextContent();
			const items: PdfWordsType[] = [];
			for (const item of content.items)
				if ('str' in item)
					items.push({
						str: item.str,
						x: item.transform[4],
						y: item.transform[5],
						width: item.width,
						height: item.height,
						hasEOL: item.hasEOL
					});
			pages.push(pdfLines(items));
			page.cleanup();
		}
		const text = pages.join('\n\n').trim();
		return text ? { text } : { reason: SCANNED };
	} finally {
		void pdf.loadingTask.destroy();
	}
}

/** A chosen file's words, for the check step; or, for a file whose words cannot be read, why not. */
export async function readLogFile(file: File): Promise<LogFileType> {
	const kind = kindOf(file);
	if (PICTURES.includes(kind) || file.type.startsWith('image/')) return { reason: HANDWRITING };
	if (kind === 'pdf' || file.type === 'application/pdf') return readPdfText(file);
	if (kind === 'docx') return readWord(file);
	if (kind === 'doc') return { reason: OLD_WORD };
	if (SHEETS.includes(kind)) {
		const rows = await readSheet(file).catch(() => undefined);
		if (rows) return { text: rows.map((row) => row.join('\t')).join('\n') };
	}
	if (TEXTS.includes(kind) || file.type.startsWith('text/') || kind === 'csv' || kind === 'tsv')
		return { text: new TextDecoder().decode(await file.arrayBuffer()).replace(/^﻿/, '') };
	return { reason: UNKNOWN };
}
