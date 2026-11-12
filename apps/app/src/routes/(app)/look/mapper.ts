// The mapper (glossary "How the app saves"; spec #179; #183): the screens' state (LookState) as rows, and rows back
// into that state. It is the only code that knows both shapes. The screens keep naming records by name, as the look
// prototype does; rows hold ids, and this is where one becomes the other.
//
// `toRows` must give back exactly what `takeRows` took in (order included), so the sync loop's difference after a
// load is empty. A new table adds its part to both, and a round trip to `mapper.test.ts`.
import type { RowType, SavedRowType } from '#lib/rows/rows.schema.js';
import {
	type ClientType,
	type ContactType,
	panelOf,
	type PanelType,
	type PersonnelType,
	type ProjectType,
	resetCustomers,
	resetPeople,
	type StatusType
} from './look.data';
import { FROZEN, type LookState, percentOf } from './look.state.svelte';
import { takeListRows, toListRows } from './mapper.lists';
import { takePhotos, toPhotoRows } from './mapper.photos';
import { stopsByProject, takePanelRows, toPanelRows, toTrip } from './mapper.trip';
import { byPosition, text, toRecordId, toRecordName, toStamp } from './mapper.utils';
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
	rows.push(...toProjectRows(look));
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
	takeProjects(look, rows);
}

/** A customer's id from the name the screens use, in the Trash or not (#186: a project's customer). */
export function toCustomerId(look: LookState, name: string) {
	return toRecordId(look.added, look.trashed.customers, name);
}

/** The name the screens use for a customer's id, in the Trash or not. */
export function toCustomerName(look: LookState, id: string) {
	return toRecordName(look.added, look.trashed.customers, id);
}

/** A Team record's id from the name the screens use, in the Trash or not (#186: a project's Team Lead and team). */
export function toTeamId(look: LookState, name: string) {
	return toRecordId(look.members, look.trashed.team, name);
}

/** The name the screens use for a Team record's id, in the Trash or not. */
export function toTeamName(look: LookState, id: string) {
	return toRecordName(look.members, look.trashed.team, id);
}

// Projects (#186). A project's row holds what its Project panel holds, with its customer, contact and Team Lead by
// id; its Team Assigned are rows of their own. The lists load every project and its Team Assigned; a project's
// personnel and panels load when it opens (`takeProject`), and only a project whose panels have loaded sends them.
// A project whose panels have not loaded saves as the server last gave it, but for its status and percent, the only
// things the lists change.

const PROJECT_COLUMNS = [
	'title',
	'subtitle',
	'projectType',
	'customerId',
	'contactId',
	'teamLeadId',
	'location',
	'status',
	'progress',
	'day'
];

function fieldOf(panel: PanelType, label: string) {
	return panel.fields.find((field) => field.label === label)?.value ?? '';
}

// What a project saves of its Project panel: as typed, its customer and Team Lead by id.
function toPanelValues(look: LookState, panel: PanelType) {
	return {
		title: fieldOf(panel, 'Title'),
		subtitle: fieldOf(panel, 'Subtitle'),
		projectType: fieldOf(panel, 'Project Type'),
		customerId: toCustomerId(look, fieldOf(panel, 'Customer')) ?? null,
		contactId: panel.contact ?? null,
		teamLeadId: toTeamId(look, panel.owner) ?? null
	};
}

function toProjectRows(look: LookState): RowType[] {
	const rows: RowType[] = [];
	const teamRowIds = new Map<string, string>();
	// Oldest first, as they were made: a batch that makes several projects gives their J counts in that order.
	for (const project of [...look.projects].reverse()) {
		const panels = look.workspaces[project.id];
		const own = panels?.find((panel) => panel.kind === 'project');
		const saved = look.fromServer[project.id];
		const isFrozen = FROZEN.includes(project.status);
		// A frozen project keeps the percent it was frozen at: nothing in it may change.
		const progress = panels && !isFrozen ? percentOf(panels) : project.progress;
		const values = {
			...Object.fromEntries(PROJECT_COLUMNS.map((column) => [column, saved?.values[column]])),
			...(own ? toPanelValues(look, own) : {}),
			location: own ? project.location : (saved?.values.location ?? project.location),
			status: project.status,
			progress,
			day: project.day ?? project.created.slice(0, 10)
		};
		rows.push({ table: 'project', id: project.id, values });
		if (!own) {
			rows.push(...(saved?.team ?? []), ...(saved?.stops ?? []));
			continue;
		}
		// The Team Assigned: one row per Team record, in order. A record assigned again after being taken off is a
		// new row, so its old one stays in the Trash.
		const assigned = [...new Set(own.assigned)]
			.map((name) => toTeamId(look, name))
			.filter((id): id is string => Boolean(id));
		for (const [position, teamId] of assigned.entries()) {
			const key = `${project.id}/${teamId}`;
			const id = look.teamRowIds.get(key) ?? crypto.randomUUID();
			teamRowIds.set(key, id);
			rows.push({
				table: 'project_team',
				id,
				values: { projectId: project.id, teamId, position }
			});
		}
		rows.push(...toPersonnelRows(project.id, own.personnel ?? []));
		for (const [position, panel] of panels.entries())
			rows.push({
				table: 'panel',
				id: panel.id,
				values: {
					projectId: project.id,
					kind: panel.kind,
					key: panel.key ?? '',
					name: panel.name,
					icon: panel.icon,
					control: panel.control,
					isEnabled: panel.isEnabled,
					position
				}
			});
		// #189: a photo panel's groups and photos.
		for (const panel of panels)
			if (panel.kind === 'photos') rows.push(...toPhotoRows(project.id, panel));
		for (const panel of panels) rows.push(...toPanelRows(look, project.id, panel));
	}
	// Only the assignments on screen keep their ids; one taken off and put back gets a new one.
	for (const key of look.teamRowIds.keys()) {
		const projectId = key.split('/')[0];
		if (look.workspaces[projectId] && !teamRowIds.has(key)) look.teamRowIds.delete(key);
	}
	for (const [key, id] of teamRowIds) look.teamRowIds.set(key, id);
	return rows;
}

function toPersonnelRows(projectId: string, personnel: PersonnelType[]): RowType[] {
	const rows: RowType[] = [];
	for (const [position, company] of personnel.entries()) {
		rows.push({
			table: 'personnel_company',
			id: company.id,
			values: { projectId, position, company: company.company }
		});
		for (const [index, person] of company.people.entries())
			rows.push({
				table: 'personnel_person',
				id: person.id,
				values: {
					projectId,
					companyId: company.id,
					position: index,
					name: person.name,
					title: person.title
				}
			});
	}
	return rows;
}

function toRow(row: RowType): RowType {
	return { table: row.table, id: row.id, values: { ...row.values } };
}

function toAssigned(look: LookState, team: RowType[]) {
	return [...team]
		.sort(byPosition)
		.map((row) => toTeamName(look, String(row.values.teamId)))
		.filter((name): name is string => Boolean(name));
}

// The Project panel as a project row and its Team Assigned rows say: what is typed, who the customer and the Team
// Lead are by name, and the Team Assigned in order.
function fillProjectPanel(
	look: LookState,
	panel: PanelType,
	values: Record<string, unknown>,
	team: RowType[]
) {
	const set = (label: string, value: string) => {
		const field = panel.fields.find((item) => item.label === label);
		if (field && field.value !== value) field.value = value;
	};
	set('Title', text(values, 'title'));
	set('Subtitle', text(values, 'subtitle'));
	set('Project Type', text(values, 'projectType'));
	set('Organization', look.organization.name);
	set('Customer', values.customerId ? (toCustomerName(look, String(values.customerId)) ?? '') : '');
	panel.contact = values.contactId ? String(values.contactId) : undefined;
	panel.owner = values.teamLeadId ? (toTeamName(look, String(values.teamLeadId)) ?? '') : '';
	panel.assigned = toAssigned(look, team);
}

// One project's row as the lists show it.
function toProject(
	look: LookState,
	row: SavedRowType,
	team: RowType[],
	stops: RowType[]
): ProjectType {
	const { values } = row;
	const lead = values.teamLeadId ? toTeamName(look, String(values.teamLeadId)) : undefined;
	const status = (text(values, 'status') || 'Draft') as StatusType;
	const statusBeforeSent = text(values, 'statusBeforeSent') as StatusType | '';
	return {
		id: row.id,
		title: text(values, 'title').trim() || 'Untitled project',
		subtitle: text(values, 'subtitle'),
		type: text(values, 'projectType'),
		client: values.customerId ? (toCustomerName(look, String(values.customerId)) ?? '') : '',
		stops: toTrip(look, stops),
		location: text(values, 'location'),
		created: toStamp(row.createdAt),
		updated: toStamp(row.updatedAt),
		status,
		before: status === 'Sent' && statusBeforeSent ? statusBeforeSent : undefined,
		team: [lead, ...toAssigned(look, team)].filter((name): name is string => Boolean(name)),
		progress: Number(values.progress ?? 0),
		day: text(values, 'day') || undefined,
		job: values.job ? Number(values.job) : undefined,
		createdBy: values.createdBy ? String(values.createdBy) : undefined
	};
}

function teamOf(rows: SavedRowType[]) {
	const team = new Map<string, RowType[]>();
	for (const row of rows)
		if (row.table === 'project_team' && !row.deletedAt) {
			const projectId = text(row.values, 'projectId');
			team.set(projectId, [...(team.get(projectId) ?? []), toRow(row)]);
		}
	return team;
}

// Takes one project's row, its Team Assigned rows and its trip's stops (#188) into the lists, and into its Project
// panel when it has loaded.
function takeProjectRow(look: LookState, row: SavedRowType, team: RowType[], stops: RowType[]) {
	look.fromServer[row.id] = { values: { ...row.values }, team, stops: stops.map(toRow) };
	for (const key of look.teamRowIds.keys())
		if (key.startsWith(`${row.id}/`)) look.teamRowIds.delete(key);
	for (const item of team) look.teamRowIds.set(`${row.id}/${String(item.values.teamId)}`, item.id);
	const own = look.workspaces[row.id]?.find((panel) => panel.kind === 'project');
	if (own) fillProjectPanel(look, own, row.values, team);
	return toProject(look, row, team, stops);
}

// The server's projects into the lists, newest first. A project gone from the server (someone moved it to the
// Trash) leaves the screens; if it was open, the User is told.
function takeProjects(look: LookState, rows: SavedRowType[]) {
	const team = teamOf(rows);
	const stops = stopsByProject(rows);
	const projects = rows
		.filter((row) => row.table === 'project' && !row.deletedAt)
		.map((row) => takeProjectRow(look, row, team.get(row.id) ?? [], stops.get(row.id) ?? []))
		.reverse();
	const ids = new Set(projects.map((project) => project.id));
	for (const id of Object.keys(look.workspaces)) if (!ids.has(id)) delete look.workspaces[id];
	for (const id of Object.keys(look.fromServer)) if (!ids.has(id)) delete look.fromServer[id];
	const open = look.projects.find((project) => project.id === look.projectId);
	look.projects = projects;
	if (open && !ids.has(open.id) && look.screen === 'workspace') {
		look.say(`"${open.title}" was moved to the Trash by someone else`);
		look.home();
	}
}

/**
 * One project's rows (`fetchProject`) into the screens: its row and Team Assigned when they come along, its
 * personnel, and its panels in order, in place of what the screens held of it.
 */
export function takeProject(look: LookState, projectId: string, rows: SavedRowType[]) {
	const row = rows.find((item) => item.table === 'project' && item.id === projectId);
	if (row) {
		const project = takeProjectRow(
			look,
			row,
			teamOf(rows).get(projectId) ?? [],
			stopsByProject(rows).get(projectId) ?? []
		);
		const index = look.projects.findIndex((item) => item.id === projectId);
		if (index < 0) look.projects.unshift(project);
		else look.projects[index] = project;
	}
	const panels = rows
		.filter((item) => item.table === 'panel')
		.sort(byPosition)
		.map((item) =>
			panelOf({
				id: item.id,
				key: text(item.values, 'key') || undefined,
				name: text(item.values, 'name'),
				icon: text(item.values, 'icon'),
				kind: text(item.values, 'kind') as PanelType['kind'],
				control: text(item.values, 'control') as PanelType['control'],
				isEnabled: Boolean(item.values.isEnabled)
			})
		);
	const own = panels.find((panel) => panel.kind === 'project');
	const saved = look.fromServer[projectId];
	if (own && saved) fillProjectPanel(look, own, saved.values, saved.team);
	if (own) own.personnel = toPersonnel(rows);
	// #189: a photo panel's groups and photos.
	for (const panel of panels) if (panel.kind === 'photos') takePhotos(panel, rows);
	// What the panels hold (#188). The stops come with the project's row; while a change waits to be sent only the
	// rows inside it come, and the stops stay as the lists last gave them.
	const inside = row ? rows : [...rows, ...(saved?.stops ?? [])];
	for (const panel of panels) takePanelRows(look, panel, inside);
	look.workspaces[projectId] = panels;
}

function toPersonnel(rows: SavedRowType[]): PersonnelType[] {
	const people = rows.filter((row) => row.table === 'personnel_person').sort(byPosition);
	return rows
		.filter((row) => row.table === 'personnel_company')
		.sort(byPosition)
		.map((company) => ({
			id: company.id,
			company: text(company.values, 'company'),
			people: people
				.filter((person) => person.values.companyId === company.id)
				.map((person) => ({
					id: person.id,
					name: text(person.values, 'name'),
					title: text(person.values, 'title')
				}))
		}));
}

/** The columns only the server sets, from an applied batch (a new project's J count), into the screens. */
export function takeReads(look: LookState, reads: RowType[]) {
	for (const read of reads) {
		if (read.table !== 'project') continue;
		const project = look.projects.find((item) => item.id === read.id);
		if (project) {
			if (read.values.job) project.job = Number(read.values.job);
			if (read.values.createdBy) project.createdBy = String(read.values.createdBy);
		}
		const saved = look.fromServer[read.id];
		if (saved) Object.assign(saved.values, read.values);
	}
}

/** Whether a row is one of a project's (the project itself, or any row inside it): what opening it reloads. */
export function isOfProject(projectId: string) {
	return (row: RowType) =>
		(row.table === 'project' && row.id === projectId) || row.values.projectId === projectId;
}
