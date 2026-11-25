// The menu's Online panel (#212, #226, #331): who is in the app, who just left and who has been away longer, from the
// server's stamps on each Team record.
// The project number's typed parts and the customer's own number for the job (#217).
import { describe, expect, it } from 'vite-plus/test';
import {
	createdDayOf,
	nextJobOf,
	numberOf,
	onlineOf,
	presenceOf,
	resetPeople,
	toJobCode,
	toPresenceText,
	toReference,
	type ProjectType
} from './look.data';
import type { TeamMemberType } from './team.data';

// A Team record last seen `seenAgo` minutes ago, on a visit that began `sinceAgo` minutes ago.
function member(name: string, seenAgo?: number, sinceAgo?: number): TeamMemberType {
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
		seen: toStamp(seenAgo),
		since: toStamp(sinceAgo)
	};
}

function toStamp(minutesAgo?: number) {
	return minutesAgo === undefined
		? undefined
		: new Date(Date.now() - minutesAgo * 60000).toISOString();
}

function namesOf(members: TeamMemberType[]) {
	return members.map((one) => one.name);
}

describe('who is online', () => {
	it('lists the people in the app with whoever came online last at the top', () => {
		const team = [member('Ana', 1, 30), member('Ben', 2, 3), member('Dee', 4, 10)];
		resetPeople(team);
		expect(namesOf(onlineOf(team))).toEqual(['Ben', 'Dee', 'Ana']);
	});

	it('moves someone no longer in the app under everyone who is, in the same order among themselves', () => {
		const team = [
			member('Ana', 1, 50),
			member('Ben', 30, 40),
			member('Cy', 10, 20),
			member('Dee', 2, 5)
		];
		resetPeople(team);
		expect(namesOf(onlineOf(team))).toEqual(['Dee', 'Ana', 'Cy', 'Ben']);
	});

	it('keeps someone on the list once their idle dot ends, grey, under everyone idle, whoever left last first', () => {
		const team = [
			member('Ana', 59, 80),
			member('Ben', 61, 90),
			member('Cy', 2, 3),
			member('Dee', 600, 610),
			member('Eve', 90, 95)
		];
		resetPeople(team);
		expect(namesOf(onlineOf(team))).toEqual(['Cy', 'Ana', 'Ben', 'Eve', 'Dee']);
		expect(team.map((one) => presenceOf(one.name))).toEqual([
			'idle',
			'offline',
			'online',
			'offline',
			'offline'
		]);
	});

	it('lists only the people who have used the app, not every Team record', () => {
		const team = [member('Ana', 300), member('Ben'), member('Cy', 1, 1), member('Dee')];
		resetPeople(team);
		expect(namesOf(onlineOf(team))).toEqual(['Cy', 'Ana']);
	});

	it('orders the signed-in person like everyone else: they are in the app now, whatever their stamp says', () => {
		const team = [member('Ben', 90, 20), member('Ana', 1, 5), member('Cy', 10, 2)];
		resetPeople(team, 'Ben');
		expect(namesOf(onlineOf(team))).toEqual(['Ana', 'Ben', 'Cy']);
	});

	it('orders a record the server has not stamped as come online by when it was last seen', () => {
		const team = [member('Ana', 3), member('Ben', 1, 4), member('Cy', 2)];
		resetPeople(team);
		expect(namesOf(onlineOf(team))).toEqual(['Cy', 'Ana', 'Ben']);
	});

	it('reads the dots and the order at the time it is given, so the list keeps up while it is open', () => {
		const team = [member('Ana', 3, 3), member('Ben', 1, 40)];
		resetPeople(team);
		const later = Date.now() + 10 * 60000;
		expect(namesOf(onlineOf(team, later))).toEqual(['Ana', 'Ben']);
		expect(team.map((one) => presenceOf(one.name, later))).toEqual(['idle', 'idle']);
	});
});

describe('how long someone has been online or away', () => {
	it('says how long since they came online while their dot is green', () => {
		resetPeople([member('Ana', 1, 25)]);
		expect(toPresenceText(member('Ana', 1, 25))).toBe('Online for 25 min');
	});

	it('says how long since they were last in the app once it is orange, then grey', () => {
		const team = [member('Ben', 12, 40), member('Cy', 3 * 60 + 5, 4 * 60)];
		resetPeople(team);
		expect(team.map((one) => toPresenceText(one))).toEqual([
			'Idle for 12 min',
			'Offline for 3 hours'
		]);
	});

	it('says the signed-in person is online since their visit began, and falls back to when they were last seen', () => {
		resetPeople([member('Ana', 0, 70), member('Ben', 2)], 'Ana');
		expect(toPresenceText(member('Ana', 0, 70))).toBe('Online for 1 hour');
		expect(toPresenceText(member('Ben', 2))).toBe('Online for 2 min');
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
