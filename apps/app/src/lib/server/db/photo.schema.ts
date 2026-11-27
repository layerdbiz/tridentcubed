// A photo panel's photo groups and their photos (spec #179 "Tables", glossary "Photo Group", "Photo", "Layout";
// #189). A group belongs to its panel and a photo to its group, each in order. A photo keeps the app's address of
// its file (`/files/<id>`); the time and place it was taken are kept on the file row (ADR 0004).
//
// Both carry `project_id`, as every row inside a project does, so they load when the project opens, the freeze of
// a Sent project reaches them and deleting the project sends them to the Trash (#186). Row Level Security keeps them
// to the acting organization.
import {
	boolean,
	doublePrecision,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	uuid
} from 'drizzle-orm/pg-core';
import { DEFAULT_LAYOUT } from '../../report/report.constants';
import { organizationPolicy } from './policy';
import { panel, project } from './project.schema';
import { rowColumns } from './rows';

function words(name: string) {
	return text(name).default('').notNull();
}

function projectId() {
	return uuid('project_id')
		.notNull()
		.references(() => project.id, { onDelete: 'cascade' });
}

/** A photo panel's groups in order: a title, a description, how many photos a report page holds, and its switch. */
export const photoGroup = pgTable(
	'photo_group',
	{
		...rowColumns(),
		projectId: projectId(),
		panelId: uuid('panel_id')
			.notNull()
			.references(() => panel.id, { onDelete: 'cascade' }),
		position: integer('position').default(0).notNull(),
		title: words('title'),
		description: words('description'),
		/** Photos per report page: 1, 2, 4, 6 or 8. */
		layout: integer('layout').default(DEFAULT_LAYOUT).notNull(),
		/** Switched off, it keeps what it holds and leaves the report (#215). */
		isEnabled: boolean('is_enabled').default(true).notNull(),
		/** #295: a grid picked on its own, columns by rows ("3x2"); nothing when a per-page button is picked. */
		grid: words('grid'),
		/** #295: Auto, every attachment on one page (up to 100), filling it. */
		isAuto: boolean('is_auto').default(false).notNull(),
		/** #295: the shape of its spots under Fit: free (each its own), 16:9, 9:16, 1:1 or 4:3. */
		ratio: text('ratio').default('4:3').notNull(),
		/** #295: fill, the spots fill the page; fit, they keep the ratio and the picture shows whole. */
		fit: text('fit').default('fill').notNull()
	},
	(table) => [
		index('photo_group_project_idx').on(table.projectId),
		organizationPolicy('photo_group')
	]
).enableRLS();

/**
 * A group's photos in order, and since #327 its PDFs and videos (glossary "Attachment"): the file's address, what the photo shows and how it is framed in its spot in the report
 * (#312, glossary "Crop": how far in, 1 to 5, and the point of the photo at the middle of its box, 0 to 1 across and
 * down; nothing for the whole photo). The crop never changes the file.
 */
export const photo = pgTable(
	'photo',
	{
		...rowColumns(),
		projectId: projectId(),
		groupId: uuid('group_id')
			.notNull()
			.references(() => photoGroup.id, { onDelete: 'cascade' }),
		position: integer('position').default(0).notNull(),
		file: words('file'),
		description: words('description'),
		crop: jsonb('crop').$type<{ x: number; y: number; zoom: number }>(),
		/** #327: a photo, a PDF or a video. `file` is the picture that shows (a PDF's first page, a video's thumbnail). */
		kind: text('kind').default('photo').notNull(),
		/** #327: the PDF or the video itself, by its app address; nothing for a photo. */
		source: words('source'),
		/** #327: how many pages the PDF has; 0 for anything else. */
		pageCount: integer('page_count').default(0).notNull(),
		/** #327: how long the video runs, in seconds; 0 for anything else. */
		duration: doublePrecision('duration').default(0).notNull(),
		/**
		 * #295: how it is edited for the report, as numbers (glossary "Edit"): quarter turns, a mirror, a straighten in
		 * degrees, the ratio picked and the frame that prints; a PDF's pages edited one by one under `pages`. Nothing for
		 * none. The file never changes.
		 */
		edit: jsonb('edit').$type<Record<string, unknown>>(),
		/** #295: popped out of its stage's pages onto its own, this many to a page; 0 stays in the stage's pages. */
		ownLayout: integer('own_layout').default(0).notNull()
	},
	(table) => [index('photo_project_idx').on(table.projectId), organizationPolicy('photo')]
).enableRLS();
