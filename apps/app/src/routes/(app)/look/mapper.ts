// The mapper (glossary "How the app saves"; spec #179; #183): the screens' state (LookState) as rows, and rows back
// into that state. It is the only code that knows both shapes. The screens keep naming records by name, as the look
// prototype does; rows hold ids, and this is where one becomes the other.
//
// `toRows` must give back exactly what `takeRows` took in (order included), so the sync loop's difference after a
// load is empty. A new table adds its part to both, and a round trip to `mapper.test.ts`.
import type { RowType, SavedRowType } from '#lib/rows/rows.schema.js';
import { type ClientType, type ContactType, resetCustomers, resetPeople } from './look.data';
import type { LookState } from './look.state.svelte';
import { takeListRows, toListRows } from './mapper.lists';
import { customerOf } from './records.data';
import type { TeamMemberType } from './team.data';

export { toFacilityId, toFacilityName, toTransportId, toTransportName } from './mapper.lists';

/** The screens' state as rows: every table the state holds, parents before their children. */
export function toRows(look: LookState): RowType[] {
	const rows: RowType[] = [];
	for (const name of look.customers) {
		const customer = customerOf(look, name);
		if (!customer.id) continue;
		rows.push({
			table: 'customer',
			id: customer.id,
			values: {
				name: customer.name,
				code: customer.code ?? '',
				types: customer.kind ?? '',
				icon: customer.icon ?? '',
				logo: customer.logo ?? '',
				picture: customer.photo ?? '',
				city: customer.city ?? '',
				address: customer.address ?? '',
				email: customer.email ?? '',
				phone: customer.phone ?? '',
				website: customer.website ?? ''
			}
		});
		for (const [position, contact] of (customer.contacts ?? []).entries())
			rows.push({
				table: 'contact',
				id: contact.id,
				values: {
					customerId: customer.id,
					position,
					name: contact.name,
					title: contact.title,
					email: contact.email,
					phone: contact.phone,
					photo: contact.photo
				}
			});
	}
	rows.push(...toTeamRows(look));
	rows.push(...toListRows(look));
	return rows;
}

// Team records (#185). The User a record is and when they were last seen are the server's to set, so they load
// (takeRows) but are never sent.
function toTeamRows(look: LookState): RowType[] {
	return look.members
		.filter((member) => member.id)
		.map((member) => ({
			table: 'team',
			id: member.id!,
			values: {
				name: member.name,
				title: member.title,
				labels: member.label,
				role: member.role,
				phone: member.phone,
				email: member.email,
				location: member.location,
				photo: member.photo ?? '',
				link: member.href ?? '',
				rank: member.rank
			}
		}));
}

// A server time as the stamp the screens keep: "2026-11-10T16:20", in this device's time zone.
function toStamp(iso: string) {
	const time = new Date(iso);
	return new Date(time.getTime() - time.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function text(values: SavedRowType['values'], column: string) {
	return String(values[column] ?? '');
}

function toContact(row: SavedRowType): ContactType {
	const { values } = row;
	return {
		id: row.id,
		name: text(values, 'name'),
		title: text(values, 'title'),
		email: text(values, 'email'),
		phone: text(values, 'phone'),
		photo: text(values, 'photo')
	};
}

function toCustomer(row: SavedRowType, contacts: ContactType[]): ClientType {
	const { values } = row;
	return {
		id: row.id,
		name: text(values, 'name'),
		kind: text(values, 'types'),
		icon: text(values, 'icon'),
		logo: text(values, 'logo'),
		city: text(values, 'city'),
		code: text(values, 'code'),
		address: text(values, 'address'),
		email: text(values, 'email'),
		phone: text(values, 'phone'),
		website: text(values, 'website'),
		photo: text(values, 'picture'),
		contacts,
		created: toStamp(row.createdAt),
		updated: toStamp(row.updatedAt)
	};
}

function toMember(row: SavedRowType): TeamMemberType {
	const { values } = row;
	return {
		id: row.id,
		userId: values.userId ? String(values.userId) : undefined,
		rank: Number(values.rank ?? 3),
		name: text(values, 'name'),
		title: text(values, 'title'),
		label: text(values, 'labels'),
		role: (text(values, 'role') || 'team') as TeamMemberType['role'],
		phone: text(values, 'phone'),
		email: text(values, 'email'),
		location: text(values, 'location'),
		href: text(values, 'link'),
		photo: text(values, 'photo'),
		created: toStamp(row.createdAt),
		updated: toStamp(row.updatedAt),
		seen: values.lastSeen ? String(values.lastSeen) : undefined
	};
}

// The server's Team records into the state. The signed-in person is in the app now, so their dot is green whatever
// the server last stamped.
function takeTeam(look: LookState, rows: SavedRowType[]) {
	const members = rows.filter((row) => row.table === 'team');
	const live = members.filter((row) => !row.deletedAt).map(toMember);
	const trashed = members.filter((row) => row.deletedAt).map(toMember);
	const self = live.find((member) => look.userId && member.userId === look.userId);
	if (self) self.seen = new Date().toISOString();
	resetPeople([...trashed, ...live], self?.name);
	look.members = live;
	look.trashed.team = trashed;
}

/** The server's rows into the screens' state, in place of what it held for those tables. */
export function takeRows(look: LookState, rows: SavedRowType[]) {
	const contacts = new Map<string, SavedRowType[]>();
	for (const row of rows)
		if (row.table === 'contact') {
			const customerId = text(row.values, 'customerId');
			contacts.set(customerId, [...(contacts.get(customerId) ?? []), row]);
		}
	const customers = rows
		.filter((row) => row.table === 'customer')
		.map((row) => ({
			isTrashed: Boolean(row.deletedAt),
			customer: toCustomer(
				row,
				(contacts.get(row.id) ?? [])
					.sort((a, b) => Number(a.values.position) - Number(b.values.position))
					.map(toContact)
			)
		}));
	const live = customers.filter((item) => !item.isTrashed).map((item) => item.customer);
	const trashed = customers.filter((item) => item.isTrashed).map((item) => item.customer);
	resetCustomers(live, trashed);
	look.added = live;
	look.customers = live.map((customer) => customer.name);
	look.trashed.customers = trashed;
	takeTeam(look, rows);
	takeListRows(look, rows);
}

/** A customer's id from the name the screens use, in the Trash or not (#186: a project's customer). */
export function toCustomerId(look: LookState, name: string) {
	const live = look.added.find((customer) => customer.name === name);
	return (live ?? look.trashed.customers.find((customer) => customer.name === name))?.id;
}

/** The name the screens use for a customer's id, in the Trash or not. */
export function toCustomerName(look: LookState, id: string) {
	return [...look.added, ...look.trashed.customers].find((customer) => customer.id === id)?.name;
}

/** A Team record's id from the name the screens use, in the Trash or not (#186: a project's Team Lead and team). */
export function toTeamId(look: LookState, name: string) {
	const live = look.members.find((member) => member.name === name);
	return (live ?? look.trashed.team.find((member) => member.name === name))?.id;
}

/** The name the screens use for a Team record's id, in the Trash or not. */
export function toTeamName(look: LookState, id: string) {
	return [...look.members, ...look.trashed.team].find((member) => member.id === id)?.name;
}
