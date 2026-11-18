// The menu's Online panel (#212): who is in the app right now, from when the server last saw each Team record.
import { describe, expect, it } from 'vite-plus/test';
import { onlineOf, resetPeople } from './look.data';
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
