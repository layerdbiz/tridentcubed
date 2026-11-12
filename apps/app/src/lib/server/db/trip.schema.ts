// What the Transport Mode, Items and Time Log panels hold (spec #179 "Tables", stories 54 to 56 and 58; #188): the
// trip's stops in order, the item rows and the photos or spreadsheet attached to them, and the time log's days and
// their entries. A stop names its Transport Mode and Facility by id, so renaming one shows on every stop that uses it
// without rewriting the stop. A stop's leg is the id the panel groups its stops by (legs.ts); the mode is the one
// picked before a transport is.
//
// Like every row inside a project, each carries `project_id` (project.schema.ts), however deep it sits, so it loads
// with its project, the freeze of a Sent project reaches it and deleting the project sends it to the Trash. A file is
// never in a row: an attachment keeps the app's address of it (`/files/<id>`, #187). Row Level Security keeps every
// table to the acting organization.
import { boolean, index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { organizationPolicy } from './policy';
import { panel, project } from './project.schema';
import { rowColumns } from './rows';
import { facility, transport } from './transport.schema';

function words(name: string) {
	return text(name).default('').notNull();
}

function projectId() {
	return uuid('project_id')
		.notNull()
		.references(() => project.id, { onDelete: 'cascade' });
}

function panelId() {
	return uuid('panel_id')
		.notNull()
		.references(() => panel.id, { onDelete: 'cascade' });
}

function position() {
	return integer('position').default(0).notNull();
}

/** One facility of the trip, in trip order: its point on its leg, the leg, and what moved the items there. */
export const stop = pgTable(
	'stop',
	{
		...rowColumns(),
		projectId: projectId(),
		panelId: panelId(),
		position: position(),
		/** Start, Stop or End; none until a transport or facility is picked. */
		point: words('point'),
		/** The leg it is on: every stop of one transport shares it. */
		leg: words('leg'),
		transportId: uuid('transport_id').references(() => transport.id),
		facilityId: uuid('facility_id').references(() => facility.id),
		/** The transport mode picked for the leg, before a transport is (Vessel, Truck ...). */
		mode: words('mode'),
		/** A stop beyond the trip's own Start, Stop and End. */
		isExtra: boolean('is_extra').default(false).notNull()
	},
	(table) => [index('stop_project_idx').on(table.projectId), organizationPolicy('stop')]
).enableRLS();

/** One row of the Items panel: how many and what. */
export const item = pgTable(
	'item',
	{
		...rowColumns(),
		projectId: projectId(),
		panelId: panelId(),
		position: position(),
		quantity: words('quantity'),
		description: words('description')
	},
	(table) => [index('item_project_idx').on(table.projectId), organizationPolicy('item')]
).enableRLS();

/** A photo of the item list, or the spreadsheet itself, attached to the Items panel. */
export const itemAttachment = pgTable(
	'item_attachment',
	{
		...rowColumns(),
		projectId: projectId(),
		panelId: panelId(),
		position: position(),
		/** The file's own name, as picked. */
		name: words('name'),
		/** The app's address of the file (`/files/<id>`). */
		file: words('file'),
		/** `photo` prints on the report; `file` prints its name. */
		kind: text('kind', { enum: ['photo', 'file'] })
			.default('photo')
			.notNull()
	},
	(table) => [
		index('item_attachment_project_idx').on(table.projectId),
		organizationPolicy('item_attachment')
	]
).enableRLS();

/** A day of the Time Log, in order. Its date (YYYY-MM-DD) is what the report's dates read. */
export const timeLogDay = pgTable(
	'time_log_day',
	{
		...rowColumns(),
		projectId: projectId(),
		panelId: panelId(),
		position: position(),
		date: words('date')
	},
	(table) => [
		index('time_log_day_project_idx').on(table.projectId),
		organizationPolicy('time_log_day')
	]
).enableRLS();

/** One entry of a Time Log day, in order: a time on the 24-hour clock and what happened. */
export const timeLogEntry = pgTable(
	'time_log_entry',
	{
		...rowColumns(),
		projectId: projectId(),
		dayId: uuid('day_id')
			.notNull()
			.references(() => timeLogDay.id, { onDelete: 'cascade' }),
		position: position(),
		time: words('time'),
		activity: words('activity')
	},
	(table) => [
		index('time_log_entry_project_idx').on(table.projectId),
		organizationPolicy('time_log_entry')
	]
).enableRLS();
