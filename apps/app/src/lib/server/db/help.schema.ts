// The Help text (glossary) of every input (#299): one row per input, found by its key, with the input's label (so
// whoever edits a row can tell which input it is) and the text its ? opens. The app never holds the text itself:
// a change to a row reaches everyone the next time they open a page, with no new version of the app. The rows load
// with the lists (`organization` scope); only an Admin changes them (the one permission check), and until an admin
// screen comes they are changed in the database.
import { pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { organizationPolicy } from './policy';
import { rowColumns } from './rows';

export const helpText = pgTable(
	'help_text',
	{
		...rowColumns(),
		/** The input it explains, as the screens name it: `project.title`, `customer.code`, `particular.flag`. */
		key: text('key').notNull(),
		label: text('label').default('').notNull(),
		text: text('text').default('').notNull()
	},
	(table) => [
		uniqueIndex('help_text_key_idx').on(table.organizationId, table.key),
		organizationPolicy('help_text')
	]
).enableRLS();
