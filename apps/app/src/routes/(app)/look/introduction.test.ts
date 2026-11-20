// The report's opening sentence (#244): what it says with nothing typed, and what typing changes.
import { describe, expect, it } from 'vite-plus/test';
import { introductionOf, toIntroduction } from './introduction';
import { createPanels, type PanelType, type ProjectType, type StopType } from './look.data';

const ORGANIZATION = { name: 'Trident Cubed' };

function stop(name: string, facility: string, leg: string, point: StopType['point']): StopType {
	return { id: `${leg}-${facility}`, point, type: 'Sea', mode: 'Vessel', name, facility, leg };
}

// A project as it opens: its own row and its panels, the trip and the Time Log filled in.
function lookOf(change: (panels: PanelType[], project: ProjectType) => void = () => {}) {
	const project = {
		title: 'MSC Susanna',
		subtitle: 'Loading 1x Machine',
		type: 'Cargo',
		client: 'NMT Projects',
		team: ['Michael Boone'],
		stops: [],
		location: 'Pasadena, TX',
		created: '2026-11-18T08:00',
		day: '2026-10-27'
	} as unknown as ProjectType;
	const panels = createPanels(project);
	panelOf(panels, 'transport').stops = [
		stop('MSC Susanna', 'Bayport Container Terminal', 'sea', 'Start')
	];
	panelOf(panels, 'timelog').days = [{ id: 'day-1', date: '2026-11-18', entries: [] }];
	change(panels, project);
	return { organization: ORGANIZATION, project, panels };
}

function panelOf(panels: PanelType[], kind: string) {
	return panels.find((panel) => panel.kind === kind) as PanelType;
}

describe('the opening sentence with nothing typed', () => {
	it('says who was where, when and for what, in words that fit a loading and a discharge alike', () => {
		expect(introductionOf(lookOf())).toBe(
			'This is to report that Trident Cubed was present at Bayport Container Terminal – Pasadena, TX on Wed, 18 Nov 2026 for the purpose of conducting a cargo survey in connection with the MSC Susanna.'
		);
	});

	it('names the cargo typed into the Items panel', () => {
		const look = lookOf((panels) => {
			panelOf(panels, 'items').items = [
				{ id: 'a', quantity: '2', description: 'Power Transformers' },
				{ id: 'b', quantity: '27', description: 'Accessory Crates' },
				{ id: 'c', quantity: '', description: '  ' }
			];
		});
		expect(introductionOf(look)).toContain(
			'a cargo survey of 2 power transformers and 27 accessory crates in connection with the MSC Susanna.'
		);
	});

	it('names the cargo of a pasted packing list, as the sheet wrote it (Michael, 2026-11-19: it said none)', () => {
		const look = lookOf((panels) => {
			panelOf(panels, 'items').grid = {
				name: '',
				cells: [
					['Qty', 'Description', 'Total Weight (LBS)'],
					['1', 'EPIROC PV271D SN 5116 (STATIC)', '143,200'],
					['1', 'TOWER', '59,200'],
					['2', 'TOTALS', '202,400']
				]
			};
		});
		expect(introductionOf(look)).toContain(
			'a cargo survey of 1 EPIROC PV271D SN 5116 (STATIC) and 1 TOWER in connection with'
		);
	});

	it('counts a long packing list in place of reading it out', () => {
		const look = lookOf((panels) => {
			panelOf(panels, 'items').grid = {
				name: '',
				cells: [
					['Qty', 'Description'],
					['1', 'Crate A'],
					['1', 'Crate B'],
					['4', 'Crate C'],
					['2', 'Crate D']
				]
			};
		});
		expect(introductionOf(look)).toContain('a cargo survey of 4 items in connection with');
	});

	it('lets typed items speak for a project that has a packing list too', () => {
		const look = lookOf((panels) => {
			const items = panelOf(panels, 'items');
			items.items = [{ id: 'a', quantity: '1', description: 'Machine' }];
			items.grid = {
				name: '',
				cells: [
					['Qty', 'Description'],
					['1', 'TOWER']
				]
			};
		});
		expect(introductionOf(look)).toContain('a cargo survey of 1 machine in connection with');
	});

	it('names the facility the project is at and the transport that calls there, not the whole trip', () => {
		const look = lookOf((panels) => {
			panelOf(panels, 'transport').stops = [
				stop('MSC Susanna', 'Bayport Container Terminal', 'sea', 'Start'),
				stop('MSC Susanna', 'Port of Veracruz', 'sea', 'End'),
				{ ...stop('Mammoet Actros', 'Port of Veracruz', 'road', 'Start'), mode: 'Truck' }
			];
		});
		expect(introductionOf(look)).toBe(
			'This is to report that Trident Cubed was present at Bayport Container Terminal – Pasadena, TX on Wed, 18 Nov 2026 for the purpose of conducting a cargo survey in connection with the MSC Susanna.'
		);
	});

	it('runs from the first day worked to the last, and uses the project date before any', () => {
		const days = lookOf((panels) => {
			panelOf(panels, 'timelog').days = [
				{ id: 'b', date: '2026-11-19', entries: [] },
				{ id: 'a', date: '2026-11-18', entries: [] }
			];
		});
		expect(introductionOf(days)).toContain(' on Wed, 18 Nov 2026 to Thu, 19 Nov 2026 for ');
		const none = lookOf((panels) => {
			panelOf(panels, 'timelog').days = [];
		});
		expect(introductionOf(none)).toContain(' on Tue, 27 Oct 2026 for ');
	});

	it('still reads as a sentence before the trip is filled in', () => {
		const look = lookOf((panels, project) => {
			panelOf(panels, 'transport').stops = [];
			project.location = '';
		});
		expect(introductionOf(look)).toBe(
			'This is to report that Trident Cubed was present at the facility on Wed, 18 Nov 2026 for the purpose of conducting a cargo survey.'
		);
	});
});

describe('the survey a Project Type names', () => {
	const parts = {
		organization: 'Trident Cubed',
		facility: 'Bayport Container Terminal',
		location: '',
		dates: 'Wed, 18 Nov 2026',
		cargo: '',
		transport: ''
	};

	it.each([
		['Cargo', 'a cargo survey.'],
		['Vessel Condition', 'a vessel condition survey.'],
		['Bunker', 'a bunker survey.'],
		['', 'a cargo survey.']
	])('%s reads "%s"', (type, ending) => {
		expect(toIntroduction({ ...parts, type })).toContain(`conducting ${ending}`);
	});

	it('does not say survey twice (Draft Survey read "draft survey survey")', () => {
		expect(toIntroduction({ ...parts, type: 'Draft Survey' })).toContain(
			'conducting a draft survey.'
		);
	});

	it('keeps initials as typed and says "an" before a vowel', () => {
		expect(toIntroduction({ ...parts, type: 'IHM' })).toContain('conducting an IHM survey.');
	});
});

describe('the opening sentence someone typed', () => {
	it('prints as typed, in place of the one worked out', () => {
		const look = lookOf((panels) => {
			panelOf(panels, 'project').introduction =
				'  Trident Cubed attended the loading of cargo on board the MSC Susanna.  ';
		});
		expect(introductionOf(look)).toBe(
			'Trident Cubed attended the loading of cargo on board the MSC Susanna.'
		);
	});

	it('goes back to the one worked out when it is cleared', () => {
		const look = lookOf((panels) => {
			panelOf(panels, 'project').introduction = '   ';
		});
		expect(introductionOf(look)).toContain('This is to report that Trident Cubed was present at');
	});
});
