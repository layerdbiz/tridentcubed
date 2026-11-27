// What a project holds, counted by kind (#350): the photos, videos and PDFs in its photo groups (#327), and the files
// attached to its Items panel and the spreadsheet its item list was read from (#242), so the lists, the cards, the board, the project's page and each photo group can show
// at a glance how many of each it has, each kind as its own coloured icon and a number (file-counts.svelte). What is
// left out of the report is left out of the counts: a switched-off panel or group.
// Justin, 2026-11-26 (on the File Count Icons prototype): "PDF should be red. Spreadsheet should be green. Video
// should be purple. Picture should be blue." 2026-11-27: everywhere but the report's cover.
import { ATTACHMENT_ICONS } from '#lib/files/files.schema.js';
import { isPdfAttachment, type AttachmentType, type PanelType, type PhotoType } from './look.data';

export type FileKindType = 'photo' | 'video' | 'pdf' | 'sheet';
export type CountType = Record<FileKindType, number>;

/**
 * Each kind in the order it shows: its icon, its colour on white (`tone`) and over a photo (`toneOnPhoto`), and what
 * one and many are called. The photo, PDF and video icons are the ones on their tiles (#327, #349).
 */
export const FILE_KINDS: {
	kind: FileKindType;
	icon: string;
	tone: string;
	toneOnPhoto: string;
	one: string;
	many: string;
}[] = [
	{
		kind: 'photo',
		icon: ATTACHMENT_ICONS.photo,
		tone: 'text-blue-500',
		toneOnPhoto: 'text-blue-400',
		one: 'photo',
		many: 'photos'
	},
	{
		kind: 'video',
		icon: ATTACHMENT_ICONS.video,
		tone: 'text-purple-500',
		toneOnPhoto: 'text-purple-400',
		one: 'video',
		many: 'videos'
	},
	{
		kind: 'pdf',
		icon: ATTACHMENT_ICONS.pdf,
		tone: 'text-red-500',
		toneOnPhoto: 'text-red-400',
		one: 'PDF',
		many: 'PDFs'
	},
	{
		kind: 'sheet',
		icon: 'icon-[mdi--file-excel]',
		tone: 'text-green-600',
		toneOnPhoto: 'text-green-400',
		one: 'spreadsheet',
		many: 'spreadsheets'
	}
];

// The endings of a spreadsheet attached as the item list (#188, #242): Excel and its kin, and the plain text tables.
const SHEET_ENDINGS = ['xlsx', 'xls', 'xlsm', 'xlsb', 'ods', 'numbers', 'csv', 'tsv'];

function emptyCount(): CountType {
	return { photo: 0, video: 0, pdf: 0, sheet: 0 };
}

/** How many of everything there is. */
export function totalOf(count: CountType) {
	return count.photo + count.video + count.pdf + count.sheet;
}

function addPhotos(count: CountType, photos: readonly Pick<PhotoType, 'kind'>[]) {
	for (const photo of photos) count[photo.kind ?? 'photo'] += 1;
}

function isSheet(name: string) {
	return SHEET_ENDINGS.includes(name.split('.').pop()?.toLowerCase() ?? '');
}

function addFile(count: CountType, file: Pick<AttachmentType, 'kind' | 'name'>) {
	if (file.kind === 'photo') count.photo += 1;
	else if (isPdfAttachment(file)) count.pdf += 1;
	else if (isSheet(file.name)) count.sheet += 1;
}

/** One photo group's photos, PDFs and videos. */
export function countsOfPhotos(photos: readonly Pick<PhotoType, 'kind'>[]): CountType {
	const count = emptyCount();
	addPhotos(count, photos);
	return count;
}

/**
 * Everything in a project's switched-on panels: each switched-on photo group, the Items panel's files, and the
 * spreadsheet file its item list was read from (rows pasted in, or the sample list, are no file).
 */
export function countsOf(panels: readonly PanelType[]): CountType {
	const count = emptyCount();
	for (const panel of panels) {
		if (!panel.isEnabled) continue;
		for (const group of panel.groups) if (group.isEnabled) addPhotos(count, group.photos);
		for (const file of panel.attachments ?? []) addFile(count, file);
		if (panel.grid && isSheet(panel.grid.name)) count.sheet += 1;
	}
	return count;
}
