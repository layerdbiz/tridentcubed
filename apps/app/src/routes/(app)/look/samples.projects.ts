// Sample projects, one for every state a project can be in (Justin, 2026-11-16: "I still want to start off with
// some sample data even though it's not real, just so they can see how it's supposed to look … for all of the
// possible states that a project can be in"). Each is plainly a sample: its title says so. They are made the way a
// person makes a project (LookState.create, then its panels filled in), so they save through the one save command
// like any other, with the customers, team, transport modes and facilities that are really there.
//
// They are made in two steps, with a save between: a Sent, Complete or Archived project takes no change but its
// status (the server refuses the rest), so every project is filled in first and given its state after.
import { draftPanel, itemOf, stopOf, type PanelType, type StatusType } from './look.data';
import type { LookState } from './look.state.svelte';
import { toSampleDay, toSamplePhotos } from './samples';

/** What marks a project as a sample, at the start of its title. */
export const SAMPLE_MARK = 'Sample: ';

type SampleType = {
	status: StatusType;
	title: string;
	subtitle: string;
	type: string;
	customer: string;
	location: string;
	/** The trip: a transport mode and the facilities it starts and ends at. */
	trip?: { transport: string; start: string; end?: string };
	/** Whether Items and the Time Log are filled in too. Every sample has photos. */
	isFull?: boolean;
};

export const SAMPLE_PROJECTS: SampleType[] = [
	{
		status: 'Draft',
		title: 'Barge loadout survey',
		subtitle: '',
		type: '',
		customer: '',
		location: ''
	},
	{
		status: 'In Progress',
		title: 'Transformer discharge',
		subtitle: 'Two transformers and their accessories',
		type: 'Cargo',
		customer: 'CEVA Logistics',
		location: 'La Porte, TX',
		trip: { transport: 'Happy Star', start: 'Barbours Cut Container Terminal' }
	},
	{
		status: 'Review',
		title: 'Wind blade stowage check',
		subtitle: 'Blades on deck, lashing and securing',
		type: 'Cargo',
		customer: 'UTC Overseas',
		location: 'Corpus Christi, TX',
		trip: { transport: 'BBC Amber', start: 'Port of Corpus Christi', end: 'Port of Galveston' },
		isFull: true
	},
	{
		status: 'Ready',
		title: 'Turbine rotor heavy lift',
		subtitle: 'Tandem lift from ship to rail',
		type: 'Cargo',
		customer: 'dship Carriers',
		location: 'Houston, TX',
		trip: {
			transport: 'Jumbo Kinetic',
			start: 'Turning Basin Terminal',
			end: 'Union Pacific Englewood Yard'
		},
		isFull: true
	},
	{
		status: 'Sent',
		title: 'Reactor vessel discharge',
		subtitle: 'Discharge to a deck barge',
		type: 'Cargo',
		customer: 'US Ocean',
		location: 'New Orleans, LA',
		trip: { transport: 'Happy Star', start: 'Port of New Orleans', end: 'Turning Basin Terminal' },
		isFull: true
	},
	{
		status: 'Revision',
		title: 'Bunker quantity survey',
		subtitle: 'Before and after bunkering',
		type: 'Bunker',
		customer: 'Oslo Caribbean Carrier',
		location: 'Galveston, TX',
		trip: { transport: 'BBC Amber', start: 'Port of Galveston' },
		isFull: true
	},
	{
		status: 'Complete',
		title: 'Pre-loading warehouse survey',
		subtitle: 'Condition of crated machinery before loading',
		type: 'Warehousing',
		customer: 'KOGA',
		location: 'Pasadena, TX',
		trip: {
			transport: 'Mammoet Actros 4161',
			start: 'Bayport Container Terminal',
			end: 'Turning Basin Terminal'
		},
		isFull: true
	},
	{
		status: 'Archived',
		title: 'Draft survey of a steel cargo',
		subtitle: 'Initial and final draft surveys',
		type: 'Draft Survey',
		customer: 'DIX Shipping',
		location: 'Beaumont, TX',
		trip: { transport: 'Jumbo Kinetic', start: 'Port of Beaumont' },
		isFull: true
	}
];

const SAMPLE_ITEMS: [quantity: string, description: string][] = [
	['2', 'Power transformers, 180 t each'],
	['27', 'Accessory crates']
];

/** Whether the sample projects are already here: they are never made twice. */
export function hasSamples(look: LookState) {
	return look.projects.some((project) => project.title.startsWith(SAMPLE_MARK));
}

/**
 * The samples that were made but never given their state (Justin, 2026-11-17: on the live site every sample's bar
 * was blue). That is what is left when the first save takes too long and the step after it never runs. Only when
 * none of them has its state yet: a sample someone has since moved back is theirs to leave where it is.
 */
export function unfinishedSamples(look: LookState) {
	const waiting: { project: LookState['projects'][number]; status: StatusType }[] = [];
	for (const sample of SAMPLE_PROJECTS) {
		if (sample.status === 'Draft' || sample.status === 'In Progress') continue;
		// Archiving is an Admin's to do.
		if (sample.status === 'Archived' && !look.isAdmin) continue;
		const project = look.projects.find((each) => each.title === `${SAMPLE_MARK}${sample.title}`);
		if (!project) continue;
		if (project.status !== 'Draft' && project.status !== 'In Progress') return [];
		waiting.push({ project, status: sample.status });
	}
	return waiting;
}

function setField(panel: PanelType, label: string, value: string) {
	const field = panel.fields.find((each) => each.label === label);
	if (field) field.value = value;
}

// One sample, made as a person makes a project and filled in. It is left open on Edit; the caller goes home.
function make(look: LookState, sample: SampleType, lead: string, assigned: string[]) {
	const draft = draftPanel(look.organization.name, lead);
	setField(draft, 'Title', `${SAMPLE_MARK}${sample.title}`);
	setField(draft, 'Subtitle', sample.subtitle);
	setField(draft, 'Project Type', sample.type);
	// Only a customer that is really there; a sample never makes one up.
	if (look.customers.includes(sample.customer)) setField(draft, 'Customer', sample.customer);
	// The Draft keeps its Project panel unfinished, which is what makes it a Draft.
	draft.assigned = sample.status === 'Draft' ? [] : assigned;
	look.create(draft);
	const id = look.projectId;
	const project = look.projects.find((each) => each.id === id);
	if (!project) return undefined;
	project.location = sample.location;

	for (const panel of look.workspaces[id] ?? []) {
		if (panel.kind === 'transport' && sample.trip) {
			const { transport, start, end } = sample.trip;
			const has = (name: string) => look.facilities.some((each) => each.name === name);
			if (look.transports.some((each) => each.name === transport) && has(start)) {
				const leg = crypto.randomUUID();
				const places = end && has(end) ? [start, end] : [start];
				panel.stops = places.map((facility, index) => ({
					...stopOf({ point: index === 0 ? 'Start' : 'End', transport, facility }, look.transports),
					leg
				}));
			}
		}
		// Every sample has photos, so its card and its report show what a project looks like (Justin, 2026-11-17:
		// "We need to have photos on these projects").
		if (panel.kind === 'photos' && panel.isEnabled)
			panel.groups = [
				{
					id: crypto.randomUUID(),
					title: 'Overview',
					description: '',
					layout: 4,
					photos: toSamplePhotos(panel.name.length, 4, () => crypto.randomUUID())
				}
			];
		if (!sample.isFull || !panel.isEnabled) continue;
		if (panel.kind === 'items')
			panel.items = SAMPLE_ITEMS.map(([quantity, description]) => itemOf(quantity, description));
		if (panel.kind === 'timelog') {
			const first = toSampleDay(undefined, () => crypto.randomUUID(), new Date(project.created));
			panel.days = [first, toSampleDay(first.date, () => crypto.randomUUID())];
		}
	}
	return id;
}

/**
 * Adds the sample projects. `settle` waits until what has been made is saved; it answers whether it was. Gives how
 * many were added: none when they are already here, or when the first step was not saved in time (the samples are
 * then finished by `finishSampleProjects` once it is).
 */
export async function addSampleProjects(look: LookState, settle: () => Promise<boolean>) {
	if (hasSamples(look)) return 0;
	const names = look.members.map((member) => member.name);
	const lead = look.me?.name ?? names[0] ?? '';
	const others = names.filter((name) => name !== lead);
	let made = 0;
	for (const [index, sample] of SAMPLE_PROJECTS.entries()) {
		// Archiving is an Admin's to do, so only an Admin gets the Archived sample.
		if (sample.status === 'Archived' && !look.isAdmin) continue;
		const assigned = others.length
			? [others[index % others.length], others[(index + 1) % others.length]]
			: [];
		const id = make(look, sample, lead, [...new Set(assigned)]);
		// Home writes the trip and the progress onto the project's row, as leaving a project does.
		look.home();
		if (id) made += 1;
	}
	if (!(await settle())) return 0;
	await finishSampleProjects(look, settle);
	return made;
}

/**
 * The second step on its own: gives each sample that was made its state. For samples whose first save came through
 * after `addSampleProjects` had given up waiting. Gives how many it changed.
 */
export async function finishSampleProjects(look: LookState, settle: () => Promise<boolean>) {
	const waiting = unfinishedSamples(look);
	for (const { project, status } of waiting) look.setStatus(project, status);
	if (waiting.length) await settle();
	return waiting.length;
}
