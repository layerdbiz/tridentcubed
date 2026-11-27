// Email signature picks (#354; Justin, 2026-11-27): the photo and banner a person picked or uploaded for their email
// signature, one row per Team record. The photo is the signature's own, never the record's profile picture. A column
// left empty (null) follows the signature Sheet and the defaults; a banner of '' is no banner. What a pick names is
// `drive:<file id>` (the Profile Images and Email Banners folders), `upload:<file>` (in the files bucket's
// `signatures/uploads`) or a website address. Who may change whose is the one permission check (`checkSignature`):
// a person their own, an Admin anyone's. Row Level Security keeps the table to the acting organization.
import { pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { organizationPolicy } from './policy';
import { rowColumns } from './rows';
import { team } from './team.schema';

export const signature = pgTable(
	'signature',
	{
		...rowColumns(),
		/** Whose signature: their Team record. */
		teamId: uuid('team_id')
			.notNull()
			.references(() => team.id, { onDelete: 'cascade' }),
		photo: text('photo'),
		banner: text('banner')
	},
	(table) => [
		uniqueIndex('signature_team_idx').on(table.organizationId, table.teamId),
		organizationPolicy('signature')
	]
).enableRLS();
