// Files (glossary "File", "Attachment"; ADR 0004; spec #179 "Files" and "Tables"; #187): one row per file kept in
// the private bucket. It says what the file is for (a table, a column and, once it exists, the row), where it lies
// in the bucket, its type, size and pixel size, the time and place a photo was taken with where those came from,
// the original's full field list (#292), the untouched file a device sent while it is kept (#294), the original as it
// arrived and whether its metadata came across (#343), and who sent it. Rows of records keep only the app's address of the file
// (`/files/<id>`), never the file.
import {
	doublePrecision,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid
} from 'drizzle-orm/pg-core';
import type { FieldListType } from '#lib/files/files.schema.js';
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
		/**
		 * Every metadata field of the file the User picked, as the device read it (Justin, 2026-11-24, on #281): the
		 * stored copy holds its EXIF, XMP and ICC too, and this keeps what it has no slot for (IPTC, PNG text).
		 */
		metadata: jsonb('metadata').$type<FieldListType>(),
		/**
		 * Where the untouched file a device sent lies while it is still in storage (#294): empty once the server's copy
		 * checked out and the untouched file was deleted, kept when the copy could not carry every field.
		 */
		originalPath: text('original_path'),
		/**
		 * The file the User picked, as it arrived (#343): its type, size and pixel size, beside the type, size and pixel
		 * size of the file kept above (a WebP after a conversion), so the photo's Details say how much smaller it got.
		 * Empty for a file kept before #343; the pixel size stays empty until something could read it.
		 */
		originalType: text('original_type'),
		originalSize: integer('original_size'),
		originalWidth: integer('original_width'),
		originalHeight: integer('original_height'),
		/** #343: whether every metadata field of the original came across (`CARRIED`); '' when not known. */
		metadataCarried: text('metadata_carried').default('').notNull(),
		uploadedBy: uuid('uploaded_by').references(() => user.id, { onDelete: 'set null' })
	},
	() => [organizationPolicy('file')]
).enableRLS();
