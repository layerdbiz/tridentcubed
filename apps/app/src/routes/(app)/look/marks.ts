// What a name shows in the library's avatar (#379): a person's face, a team's faces and a customer's logo, worked
// out once for every avatar and stack in the app, with no app component between (Justin, 2026-11-26: one avatar
// component, never several). No photo or logo draws the initials or the code (#355).
import {
	initialsOf,
	isInitialsPicture,
	toCode,
	toInitialsPicture,
	type AvatarProps,
	type InitialsToneType,
	type StackItemType
} from '@layerd/ui';
import { toCrossOrigin } from '#lib/files/files.schema.js';
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

/**
 * A team's faces for the library's stack (#161, Justin's note 9): the lead first and on top, ringed in blue and
 * named as the lead, everyone else tucked in behind in a white rim. The report's cover shows them with no presence
 * dots (#217): a printed page says nothing of who is online.
 */
export function facesOf(
	names: string[],
	{ hasPresence = true, isMuted = false }: { hasPresence?: boolean; isMuted?: boolean } = {}
): StackItemType[] {
	return names.filter(Boolean).map((name, index) => ({
		...faceOf(name, { hasPresence }),
		id: name,
		title: index === 0 ? `${name} (team lead)` : name,
		ring: index === 0 ? 'ring-2 ring-primary ring-offset-2 ring-offset-white' : 'ring-2 ring-white',
		isMuted
	}));
}

type LogoOptionsType = {
	// An icon to show instead of a code, a project's folder: projects keep their icon.
	fallback?: string;
	// A project's Personnel company that is not a customer shows its code in white on black.
	tone?: Extract<InitialsToneType, 'customer' | 'company'>;
	// A rounded square, app-icon style (Justin's note 6), or round. A code is always round.
	shape?: 'rounded' | 'circle';
	// No ring and no shadow: the report's footer (Justin's run 8 note 20).
	isBare?: boolean;
	isMuted?: boolean;
};

/** A customer's logo by name: its artwork kept whole on white, or its code on a round circle. */
export function logoOf(
	name: string,
	{
		fallback,
		tone = 'customer',
		shape = 'rounded',
		isBare = false,
		isMuted = false
	}: LogoOptionsType = {}
): AvatarProps {
	const client = clientOf(name);
	const frame = {
		alt: `${client.name} logo`,
		ring: isBare ? '' : 'shadow-sm ring-1 ring-slate-900/[0.06]',
		isMuted,
		class: isMuted ? 'opacity-50' : '',
		title: client.name
	};
	if (client.icon)
		return {
			...frame,
			src: client.icon,
			crossorigin: toCrossOrigin(client.icon),
			fit: 'contain',
			shape,
			fallback
		} satisfies AvatarProps;
	// No customer picked yet shows the Customers icon, not a code made of nothing.
	const hasCode = !fallback && Boolean(name.trim());
	return {
		...frame,
		src: hasCode ? toInitialsPicture(toCode(client.name, client.code), tone) : '',
		fit: 'cover',
		shape: hasCode ? 'circle' : shape,
		fallback: fallback ?? PAGE_ICONS.customers
	} satisfies AvatarProps;
}
