// The menu's Online panel (#212): who is in the app right now, from when the server last saw each Team record.
// The project number's typed parts and the customer's own number for the job (#217).
import { describe, expect, it } from 'vite-plus/test';
import {
	createdDayOf,
	nextJobOf,
	numberOf,
	onlineOf,
	resetPeople,
	toJobCode,
	toReference,
	type ProjectType
} from './look.data';
import type { TeamMemberType } from './team.data';

function member(name: string, minutesAgo?: number): TeamMemberType {
	return {
		rank: 0,
		name,
		title: '',
		label: '',
		role: 'team',
		phone: '',
		email: '',
		location: '',
		href: '',
		seen:
			minutesAgo === undefined ? undefined : new Date(Date.now() - minutesAgo * 60000).toISOString()
	};
}

function namesOf(members: TeamMemberType[]) {
	return members.map((one) => one.name);
}

describe('who is online', () => {
	it('lists the Team records seen in the last five minutes, in the order of the team', () => {
		const team = [member('Ana', 1), member('Ben', 10), member('Cy'), member('Dee', 4)];
		resetPeople(team);
		expect(namesOf(onlineOf(team))).toEqual(['Ana', 'Dee']);
	});

	it('puts the signed-in person first: they are in the app now, whatever their stamp says', () => {
		const team = [member('Ana', 1), member('Ben', 90)];
		resetPeople(team, 'Ben');
		expect(namesOf(onlineOf(team))).toEqual(['Ben', 'Ana']);
	});

	it('is empty when nobody has been in the app', () => {
		const team = [member('Ana'), member('Ben', 61)];
		resetPeople(team);
		expect(onlineOf(team)).toEqual([]);
	});
});

function project(id: string, values: Partial<ProjectType> = {}): ProjectType {
	return {
		id,
		title: id,
		subtitle: '',
		type: '',
		client: 'KOGA',
		stops: [],
		location: '',
		created: '2026-11-18T12:08',
		updated: '2026-11-18T12:08',
		status: 'Draft',
		team: [],
		progress: 0,
		...values
	};
}

describe('the project number', () => {
	it('shows the saved Project Creation Date, not the day the project was made', () => {
		const susana = project('susana', { day: '2026-10-27', job: 1 });
		expect(createdDayOf(susana)).toBe('2026-10-27');
		expect(numberOf(susana, [susana])).toBe('KOG-2026-10-27-J01');
		expect(createdDayOf(project('new'))).toBe('2026-11-18');
	});

	it('prints the Job Sequence Number as J and two digits', () => {
		expect([toJobCode(1), toJobCode(12), toJobCode(120)]).toEqual(['J01', 'J12', 'J120']);
	});

	it('offers the next Job Sequence Number of the same customer and day, and J01 for another', () => {
		const projects = [
			project('a', { day: '2026-10-27', job: 1 }),
			project('b', { day: '2026-10-27', job: 4 }),
			project('c', { day: '2026-10-28', job: 2 }),
			project('d', { day: '2026-10-27', job: 9, client: 'AXA XL' })
		];
		expect(nextJobOf(projects, 'KOGA', '2026-10-27')).toBe(5);
		expect(nextJobOf(projects, 'KOGA', '2026-10-27', 'b')).toBe(2);
		expect(nextJobOf(projects, 'KOGA', '2026-10-29')).toBe(1);
		expect(nextJobOf(projects, 'US Ocean', '2026-10-27')).toBe(1);
	});
});

describe('the Customer Reference Number', () => {
	it('prints with one #, however it was typed, and not at all when empty', () => {
		expect(toReference('SO025484')).toBe('#SO025484');
		expect(toReference(' #SO025484 ')).toBe('#SO025484');
		expect(toReference('')).toBe('');
		expect(toReference(undefined)).toBe('');
		expect(toReference(' # ')).toBe('');
	});
});
