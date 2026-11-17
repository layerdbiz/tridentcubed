// A photo panel's photo groups and their photos (spec #179 "Tables", glossary "Photo Group", "Photo", "Layout";
// #189). A group belongs to its panel and a photo to its group, each in order. A photo keeps the app's address of
// its file (`/files/<id>`); the time and place it was taken are kept on the file row (ADR 0004).
//
// Both carry `project_id`, as every row inside a project does, so they load when the project opens, the freeze of
// a Sent project reaches them and deleting the project sends them to the Trash (#186). Row Level Security keeps them
// to the acting organization.
import { index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
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

/** A photo panel's groups in order: a title, a description and how many photos a report page holds. */
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
		layout: integer('layout').default(4).notNull()
	},
	(table) => [
		index('photo_group_project_idx').on(table.projectId),
		organizationPolicy('photo_group')
	]
).enableRLS();

/** A group's photos in order: the file's address and what the photo shows. */
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
		description: words('description')
	},
	(table) => [index('photo_project_idx').on(table.projectId), organizationPolicy('photo')]
).enableRLS();
