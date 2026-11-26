// A Team record as the screens hold it (#161 look G; #185). The real Trident Cubed team is the database's now: the one
// seed (`#lib/server/db/seed.ts`) loads it, with the photos as the app's own files, and the mapper (`mapper.ts`)
// turns its rows into these. Records are named by name on screen; `id` is the row's.
import type { DeviceKindType } from '#lib/presence/presence.utils.js';
import { initialsOf, toInitialsPicture } from '@layerd/ui';

export type TeamMemberType = {
	// Its row's id, made on the device (#185).
	id?: string;
	// The User it is, once they have signed in (set by the server at sign-in, never by the screens).
	userId?: string;
	rank: number;
	name: string;
	title: string;
	label: string;
	role: 'admin' | 'manager' | 'team';
	phone: string;
	email: string;
	location: string;
	// Their profile page elsewhere (LinkedIn).
	href: string;
	// Their photo: a starting file (`/start/team/...`), one picked on their page, or their sign-in picture.
	photo?: string;
	// Run 16: when they were added and last changed, and when they were last in the app (their online dot).
	created?: string;
	updated?: string;
	seen?: string;
	// When they came online: the start of the visit `seen` is part of (#226). It orders the menu's Online panel.
	since?: string;
	// The device they last used the app on, as the server read it (#331): its kind, and its system and browser.
	device?: DeviceKindType;
	deviceName?: string;
};

// The day the sample rows were made: what a record that came with the prototype says for created and updated.
export const SEEDED = '2026-01-05T09:00';

// Someone with no photo yet shows their initials on their role's colour (#355): purple for an Admin, blue for a
// Manager, grey for a Team user.
export function photoOfMember(member: TeamMemberType) {
	return member.photo || toInitialsPicture(initialsOf(member.name), member.role);
}

export const ROLE_LABELS: Record<TeamMemberType['role'], string> = {
	admin: 'Admin',
	manager: 'Manager',
	team: 'Team'
};

export type PresenceType = 'online' | 'idle' | 'offline';

export const PRESENCE_TONES: Record<PresenceType, string> = {
	online: 'bg-success',
	idle: 'bg-warning',
	offline: 'bg-slate-400'
};

// What someone does, from the sheet's label column ("Port Captain, Marine Surveyor").
export function labelsOf(member: TeamMemberType) {
	return member.label
		.split(',')
		.map((label) => label.trim())
		.filter(Boolean);
}
