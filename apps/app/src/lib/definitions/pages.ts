// Report pages of the Report Generator's definition sheet (Google Sheet
// 1oLakDXDeEINBs0B3KSkcyM1131YnuHtAKEk6l7ClT8k), moved to code on 2026-10-05 (#48, #93).
// Edit the rows here; the sheet is a frozen reference. Field meanings are documented on
// the row type in ./types.ts.
import type { PageDefinitionType } from './types';

export const pages = [
	{
		id: 'PAGE-001',
		order: 1,
		required: true,
		page: 'Cover',
		variant: 'full',
		section: ['main'],
		notes:
			'This is a cover photo that includes some branding and some key data that gives an overall snapshot of the report. e.g. it will have report type, report title, carrier name, project owner name, org logo, facility name, dates dervived from the timelog, and the client name and client logo.',
		reference: ''
	},
	{
		id: 'PAGE-002',
		order: 2,
		required: true,
		page: 'Table of Contents',
		variant: 'toc',
		section: ['header', 'main', 'footer'],
		notes:
			'Auto generated table of contents based on a combination of required pages and optional panels. Users will be able to toggle the optional panels on or off. There will also be subsection pages created when photo-based pages exceed their per-page limit.',
		reference: ''
	},
	{
		id: 'PAGE-003',
		order: 3,
		required: true,
		page: 'Introduction',
		variant: 'photo',
		section: ['header', 'main', 'footer'],
		notes:
			'This is a quick intro page that uses the data entered from the panels to create a summary. it should also use a single photo showing the carrier photo that the user uploaded',
		reference: ''
	},
	{
		id: 'PAGE-004',
		order: 4,
		required: true,
		page: 'Project Report',
		variant: 'template',
		section: ['header', 'main', 'footer'],
		notes:
			'This page encompasses the personnel, cargo description, and cargo inspection pages (multi-page)',
		reference: ''
	},
	{
		id: 'PAGE-005',
		order: 5,
		required: true,
		page: 'Personnel in Attendance',
		variant: 'team',
		section: ['header', 'main', 'footer'],
		notes:
			'This section shows the "project owner" and "assigned team members" in a card style with different data for each e.g. photo, name, title, phone, email. the project owner will have a special badge to signify they are the main point of contact for that particular project.',
		reference: ''
	},
	{
		id: 'PAGE-006',
		order: 6,
		required: true,
		page: 'Cargo Description',
		variant: 'photo',
		section: ['header', 'main', 'footer'],
		notes:
			'This pulls in the project title and project description along with a full page photo the user uploads of the item list. later on this will be a table view of items we will create in a future release.',
		reference: 'PAGE-007'
	},
	{
		id: 'PAGE-007',
		order: 7,
		required: true,
		page: 'Cargo Condition Inspection',
		variant: 'photo',
		section: ['header', 'main', 'footer'],
		notes:
			'This page and all of the pages that reference this page id are what i\'m referring to as "photo" or "custom" pages. These are all similar in nature, the only thing special about them is that there data can change out, the number of photos per page can change out from 1, 2, 4, 6, 8, and lastly they can be multipage based on the number of photos the user uploads.',
		reference: ''
	},
	{
		id: 'PAGE-008',
		order: 8,
		required: true,
		page: 'Time Log',
		variant: 'list',
		section: ['header', 'main', 'footer'],
		notes:
			'The timelog is dynamic and can have as many days, times, and time activity that the user writes.',
		reference: ''
	},
	{
		id: 'PAGE-009',
		order: 9,
		required: true,
		page: 'Cargo Operations',
		variant: 'photo',
		section: ['header', 'main', 'footer'],
		notes: '',
		reference: 'PAGE-007'
	},
	{
		id: 'PAGE-010',
		order: 10,
		required: false,
		page: 'Cargo Damages',
		variant: 'photo',
		section: ['header', 'main', 'footer'],
		notes: 'see reference',
		reference: 'PAGE-007'
	},
	{
		id: 'PAGE-011',
		order: 11,
		required: false,
		page: 'Cargo Storage',
		variant: 'photo',
		section: ['header', 'main', 'footer'],
		notes: 'see reference',
		reference: 'PAGE-007'
	},
	{
		id: 'PAGE-012',
		order: 12,
		required: false,
		page: 'Cargo Trailer Securement',
		variant: 'photo',
		section: ['header', 'main', 'footer'],
		notes: 'see reference',
		reference: 'PAGE-007'
	},
	{
		id: 'PAGE-013',
		order: 13,
		required: false,
		page: 'Ships Particulars',
		variant: 'photo',
		section: ['header', 'main', 'footer'],
		notes: 'see reference',
		reference: 'PAGE-007'
	},
	{
		id: 'PAGE-014',
		order: 14,
		required: false,
		page: 'Ships Certifications',
		variant: 'photo',
		section: ['header', 'main', 'footer'],
		notes: 'see reference',
		reference: 'PAGE-007'
	},
	{
		id: 'PAGE-015',
		order: 15,
		required: false,
		page: 'Barge Information',
		variant: 'photo',
		section: ['header', 'main', 'footer'],
		notes: 'see reference',
		reference: 'PAGE-007'
	},
	{
		id: 'PAGE-016',
		order: 16,
		required: false,
		page: 'Lifting Plan',
		variant: 'photo',
		section: ['header', 'main', 'footer'],
		notes: 'see reference',
		reference: 'PAGE-007'
	},
	{
		id: 'PAGE-017',
		order: 17,
		required: false,
		page: 'Lifting Gear',
		variant: 'photo',
		section: ['header', 'main', 'footer'],
		notes: 'see reference',
		reference: 'PAGE-007'
	},
	{
		id: 'PAGE-018',
		order: 18,
		required: false,
		page: 'Stowage Plan',
		variant: 'photo',
		section: ['header', 'main', 'footer'],
		notes: 'see reference',
		reference: 'PAGE-007'
	},
	{
		id: 'PAGE-019',
		order: 19,
		required: false,
		page: 'Post-Discharge Inspection',
		variant: 'photo',
		section: ['header', 'main', 'footer'],
		notes: 'see reference',
		reference: 'PAGE-007'
	},
	{
		id: 'PAGE-020',
		order: 20,
		required: true,
		page: 'Disclaimer',
		variant: 'template',
		section: ['header', 'main', 'footer'],
		notes:
			'This is custom disclaimer template that never changes. the only dynamic piece is the part that comes after the disclaimer where it will be a photo of the "project owner", with a special message that includes their photo, name, title, phone number, and email similar to a custom html email signature.',
		reference: ''
	}
] as const satisfies readonly PageDefinitionType[];

export type PageIdType = (typeof pages)[number]['id'];
export type PageRowType = (typeof pages)[number];
