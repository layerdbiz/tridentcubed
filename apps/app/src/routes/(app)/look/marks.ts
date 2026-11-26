// What a name shows in the library's avatar (#379): a person's face and a customer's logo, worked out once for the
// avatar, the face stacks and the logo stacks alike. No photo or logo draws the initials or the code (#355).
import type { AvatarProps } from '@layerd/ui';
import { toCrossOrigin } from '#lib/files/files.schema.js';
import {
	initialsOf,
	isInitialsPicture,
	toCode,
	toInitialsPicture,
	type InitialsToneType
} from './initials';
import { clientOf, PAGE_ICONS, personOf, presenceOf } from './look.data';
import type { PresenceType } from './team.data';

type FaceOptionsType = {
	// Whose initials these are when there is no photo, in place of the Team record's role: a project's Personnel.
	tone?: InitialsToneType;
	// The dot to show, when the screen has read it already (the menu's Online panel keeps its own time, #331).
	presence?: PresenceType;
	hasPresence?: boolean;
};

/** A person's face by name: their photo or initials, and their presence dot. */
export function faceOf(name: string, { tone, presence, hasPresence = true }: FaceOptionsType = {}) {
	const saved = personOf(name).photo;
	const drawn =
		tone && isInitialsPicture(saved) ? toInitialsPicture(initialsOf(name), tone) : saved;
	// No name typed yet has no letters: the avatar's person icon shows instead.
	const src = isInitialsPicture(drawn) && !initialsOf(name) ? '' : drawn;
	return {
		src,
		alt: name,
		crossorigin: toCrossOrigin(src),
		presence: hasPresence ? (presence ?? presenceOf(name)) : undefined
	} satisfies AvatarProps;
}

type LogoOptionsType = {
	// An icon to show instead of a code, a project's folder: projects keep their icon.
	fallback?: string;
	// A project's Personnel company that is not a customer shows its code in white on black.
	tone?: Extract<InitialsToneType, 'customer' | 'company'>;
};

/** A customer's logo by name: its artwork kept whole on white, or its code on a round circle. */
export function logoOf(name: string, { fallback, tone = 'customer' }: LogoOptionsType = {}) {
	const client = clientOf(name);
	if (client.icon)
		return {
			src: client.icon,
			alt: `${client.name} logo`,
			crossorigin: toCrossOrigin(client.icon),
			fit: 'contain',
			fallback
		} satisfies AvatarProps;
	// No customer picked yet shows the Customers icon, not a code made of nothing.
	const hasCode = !fallback && Boolean(name.trim());
	return {
		src: hasCode ? toInitialsPicture(toCode(client.name, client.code), tone) : '',
		alt: `${client.name} logo`,
		fit: 'cover',
		shape: hasCode ? 'circle' : undefined,
		fallback: fallback ?? PAGE_ICONS.customers
	} satisfies AvatarProps;
}
