// Files (glossary "File", "Attachment"; ADR 0004; spec #179 "Files" and "Tables"; #187): one row per file kept in
// the private bucket. It says what the file is for (a table, a column and, once it exists, the row), where it lies
// in the bucket, its type, size and pixel size, the time and place a photo was taken with where those came from,
// and who sent it. Rows of records keep only the app's address of the file (`/files/<id>`), never the file.
import { doublePrecision, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';
import { organizationPolicy } from './policy';
import { rowColumns } from './rows';

export const file = pgTable(
	'file',
	{
		...rowColumns(),
		/** What it is for: the table and column of the row that shows it (`customer`, `logo`). */
		forTable: text('for_table').notNull(),
		forColumn: text('for_column').notNull(),
		/** The row it is for; empty while that row is still being made on the device. */
		forId: uuid('for_id'),
		/** Where it lies in the bucket: `<organization id>/<file id>.<ending>`. */
		path: text('path').notNull(),
		/** The name it was picked with. */
		name: text('name').default('').notNull(),
		type: text('type').notNull(),
		size: integer('size').notNull(),
		width: integer('width'),
		height: integer('height'),
		/** When and where a photo was taken (ADR 0004), and whether that came from the file or the device. */
		takenAt: timestamp('taken_at', { withTimezone: true }),
		latitude: doublePrecision('latitude'),
		longitude: doublePrecision('longitude'),
		takenFrom: text('taken_from').default('').notNull(),
		uploadedBy: uuid('uploaded_by').references(() => user.id, { onDelete: 'set null' })
	},
	() => [organizationPolicy('file')]
).enableRLS();
