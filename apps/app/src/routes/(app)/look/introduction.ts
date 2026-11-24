// The report's opening sentence (#244; Michael, 2026-11-19: a loading job read "a cargo survey from the MSC
// Susanna"). Justin's call: no Load or Discharge control. The sentence is worked out from the project's records in
// words that fit any job, and the Project panel's Introduction field holds it for anyone to reword; what is typed
// there prints in its place, and clearing it brings the worked-out sentence back.
//
// Worked out, it names where the project is (the facility of its first stop, the one its Location comes from) and
// the transport that calls there, not every facility and transport of the trip; the cargo typed into the Items
// panel, else the item list read from a spreadsheet; and the days of the Time Log, else the project's date.
import { legsOf } from './legs';
import { cityStateOf } from './location';
import {
	createdDayOf,
	dayOf,
	type OrganizationType,
	type PanelType,
	type ProjectType
} from './look.data';
import { toTable } from './spreadsheet';

/** What the sentence is made of, each as it prints. Any of them but the organization and dates may be empty. */
export type IntroductionType = {
	organization: string;
	facility: string;
	location: string;
	dates: string;
	type: string;
	cargo: string;
	transport: string;
};

/** What the sentence reads from: the open project, its panels and the organization (a `LookState` is one). */
export type IntroductionSourceType = {
	organization: Pick<OrganizationType, 'name'>;
	project: Pick<ProjectType, 'location' | 'day' | 'created'>;
	panels: PanelType[];
};

/** What the Project panel calls the field that holds the sentence. */
export const INTRODUCTION_LABEL = 'Description';

// A packing list this short is read out; a longer one is counted.
const READ_OUT = 3;
const NAME_LIMIT = 60;

/** "A", "A and B", "A, B and C". */
export function listOf(names: string[]) {
	return names.length < 2
		? (names[0] ?? '')
		: `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

// "a cargo survey", "a draft survey" (never "survey survey"), "an IHM survey": the Project Type in small letters
// but for its initials, with "survey" after it unless it ends in it.
function surveyOf(type: string) {
	const words = (type.trim() || 'Cargo')
		.split(/\s+/)
		.map((word) => (/^[A-Z0-9]{2,}$/.test(word) ? word : word.toLowerCase()))
		.join(' ');
	const name = /\bsurvey$/i.test(words) ? words : `${words} survey`;
	return `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
}

/** The sentence its parts make. */
export function toIntroduction(parts: IntroductionType) {
	const place = `${parts.facility || 'the facility'}${parts.location ? ` – ${cityStateOf(parts.location)}` : ''}`;
	const cargo = parts.cargo ? ` of ${parts.cargo}` : '';
	const transport = parts.transport ? ` in connection with the ${parts.transport}` : '';
	return `This is to report that ${parts.organization} was present at ${place} on ${parts.dates} for the purpose of conducting ${surveyOf(parts.type)}${cargo}${transport}.`;
}

// The cargo as words: "2 power transformers and 27 accessory crates" from the typed rows; else the spreadsheet's
// items as the sheet wrote them, or how many there are when the list is long or its items cannot be told apart.
function cargoOf(panel: PanelType | undefined) {
	const typed = (panel?.items ?? []).filter((item) => item.description.trim());
	if (typed.length)
		return listOf(
			typed.map((item) =>
				[item.quantity.trim(), item.description.trim().toLowerCase()].filter(Boolean).join(' ')
			)
		);
	if (!panel?.isEnabled || !panel.grid) return '';
	const table = toTable(panel.grid);
	if (!table.rows.length) return '';
	const count = `${table.rows.length} ${table.rows.length === 1 ? 'item' : 'items'}`;
	const item = table.columns.findIndex((column) => column.kind === 'item');
	const quantity = table.columns.findIndex((column) => column.kind === 'quantity');
	if (item < 0 || table.rows.length > READ_OUT) return count;
	const names = table.rows.map((row) =>
		[row[quantity], row[item]]
			.map((lines) => (lines ?? []).map((line) => line.text).join(' '))
			.filter(Boolean)
			.join(' ')
	);
	return names.every((name) => name && name.length <= NAME_LIMIT) ? listOf(names) : count;
}

// The days the team was there: the Time Log's day, or its first to its last; before any, the project's date.
function datesOf(source: IntroductionSourceType) {
	const days = (source.panels.find((panel) => panel.kind === 'timelog')?.days ?? [])
		.map((day) => day.date)
		.filter(Boolean)
		.toSorted();
	if (!days.length) return dayOf(createdDayOf(source.project));
	return days[0] === days.at(-1) ? dayOf(days[0]) : `${dayOf(days[0])} to ${dayOf(days.at(-1)!)}`;
}

/** The sentence worked out from the project's records, whatever is typed in the Introduction field. */
export function generatedOf(source: IntroductionSourceType) {
	const { panels } = source;
	const stops = panels.find((panel) => panel.kind === 'transport')?.stops ?? [];
	const facility = stops.find((stop) => stop.facility)?.facility ?? '';
	// The transport of each leg that calls at that facility; with no facility yet, every transport named.
	const calling = facility
		? legsOf(stops)
				.filter((leg) => leg.stops.some((stop) => stop.facility === facility))
				.flatMap((leg) => leg.stops)
		: stops;
	return toIntroduction({
		organization: source.organization.name,
		facility,
		location: source.project.location,
		dates: datesOf(source),
		type:
			panels
				.find((panel) => panel.kind === 'project')
				?.fields.find((field) => field.label === 'Project Type')?.value ?? '',
		cargo: cargoOf(panels.find((panel) => panel.kind === 'items')),
		transport: listOf([...new Set(calling.map((stop) => stop.name).filter(Boolean))])
	});
}

/** The report's opening sentence: the one typed in the Introduction field, else the one worked out. */
export function introductionOf(source: IntroductionSourceType) {
	const typed = source.panels.find((panel) => panel.kind === 'project')?.introduction?.trim();
	return typed || generatedOf(source);
}
