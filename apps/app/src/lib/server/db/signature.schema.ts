// Email signature picks (#354; Justin, 2026-11-27): the photo and banners a person picked or uploaded for their email
// signature, one row per Team record. The photo is the signature's own, never the record's profile picture. A column
// left empty (null) follows the signature Sheet and the defaults. What a pick names is `drive:<file id>` (the Profile
// Images and Email Banners folders), `upload:<file>` (in the files bucket's `signatures/uploads`) or a website
// address. Round 4 (Justin, 2026-11-27: "the same photo editor ... Same goes for the banners"): the photo keeps its
// edit (edit.ts, as an attachment's) and its link; `banners` is every banner in order, each with its edit and link,
// and an empty list is none. `banner`, the one banner picked before there could be several ('' for none), is read
// only while `banners` is empty, and never written again. Who may change whose is the one permission check
// (`checkSignature`): a person their own, an Admin anyone's. Row Level Security keeps the table to the acting
// organization.
import { jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { EditType } from '#lib/components/photo/edit.js';
import type { SignatureBannerType } from '#lib/signature/signature.types.js';
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
		banner: text('banner'),
		photoEdit: jsonb('photo_edit').$type<EditType>(),
		photoLink: text('photo_link'),
		banners: jsonb('banners').$type<SignatureBannerType[]>()
	},
	(table) => [
		uniqueIndex('signature_team_idx').on(table.organizationId, table.teamId),
		organizationPolicy('signature')
	]
).enableRLS();
