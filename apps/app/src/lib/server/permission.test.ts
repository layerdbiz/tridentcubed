// The one permission check as a matrix (#182; ADR 0003, amended 2026-11-12): each change below, asked by a Guest,
// a Team user, a Manager, an Admin and the Super admin, each of them a real User signed in on the in-process
// database. Tables that later tickets add (team, project, customer) are named as the save command will name them.
import { beforeAll, describe, expect, it } from 'vite-plus/test';
import type { ActorType } from './db/claims';
import * as schema from './db/schema';
import { TRIDENT_CUBED } from './db/seed';
import { type ChangeType, checkPermission } from './permission';
import { createTestSignIn } from './testing';

const ORG = TRIDENT_CUBED.id;
const OTHER_ORG = '33333333-3333-4333-8333-333333333333';
const ACTORS = ['guest', 'team', 'manager', 'admin', 'super'] as const;

type WhoType = (typeof ACTORS)[number];

const actors = {} as Record<WhoType, ActorType>;

beforeAll(async () => {
	const { db, signIn } = await createTestSignIn();
	await db.insert(schema.accessGrant).values([
		{ email: 'mia@tridentcubed.com', organizationId: ORG, role: 'manager' },
		{ email: 'ada@tridentcubed.com', organizationId: ORG, role: 'admin' },
		{ email: 'owner@personal.example', organizationId: ORG, role: 'admin', isSuperAdmin: true }
	]);
	actors.guest = (await signIn('visitor@elsewhere.example')).actor;
	actors.team = (await signIn('tom@tridentcubed.com')).actor;
	actors.manager = (await signIn('mia@tridentcubed.com')).actor;
	actors.admin = (await signIn('ada@tridentcubed.com')).actor;
	actors.super = (await signIn('owner@personal.example')).actor;
});

function ownDraft(): ChangeType {
	return {
		table: 'project',
		operation: 'delete',
		row: { organizationId: ORG, status: 'Draft', createdBy: actors.team.userId }
	};
}

// [what, the change, who may]
const MATRIX: [string, () => ChangeType, WhoType[]][] = [
	[
		'add a customer',
		() => ({
			table: 'customer',
			operation: 'put',
			columns: ['name'],
			values: { organizationId: ORG, name: 'Acme' }
		}),
		['team', 'manager', 'admin', 'super']
	],
	[
		'delete a customer',
		() => ({ table: 'customer', operation: 'delete', row: { organizationId: ORG, name: 'Acme' } }),
		['team', 'manager', 'admin', 'super']
	],
	[
		'add a customer to another organization',
		() => ({
			table: 'customer',
			operation: 'put',
			columns: ['name'],
			values: { organizationId: OTHER_ORG, name: 'Acme' }
		}),
		[]
	],
	[
		'change the organization’s details',
		() => ({
			table: 'organization_details',
			operation: 'put',
			columns: ['emailDomain'],
			row: { organizationId: ORG },
			values: { emailDomain: 'tridentcubed.com' }
		}),
		['admin', 'super']
	],
	[
		'rename the organization',
		() => ({
			table: 'organization',
			operation: 'put',
			columns: ['name'],
			row: { id: ORG },
			values: { name: 'Trident' }
		}),
		['admin', 'super']
	],
	[
		'delete the organization',
		() => ({ table: 'organization', operation: 'delete', row: { id: ORG } }),
		[]
	],
	[
		'add an access grant',
		() => ({
			table: 'access_grant',
			operation: 'put',
			columns: ['email', 'role'],
			values: { organizationId: ORG, email: 'x@example.com', role: 'admin' }
		}),
		[]
	],
	[
		'edit a Team record’s title',
		() => ({
			table: 'team',
			operation: 'put',
			columns: ['title'],
			row: { organizationId: ORG, role: 'team' },
			values: { title: 'Surveyor' }
		}),
		['team', 'manager', 'admin', 'super']
	],
	[
		'add a Team record with the Team role',
		() => ({
			table: 'team',
			operation: 'put',
			columns: ['name', 'role'],
			values: { organizationId: ORG, name: 'Rosa Vega', role: 'team' }
		}),
		['team', 'manager', 'admin', 'super']
	],
	[
		'add a Team record with the Admin role',
		() => ({
			table: 'team',
			operation: 'put',
			columns: ['name', 'role'],
			values: { organizationId: ORG, name: 'Rosa Vega', role: 'admin' }
		}),
		['admin', 'super']
	],
	[
		'change the email of an Admin’s Team record nobody has signed in as',
		() => ({
			table: 'team',
			operation: 'put',
			columns: ['email'],
			row: { organizationId: ORG, role: 'admin', userId: null },
			values: { email: 'someone@tridentcubed.com' }
		}),
		['admin', 'super']
	],
	[
		'change the email of a Team record with the Team role',
		() => ({
			table: 'team',
			operation: 'put',
			columns: ['email'],
			row: { organizationId: ORG, role: 'team', userId: null },
			values: { email: 'someone@tridentcubed.com' }
		}),
		['team', 'manager', 'admin', 'super']
	],
	[
		'make a Team record a Manager',
		() => ({
			table: 'team',
			operation: 'put',
			columns: ['role'],
			row: { organizationId: ORG, role: 'team' },
			values: { role: 'manager' }
		}),
		['admin', 'super']
	],
	[
		'make an Admin a Manager while another Admin remains',
		() => ({
			table: 'team',
			operation: 'put',
			columns: ['role'],
			row: { organizationId: ORG, role: 'admin' },
			values: { role: 'manager' },
			adminCount: 2
		}),
		['admin', 'super']
	],
	[
		'demote the last Admin',
		() => ({
			table: 'member',
			operation: 'put',
			columns: ['role'],
			row: { organizationId: ORG, role: 'admin' },
			values: { role: 'team' },
			adminCount: 1
		}),
		[]
	],
	[
		'demote the Super admin',
		() => ({
			table: 'team',
			operation: 'put',
			columns: ['role'],
			row: { organizationId: ORG, role: 'admin' },
			values: { role: 'team' },
			isSuperAdmin: true,
			adminCount: 3
		}),
		[]
	],
	[
		'remove the last Admin’s membership',
		() => ({
			table: 'member',
			operation: 'delete',
			row: { organizationId: ORG, role: 'admin' },
			adminCount: 1
		}),
		[]
	],
	[
		'add a member',
		() => ({
			table: 'member',
			operation: 'put',
			columns: ['userId', 'role'],
			values: { organizationId: ORG, role: 'team' }
		}),
		['admin', 'super']
	],
	[
		'set a project to Archived',
		() => ({
			table: 'project',
			operation: 'put',
			columns: ['status'],
			row: { organizationId: ORG, status: 'Complete' },
			values: { status: 'Archived' },
			project: { status: 'Complete' }
		}),
		['admin', 'super']
	],
	[
		'bring a project back from Archived',
		() => ({
			table: 'project',
			operation: 'put',
			columns: ['status'],
			row: { organizationId: ORG, status: 'Archived' },
			values: { status: 'Complete' },
			project: { status: 'Archived' }
		}),
		['admin', 'super']
	],
	[
		'Mark Sent',
		() => ({
			table: 'project',
			operation: 'put',
			columns: ['status', 'statusBeforeSent'],
			row: { organizationId: ORG, status: 'Ready' },
			values: { status: 'Sent', statusBeforeSent: 'Ready' },
			project: { status: 'Ready' }
		}),
		['team', 'manager', 'admin', 'super']
	],
	[
		'Unsend a Sent project',
		() => ({
			table: 'project',
			operation: 'put',
			columns: ['status'],
			row: { organizationId: ORG, status: 'Sent' },
			values: { status: 'Ready' },
			project: { status: 'Sent' }
		}),
		['team', 'manager', 'admin', 'super']
	],
	[
		'retitle a Sent project',
		() => ({
			table: 'project',
			operation: 'put',
			columns: ['title'],
			row: { organizationId: ORG, status: 'Sent' },
			values: { title: 'New' },
			project: { status: 'Sent' }
		}),
		[]
	],
	[
		'add a stop to a Complete project',
		() => ({
			table: 'stop',
			operation: 'put',
			columns: ['point'],
			values: { organizationId: ORG, point: 'Start' },
			project: { status: 'Complete' }
		}),
		[]
	],
	[
		'add a stop to a project In Progress',
		() => ({
			table: 'stop',
			operation: 'put',
			columns: ['point'],
			values: { organizationId: ORG, point: 'Start' },
			project: { status: 'In Progress' }
		}),
		['team', 'manager', 'admin', 'super']
	],
	['delete their own Draft (made by the Team user)', ownDraft, ['team', 'admin', 'super']],
	[
		'delete a Draft someone else made',
		() => ({
			table: 'project',
			operation: 'delete',
			row: { organizationId: ORG, status: 'Draft', createdBy: 'someone-else' }
		}),
		['admin', 'super']
	],
	[
		'delete a Sent project',
		() => ({
			table: 'project',
			operation: 'delete',
			row: { organizationId: ORG, status: 'Sent', createdBy: actors.team.userId },
			project: { status: 'Sent' }
		}),
		['admin', 'super']
	]
];

describe('the one permission check', () => {
	it('has a real User behind every role', () => {
		expect(actors.guest).toMatchObject({ organizationId: null, role: null });
		expect(actors.team).toMatchObject({ organizationId: ORG, role: 'team' });
		expect(actors.manager).toMatchObject({ organizationId: ORG, role: 'manager' });
		expect(actors.admin).toMatchObject({ organizationId: ORG, role: 'admin', isSuperAdmin: false });
		expect(actors.super).toMatchObject({ organizationId: ORG, role: 'admin', isSuperAdmin: true });
	});

	for (const [what, toChange, allowed] of MATRIX) {
		it(`lets ${allowed.length ? allowed.join(', ') : 'nobody'} ${what}`, () => {
			const verdicts = Object.fromEntries(
				ACTORS.map((who) => [who, checkPermission(actors[who], toChange()).isAllowed])
			);
			expect(verdicts).toEqual(
				Object.fromEntries(ACTORS.map((who) => [who, allowed.includes(who)]))
			);
		});
	}

	it('gives a plain reason with every refusal', () => {
		expect(checkPermission(actors.guest, ownDraft())).toEqual({
			isAllowed: false,
			reason: 'You are waiting for access. An Admin of the organization can let you in.'
		});
		expect(
			checkPermission(actors.team, {
				table: 'project',
				operation: 'put',
				columns: ['title'],
				row: { organizationId: ORG },
				project: { status: 'Sent' }
			})
		).toEqual({
			isAllowed: false,
			reason: 'This project is Sent, so only its status can change. Change its status to edit it.'
		});
		expect(
			checkPermission(actors.admin, {
				table: 'member',
				operation: 'put',
				columns: ['role'],
				row: { organizationId: ORG, role: 'admin' },
				values: { role: 'team' },
				adminCount: 1
			})
		).toEqual({ isAllowed: false, reason: 'The organization must keep at least one Admin.' });
	});
});
