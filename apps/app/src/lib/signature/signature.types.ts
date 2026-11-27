// Email signatures (#354): what the server answers the screen.
import type { EmailSignatureData } from '@layerd/ui';

export type SignatureType = EmailSignatureData;

/** A shared mailbox an Admin can pick (operations@ and the like). */
export type MailboxType = { slug: string; name: string; email: string };

/** One signature, with the shared mailboxes for an Admin, or why it cannot be shown. */
export type SignatureAnswerType =
	| { isAllowed: true; signature: SignatureType; mailboxes: MailboxType[] }
	| { isAllowed: false; reason: string };

/** Which signature: a Team record's (by id), a shared mailbox's (by slug), or, with neither, the User's own. */
export type SignatureAskType = { person?: string; mailbox?: string };

/** What a signature picture is made from, and what kind it is. */
export type PictureSourceType = { source: string; kind: 'photo' | 'banner' };
