// A Team record as the screens hold it (#161 look G; #185). The real Trident Cubed team is the database's now: the one
// seed (`#lib/server/db/seed.ts`) loads it, with the photos as the app's own files, and the mapper (`mapper.ts`)
// turns its rows into these. Records are named by name on screen; `id` is the row's.

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
};

// The day the sample rows were made: what a record that came with the prototype says for created and updated.
export const SEEDED = '2026-01-05T09:00';

// Initials on a soft circle for the people with no photo yet.
export function initialsOf(name: string) {
	const letters = name
		.replace(/^Capt\. /, '')
		.split(' ')
		.map((part) => part[0])
		.slice(0, 2)
		.join('');
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#dbe4f0"/><text x="32" y="40" font-family="system-ui,sans-serif" font-size="24" font-weight="600" fill="#475569" text-anchor="middle">${letters}</text></svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function photoOfMember(member: TeamMemberType) {
	return member.photo || initialsOf(member.name);
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
