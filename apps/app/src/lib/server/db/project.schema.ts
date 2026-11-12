// Projects and what their Project panel holds, and a project's panels (spec #179 "Tables", #186). A project names its
// customer, contact and Team Lead by id, so renaming one of them shows on every project without rewriting it. Its
// Team Assigned, its personnel (by company, then each company's people) and its panels are ordered rows of it.
//
// Every row inside a project carries `project_id`, however deep it sits, so a project's rows load with one filter, the
// freeze of a Sent project reaches them without walking parents, and deleting a project sends them all to the Trash.
// `created_by`, `job` and `status_before_sent` are set by the server only (`#lib/server/rows.ts`). Row Level Security
// keeps every table to the acting organization.
import { sql } from 'drizzle-orm';
import { boolean, index, integer, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';
import { contact, customer } from './customer.schema';
import { organizationPolicy } from './policy';
import { rowColumns } from './rows';
import { team } from './team.schema';

function words(name: string) {
	return text(name).default('').notNull();
}

/** A project's statuses, in the glossary's order. */
export const STATUSES = [
	'Draft',
	'In Progress',
	'Review',
	'Ready',
	'Sent',
	'Revision',
	'Complete',
	'Archived'
] as const;

export type StatusType = (typeof STATUSES)[number];

export const project = pgTable(
	'project',
	{
		...rowColumns(),
		/** As typed in the Project panel; the screens show "Untitled project" for none. */
		title: words('title'),
		subtitle: words('subtitle'),
		projectType: words('project_type'),
		customerId: uuid('customer_id').references(() => customer.id),
		/** Which of the customer's contacts the report is for; none means the first. */
		contactId: uuid('contact_id').references(() => contact.id),
		teamLeadId: uuid('team_lead_id').references(() => team.id),
		/** Where it is: the city of its first stop's facility. */
		location: words('location'),
		status: text('status', { enum: STATUSES }).default('Draft').notNull(),
		/** The status it had before it was marked Sent, so Unsend goes back. Set by the server. */
		statusBeforeSent: words('status_before_sent'),
		/** Its percent, as its panels last worked it out, so the lists show it before the panels load. */
		progress: integer('progress').default(0).notNull(),
		/** The day it was made on the device that made it (YYYY-MM-DD): the day its number shows. */
		day: words('day'),
		/** Which of its customer's jobs that day it is: the J count of its number. Set by the server, once. */
		job: integer('job').default(1).notNull(),
		/** The User who made it. Set by the server. */
		createdBy: uuid('created_by').references(() => user.id, { onDelete: 'set null' })
	},
	(table) => [
		index('project_customer_day_idx').on(table.organizationId, table.customerId, table.day),
		organizationPolicy('project')
	]
).enableRLS();

function projectId() {
	return uuid('project_id')
		.notNull()
		.references(() => project.id, { onDelete: 'cascade' });
}

/** The Team Assigned of a project, in order (the Team Lead is the project's own `team_lead_id`). */
export const projectTeam = pgTable(
	'project_team',
	{
		...rowColumns(),
		projectId: projectId(),
		teamId: uuid('team_id')
			.notNull()
			.references(() => team.id),
		position: integer('position').default(0).notNull()
	},
	(table) => [
		index('project_team_project_idx').on(table.projectId),
		organizationPolicy('project_team')
	]
).enableRLS();

/** People on the job who are not on the team: one row per company, in order. */
export const personnelCompany = pgTable(
	'personnel_company',
	{
		...rowColumns(),
		projectId: projectId(),
		position: integer('position').default(0).notNull(),
		company: words('company')
	},
	(table) => [
		index('personnel_company_project_idx').on(table.projectId),
		organizationPolicy('personnel_company')
	]
).enableRLS();

/** A company's people on the job, in order: a name and a title each. */
export const personnelPerson = pgTable(
	'personnel_person',
	{
		...rowColumns(),
		projectId: projectId(),
		companyId: uuid('company_id')
			.notNull()
			.references(() => personnelCompany.id, { onDelete: 'cascade' }),
		position: integer('position').default(0).notNull(),
		name: words('name'),
		title: words('title')
	},
	(table) => [
		index('personnel_person_project_idx').on(table.projectId),
		organizationPolicy('personnel_person')
	]
).enableRLS();

/** A project's panels in order. The built-in ones carry their `key`; a panel added on the project has none. */
export const panel = pgTable(
	'panel',
	{
		...rowColumns(),
		projectId: projectId(),
		kind: text('kind', { enum: ['project', 'transport', 'items', 'timelog', 'photos'] }).notNull(),
		key: words('key'),
		name: words('name'),
		icon: words('icon'),
		control: text('control', { enum: ['locked', 'switch', 'remove'] })
			.default('locked')
			.notNull(),
		isEnabled: boolean('is_enabled').default(true).notNull(),
		position: integer('position').default(0).notNull()
	},
	(table) => [
		index('panel_project_idx').on(table.projectId),
		organizationPolicy('panel'),
		// One built-in panel of each key per project.
		uniqueIndex('panel_key_idx')
			.on(table.projectId, table.key)
			.where(sql`key <> '' and deleted_at is null`)
	]
).enableRLS();
