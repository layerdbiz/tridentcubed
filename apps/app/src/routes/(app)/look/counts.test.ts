// What a project holds, counted by kind (#350): the photos, videos and PDFs in its photo groups and the files
// attached to its Items panel, as the lists, the cards, the board, its page and each photo group show them.
import { describe, expect, it } from 'vite-plus/test';
import { countsOf, countsOfPhotos, totalOf } from './counts';
import {
	groupOf,
	newPanel,
	type AttachmentType,
	type PanelType,
	type PhotoType
} from './look.data';

function photo(kind?: PhotoType['kind']): PhotoType {
	return { id: crypto.randomUUID(), src: '/files/a', description: '', ...(kind ? { kind } : {}) };
}

function file(name: string, kind: AttachmentType['kind'] = 'file'): AttachmentType {
	return {
		id: crypto.randomUUID(),
		name,
		src: '/files/b',
		kind,
		layout: 4 as AttachmentType['layout']
	};
}

function photoPanel(...groups: PhotoType[][]): PanelType {
	const panel = newPanel(1);
	panel.groups = groups.map((photos) => ({ ...groupOf('Stage'), photos }));
	return panel;
}

describe('countsOfPhotos', () => {
	it('counts a photo group by kind', () => {
		expect(countsOfPhotos([photo(), photo(), photo('pdf'), photo('video')])).toEqual({
			photo: 2,
			video: 1,
			pdf: 1,
			sheet: 0
		});
	});

	it('holds nothing for an empty group', () => {
		expect(totalOf(countsOfPhotos([]))).toBe(0);
	});
});

describe('countsOf', () => {
	it('adds up every photo group of every photo panel', () => {
		const panels = [
			photoPanel([photo(), photo('video')], [photo(), photo('pdf')]),
			photoPanel([photo()])
		];
		expect(countsOf(panels)).toEqual({ photo: 3, video: 1, pdf: 1, sheet: 0 });
	});

	it('leaves out what is left out of the report: a switched-off panel or group', () => {
		const off = photoPanel([photo(), photo()]);
		off.isEnabled = false;
		const on = photoPanel([photo()], [photo('pdf')]);
		on.groups[1].isEnabled = false;
		expect(countsOf([off, on])).toEqual({ photo: 1, video: 0, pdf: 0, sheet: 0 });
	});

	it('counts the Items panel files: a photo, a PDF, and a spreadsheet of any kind', () => {
		const items = newPanel(1);
		items.kind = 'items';
		items.attachments = [
			file('list.jpg', 'photo'),
			file('Manifest.PDF'),
			file('packing list.xlsx'),
			file('cargo.csv'),
			file('notes.docx')
		];
		expect(countsOf([items])).toEqual({ photo: 1, video: 0, pdf: 1, sheet: 2 });
	});

	it('counts the item list read from a spreadsheet file, but not rows pasted or the sample list', () => {
		const items = newPanel(1);
		items.kind = 'items';
		items.grid = { name: 'Packing list.xlsx', cells: [['Qty', 'Description']] };
		const pasted = newPanel(2);
		pasted.kind = 'items';
		pasted.grid = { name: '', cells: [['Qty', 'Description']] };
		const sample = newPanel(3);
		sample.kind = 'items';
		sample.grid = { name: 'Sample data', cells: [['Qty', 'Description']] };
		expect(countsOf([items, pasted, sample])).toEqual({ photo: 0, video: 0, pdf: 0, sheet: 1 });
	});

	it('holds nothing for a project with no panels yet', () => {
		expect(totalOf(countsOf([]))).toBe(0);
	});
});
