// Email signatures (#354): what the server answers the screen, and what the screen sends back.
import type { EmailSignatureData } from '@layerd/ui';
import type { EditType } from '#lib/components/photo/edit.js';

export type SignatureType = EmailSignatureData;

/** A shared mailbox an Admin can pick (operations@ and the like). */
export type MailboxType = { slug: string; name: string; email: string };

/**
 * A photo or banner someone can pick for their signature: what it is made from (`drive:<file id>`, `upload:<file>`
 * or a website address), its name, a small picture for the picker and, for a banner, where it takes a reader.
 */
export type ChoiceType = { source: string; label: string; preview: string; link?: string };

/** The photo a person's signature shows, as saved: what it is made from, how it is edited and where a tap takes a reader. */
export type SignaturePhotoType = { source: string; edit?: EditType; link: string };

/** One banner under a person's signature, in its place: what it is made from, how it is edited and where it goes. */
export type SignatureBannerType = { id: string; source: string; edit?: EditType; link: string };

/**
 * A photo or banner as the screen shows it: its name, a small picture for its tile (`preview`) and the big one the
 * editor opens (`original`), both of the picture as it came, its edit drawn over them.
 */
export type ShownPartType = { label: string; preview: string; original: string };

/**
 * A person's signature's photo and banners as the screen edits them, with the photos to pick from and the company's
 * banners to add. `isPicked` says the photo was picked or uploaded, not the one the Sheet and the defaults give.
 */
export type SignaturePartsType = {
	photo: SignaturePhotoType & ShownPartType & { isPicked: boolean };
	banners: (SignatureBannerType & ShownPartType)[];
	photos: ChoiceType[];
	companyBanners: ChoiceType[];
};

/** One signature, with the shared mailboxes for an Admin and, for a person's, its photo and banners to edit; or why not. */
export type SignatureAnswerType =
	| {
			isAllowed: true;
			signature: SignatureType;
			mailboxes: MailboxType[];
			parts?: SignaturePartsType;
	  }
	| { isAllowed: false; reason: string };

/** Which signature: a Team record's (by id), a shared mailbox's (by slug), or, with neither, the User's own. */
export type SignatureAskType = { person?: string; mailbox?: string };

/**
 * What is saved for a person's signature (theirs with no `person`): its photo and its banners, in order, each given
 * whole; `null` goes back to what the Sheet and the defaults give, and one left out stays as it is.
 */
export type SignatureSaveType = {
	person?: string;
	photo?: SignaturePhotoType | null;
	banners?: SignatureBannerType[] | null;
};

/** What a signature picture is: a photo (always a circle), a banner, or one of the website's icons and logos. */
export type SignatureKindType = 'photo' | 'banner' | 'icon';

/**
 * What a signature picture is made from and what kind it is; `version` changes when the file behind the same source
 * does (a Google Drive file edited in place), and the `edit` is part of it too, so a new picture is made under a new
 * name.
 */
export type PictureSourceType = {
	source: string;
	kind: SignatureKindType;
	version?: string;
	/** How it is turned, mirrored, straightened and cut first, as the screen's editor keeps it. */
	edit?: EditType;
};
