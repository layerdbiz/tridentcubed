// How much of a section is filled in, said the way a panel says it: "2 of 7 complete" (Justin, 2026-11-16: every
// section that opens and closes shows this under its name, in place of a line describing it).
// #229 (Justin, 2026-11-18: "each item completed should represent the input inside of that section ... fix it in
// a single place"): this file is that place. `sectionsOf` lists the inputs every section of a panel holds, in the
// order the panel draws them; a section's line, its panel's line, the panel's percent and the project's percent
// are all counted from that one list (`valuesOf`, and `metricsOf` in look.state.svelte.ts), so they cannot
// disagree. The rule: every input a person fills in counts once, and it is done when it holds something (words, a
// pick, a list with something in it, or a plain yes). A switch, the photos-per-page buttons and a facility's
// Start, Stop or End are settings, not inputs, and do not count; nor does an input that is greyed out because
// there is nothing to pick (the Contact of a customer with no contacts). An input added to a panel is added here.
// #305: tapping a panel's or the project's percent lists the inputs that keep it under 100% (`emptyOf`), read from
// this same list, so every input a count is short of is named, and each one opens its input.
import { INTRODUCTION_LABEL } from './introduction';
import { legsOf } from './legs';
import { LINK_LABEL, toLink } from './link';
import { isPdfAttachment, type OrganizationType, type PanelType } from './look.data';
import { isStored } from './mapper.photos';

export type TallyType = { done: number; total: number };
/** One input. An optional one counts like the rest; it only never holds a status back (`hasRequired`). */
export type InputType = { label: string; value: unknown; isOptional?: boolean };
/** A section that opens and closes, by its id: a fixed name, or the id of the day, group, leg or company. */
export type SectionType = { id: string; inputs: InputType[] };

/**
 * The labels of the inputs a panel marks with `data-input` for the empty-inputs list to find (focus.ts, #305): an
 * input with no label drawn of its own (an Add button, a file picker) or one read out in more words ("Quantity of
 * item 2"). The panels mark them with these, so the list and the mark cannot name an input differently.
 */
export const MARKED_LABELS = {
	quantity: 'Quantity',
	description: 'Description',
	item: 'Item',
	day: 'Day',
	time: 'Time',
	activity: 'Activity',
	photos: 'Photos',
	transportMode: 'Transport Mode'
} as const;

function isDone(value: unknown) {
	if (typeof value === 'string') return value.trim().length > 0;
	if (Array.isArray(value)) return value.length > 0;
	return Boolean(value);
}

export function tallyOf(values: unknown[]): TallyType {
	return { done: values.filter(isDone).length, total: values.length };
}

/**
 * A share as a whole percent that never says more or less than is so: 100 only once everything is done and 0 only
 * while nothing is (#328: 199 of 200 rounded up to 100%, and a panel read Complete with an input still empty).
 */
export function toPercent(done: number, total: number) {
	if (!total || done <= 0) return 0;
	if (done >= total) return 100;
	return Math.min(99, Math.max(1, Math.round((done / total) * 100)));
}

/** "2 of 7 complete". A section with nothing in it yet has one thing to do, as a panel with no rows does. */
export function toTally(values: unknown[]) {
	const { done, total } = tallyOf(values);
	return `${done} of ${Math.max(1, total)} complete`;
}

/** What one section's inputs hold, for its header's line. A section that is not counted has none. */
export function valuesOf(sections: SectionType[], id: string) {
	return sections.find((section) => section.id === id)?.inputs.map((input) => input.value) ?? [];
}

/**
 * An input that holds nothing yet (#305): its section, its label, and which of that section's inputs with this label
 * it is, from 0 (the second row's Quantity is 1), so the screen can find it among the inputs it draws.
 */
export type EmptyType = { section: string; label: string; nth: number };

/**
 * The inputs these sections hold that are not done, in the order the panel draws them: what keeps the count under
 * its total and the percent under 100. An optional input counts toward the percent, so it is named too.
 */
export function emptyOf(sections: SectionType[]): EmptyType[] {
	const empty: EmptyType[] = [];
	for (const section of sections) {
		const seen = new Map<string, number>();
		for (const input of section.inputs) {
			const nth = seen.get(input.label) ?? 0;
			seen.set(input.label, nth + 1);
			if (!isDone(input.value)) empty.push({ section: section.id, label: input.label, nth });
		}
	}
	return empty;
}

/** What the list of them is headed: "3 empty inputs in the Project panel", or "in this project". */
export function toEmptyNote(count: number, panelName?: string) {
	const where = panelName ? `the ${panelName} panel` : 'this project';
	return `${count} empty ${count === 1 ? 'input' : 'inputs'} in ${where}`;
}

/** Whether nothing a status waits for is missing: every input but the optional ones holds something. */
export function hasRequired(sections: SectionType[]) {
	return sections.every((section) =>
		section.inputs.every((input) => input.isOptional || isDone(input.value))
	);
}

// A panel with no rows yet (no transport mode, no item, no day) still has one thing to do, or it would read
// complete with nothing in it; that one thing is named for what is added first (#305: the list of what keeps a
// panel under 100% names it, so it says the same as the count).
function nothingYet(label: string): InputType {
	return { label, value: false };
}

function projectSections(panel: PanelType, contacts: { id: string }[]): SectionType[] {
	function field(label: string): InputType {
		return { label, value: panel.fields.find((item) => item.label === label)?.value };
	}
	// The Contact field shows the one picked, else the customer's first, so it holds one whenever the customer has
	// any. With none to pick it is greyed out, and counts for nothing.
	const contact = contacts.find((item) => item.id === panel.contact) ?? contacts[0];
	return [
		{
			id: 'project',
			inputs: [
				field('Title'),
				field('Subtitle'),
				// The report's opening sentence (#244) always holds something: what was typed, or the sentence
				// worked out from the project's records, which the field shows until someone rewords it.
				{ label: INTRODUCTION_LABEL, value: true },
				field('Project Type'),
				// These two always hold something: the day typed, or the day the project was made; the number typed,
				// or the next one, which the server gives a project as it is saved. Counting the number only once
				// the server had answered would change a project's percent with nobody touching it.
				{ label: 'Created Date', value: true },
				{ label: 'Job Number', value: true }
			]
		},
		{
			id: 'customer',
			inputs: [
				field('Customer'),
				...(contact ? [{ label: 'Contact', value: contact.id }] : []),
				{ label: 'Reference Number', value: panel.customerReference, isOptional: true }
			]
		},
		{
			id: 'team',
			inputs: [
				field('Organization'),
				{ label: 'Team Lead', value: panel.owner },
				// A job may need only one of Trident's people, its Team Lead (Justin, 2026-11-25, #328): the Team
				// Assigned is done once someone is assigned or a lead is picked, so a lead-only project reaches 100%.
				{ label: 'Team Assigned', value: panel.assigned.length > 0 || Boolean(panel.owner) }
			]
		},
		...(panel.personnel ?? []).map((company) => ({
			id: company.id,
			inputs: [
				{ label: 'Company', value: company.company },
				...company.people.flatMap((person) => [
					{ label: 'Name', value: person.name },
					{ label: 'Title', value: person.title }
				])
			]
		}))
	];
}

// A trip section is one transport mode: the mode, the transport itself once a mode is picked (its field is
// named for the mode: "Vessel"), then one field for each facility it calls at.
function transportSections(panel: PanelType): SectionType[] {
	if (!panel.stops.length)
		return [{ id: 'transport', inputs: [nothingYet(MARKED_LABELS.transportMode)] }];
	return legsOf(panel.stops).map((leg) => {
		const first = leg.stops[0];
		return {
			id: leg.id,
			inputs: [
				{ label: MARKED_LABELS.transportMode, value: first.mode },
				...(first.mode ? [{ label: first.mode, value: first.name }] : []),
				...leg.stops.map((stop) => ({ label: 'Facility', value: stop.facility }))
			]
		};
	});
}

// A photo panel's own title, then each group (in the Operations panel, a stage) that is switched on: one
// switched off is left out of the report, so it counts for nothing (#215). A photo counts once its file is
// stored, so every device works out the same percent from the same rows (#189). With no group switched on there
// is still one thing to do, or a panel holding nothing but its name would read complete. The Operations panel
// has one input more, above its stages: the link to the project's files (#233), filled in once it is an address
// the report can print.
function photoSections(panel: PanelType): SectionType[] {
	const groups = panel.groups.filter((group) => group.isEnabled);
	return [
		{
			id: 'panel',
			inputs: [
				{ label: 'Title', value: panel.name },
				...(panel.key === 'operations'
					? [{ label: LINK_LABEL, value: toLink(panel.link), isOptional: true }]
					: []),
				...(groups.length ? [] : [{ label: MARKED_LABELS.photos, value: false }])
			]
		},
		...groups.map((group) => ({
			id: group.id,
			inputs: [
				{ label: 'Title', value: group.title },
				{ label: 'Description', value: group.description, isOptional: true },
				{ label: MARKED_LABELS.photos, value: group.photos.some(isStored) }
			]
		}))
	];
}

/** Whether the Items panel holds its item list as a whole: read from a spreadsheet, or an attached PDF. */
function hasItemList(panel: PanelType) {
	return Boolean(panel.grid) || (panel.attachments ?? []).some(isPdfAttachment);
}

/**
 * The inputs each section of a panel holds, as the panel draws them. `contacts` are the picked customer's, which
 * the Project panel's Contact field reads.
 */
export function sectionsOf(panel: PanelType, contacts: { id: string }[] = []): SectionType[] {
	if (panel.kind === 'project') return projectSections(panel, contacts);
	if (panel.kind === 'transport') return transportSections(panel);
	if (panel.kind === 'items')
		return [
			{
				id: 'items',
				inputs: [
					...panel.items.flatMap((item) => [
						{ label: MARKED_LABELS.quantity, value: item.quantity },
						{ label: MARKED_LABELS.description, value: item.description }
					]),
					// #242: the item list read from a spreadsheet is one input, there or not. #290 (Justin, 2026-11-25):
					// an attached PDF is the item list too, so a panel holding only a PDF is complete.
					...(hasItemList(panel) ? [{ label: 'Item List', value: true }] : []),
					...(panel.items.length || hasItemList(panel) ? [] : [nothingYet(MARKED_LABELS.item)])
				]
			}
		];
	if (panel.kind === 'timelog') {
		if (!panel.days.length) return [{ id: 'timelog', inputs: [nothingYet(MARKED_LABELS.day)] }];
		return panel.days.map((day) => ({
			id: day.id,
			inputs: [
				{ label: 'Date', value: day.date },
				...day.entries.flatMap((entry) => [
					{ label: MARKED_LABELS.time, value: entry.time },
					{ label: MARKED_LABELS.activity, value: entry.activity }
				])
			]
		}));
	}
	return photoSections(panel);
}

type WordingType = Pick<
	OrganizationType,
	| 'logo'
	| 'name'
	| 'address'
	| 'phone'
	| 'email'
	| 'groupEmail'
	| 'website'
	| 'disclaimer'
	| 'closing'
	| 'signoff'
>;

/** The inputs each section of the Settings screen holds: Details, Disclaimer and Sign-off. */
export function organizationSectionsOf(organization: WordingType): SectionType[] {
	return [
		{
			id: 'details',
			inputs: [
				{ label: 'Logo', value: organization.logo },
				{ label: 'Name', value: organization.name },
				{ label: 'Address', value: organization.address },
				{ label: 'Phone', value: organization.phone },
				{ label: 'Email', value: organization.email },
				{ label: 'Group Email', value: organization.groupEmail },
				{ label: 'Website', value: organization.website }
			]
		},
		{
			id: 'disclaimer',
			inputs: [
				{ label: 'Opening', value: organization.disclaimer.opening },
				...organization.disclaimer.points.flatMap((point) => [
					{ label: 'Point title', value: point.title },
					{ label: 'Point text', value: point.text }
				]),
				{ label: 'Note', value: organization.disclaimer.note }
			]
		},
		{
			id: 'signoff',
			inputs: [
				{ label: 'Closing', value: organization.closing },
				{ label: 'Sign-off', value: organization.signoff }
			]
		}
	];
}
