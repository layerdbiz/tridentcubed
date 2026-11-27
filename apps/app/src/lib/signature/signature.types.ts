// Email signatures (#354): what the server answers the screen, and what the screen sends back.
import type { EmailSignatureData } from '@layerd/ui';

export type SignatureType = EmailSignatureData;

/** A shared mailbox an Admin can pick (operations@ and the like). */
export type MailboxType = { slug: string; name: string; email: string };

/**
 * A photo or banner someone can pick for their signature: what it is made from (`drive:<file id>`, `upload:<file>`
 * or a website address), its name, a small picture for the picker and, for a banner, where it takes a reader.
 */
export type ChoiceType = { source: string; label: string; preview: string; link?: string };

/** The photos and banners a person's signature can show, and the ones it shows now (a banner of '' is none). */
export type ChoicesType = {
	photos: ChoiceType[];
	banners: ChoiceType[];
	photo: string;
	banner: string;
};

/** One signature, with the shared mailboxes for an Admin and, for a person's, what can be picked; or why not. */
export type SignatureAnswerType =
	| {
			isAllowed: true;
			signature: SignatureType;
			mailboxes: MailboxType[];
			choices?: ChoicesType;
	  }
	| { isAllowed: false; reason: string };

/** Which signature: a Team record's (by id), a shared mailbox's (by slug), or, with neither, the User's own. */
export type SignatureAskType = { person?: string; mailbox?: string };

/**
 * A pick saved for a person's signature (theirs with no `person`): a photo or banner from its choices, '' for no
 * banner, or `null` to go back to what the Sheet and the defaults give.
 */
export type SignaturePickType = { person?: string; photo?: string | null; banner?: string | null };

/** What a signature picture is: a photo (always a circle), a banner, or one of the website's icons and logos. */
export type SignatureKindType = 'photo' | 'banner' | 'icon';

/**
 * What a signature picture is made from and what kind it is; `version` changes when the file behind the same source
 * does (a Google Drive file edited in place), so a new picture is made under a new name.
 */
export type PictureSourceType = { source: string; kind: SignatureKindType; version?: string };
