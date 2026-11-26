import { describe, expect, it } from 'vite-plus/test';
import { groupOf, itemOf, panelOf, type PanelType } from './look.data';
import {
	isSpanish,
	keptWordsOf,
	textsOf,
	toEnglish,
	toTranslations,
	translateText
} from './translation';

function panel(kind: PanelType['kind'], name: string, values: Partial<PanelType> = {}): PanelType {
	return {
		...panelOf({
			id: `${kind}-panel`,
			name,
			icon: '',
			kind,
			control: 'locked',
			isEnabled: true
		}),
		...values
	};
}

function projectOf(): PanelType[] {
	const operations = panel('photos', 'Operations', {
		groups: [
			{
				...groupOf('Carga'),
				description: 'Inicio de carga en bodega 2',
				photos: [
					{ id: 'p1', src: '/files/1', description: 'Grúa detenida por lluvia' },
					{ id: 'p2', src: '/files/2', description: '' },
					{ id: 'p3', src: '/files/3', description: 'Grúa detenida por lluvia' }
				]
			}
		]
	});
	return [
		panel('project', 'Project', { introduction: 'Llegada del buque al muelle' }),
		operations,
		panel('timelog', 'Time Log', {
			days: [
				{
					id: 'd1',
					date: '2026-11-25',
					entries: [
						{ id: 'e1', time: '07:30', activity: ' Llegada del buque  ' },
						{ id: 'e2', time: '08:00', activity: '07:45' }
					]
				}
			]
		}),
		panel('items', 'Items', { items: [itemOf('2', 'Transformadores'), itemOf('1', '')] })
	];
}

describe('the typed texts of a report', () => {
	it('lists each text that prints once, trimmed, with where it is', () => {
		expect(textsOf(projectOf())).toEqual([
			{ source: 'Llegada del buque al muelle', where: ['Project'] },
			{ source: 'Operations', where: ['Operations'] },
			{ source: 'Carga', where: ['Operations'] },
			{ source: 'Inicio de carga en bodega 2', where: ['Operations'] },
			{ source: 'Grúa detenida por lluvia', where: ['Operations'] },
			{ source: 'Llegada del buque', where: ['Time Log'] },
			{ source: 'Transformadores', where: ['Items'] }
		]);
	});
});

describe('every typed text the report prints', () => {
	it('takes in the title and subtitle, a photo panel’s name and the personnel’s job titles', () => {
		const [project, operations] = projectOf();
		project.fields = [
			{ id: 'f1', label: 'Title', type: 'text', value: 'BBC Kimberly' },
			{ id: 'f2', label: 'Subtitle', type: 'text', value: 'Inspección de descarga' },
			{ id: 'f3', label: 'Customer', type: 'select', value: 'Acme' }
		];
		project.personnel = [
			{
				id: 'c1',
				company: 'Grúas del Norte',
				people: [{ id: 'q1', name: 'Marta Gil', title: 'Jefa de grúa', phone: '', email: '' }]
			}
		];
		operations.name = 'Daños';

		expect(textsOf([project, operations]).map(({ source }) => source)).toEqual([
			'BBC Kimberly',
			'Inspección de descarga',
			'Llegada del buque al muelle',
			'Jefa de grúa',
			'Daños',
			'Carga',
			'Inicio de carga en bodega 2',
			'Grúa detenida por lluvia'
		]);

		project.translations = [
			{ id: 't1', source: 'Inspección de descarga', english: 'Discharge survey' },
			{ id: 't2', source: 'Jefa de grúa', english: 'Crane supervisor' },
			{ id: 't3', source: 'Daños', english: 'Damages' }
		];
		const [shown, photos] = toEnglish([project, operations]);
		expect(shown.fields.map((field) => field.value)).toEqual([
			'BBC Kimberly',
			'Discharge survey',
			'Acme'
		]);
		expect(shown.personnel?.[0].people[0].title).toBe('Crane supervisor');
		expect(shown.personnel?.[0].company).toBe('Grúas del Norte');
		expect(photos.name).toBe('Damages');
	});
});

describe('whether a text reads as Spanish', () => {
	it('knows the Spanish words that end like English ones', () => {
		expect(isSpanish('Pared dañada')).toBe(true);
		expect(isSpanish('Red de seguridad instalada')).toBe(true);
	});

	it('knows Spanish by its little words, its accents and the words of the job', () => {
		expect(isSpanish('Inicio de carga en bodega 2')).toBe(true);
		expect(isSpanish('Llegada del buque al muelle')).toBe(true);
		expect(isSpanish('Grúa detenida por lluvia')).toBe(true);
		expect(isSpanish('Transformadores')).toBe(true);
		expect(isSpanish('¿Listo?')).toBe(true);
	});

	it('leaves English, and a name that reads as neither, as typed', () => {
		expect(isSpanish('Vessel arrived at berth')).toBe(false);
		expect(isSpanish('Loading of the transformer onto the barge')).toBe(false);
		expect(isSpanish('Preloading')).toBe(false);
		expect(isSpanish('MSC Aurora')).toBe(false);
	});

	it('goes by the most words when a text mixes the two', () => {
		expect(isSpanish('Inicio de lashing con el crew del barge')).toBe(true);
		expect(isSpanish('Lashing of the cargo started at the muelle')).toBe(false);
	});
});

// A stand-in for the browser's translator, word by word, that gets names wrong the way a real one can.
const WORDS: Record<string, string> = {
	llegada: 'Arrival',
	del: 'of the',
	al: 'at the',
	muelle: 'berth',
	de: 'of',
	y: 'and',
	revisión: 'Inspection',
	aurora: 'Dawn',
	altamira: 'Highview',
	hc: 'hc',
	mar: 'sea'
};
async function wordByWord(text: string) {
	return text.replace(/\p{L}+/gu, (word) => WORDS[word.toLowerCase()] ?? word);
}

describe('a text put into English', () => {
	it('keeps the names it is given as they are typed', async () => {
		expect(
			await translateText('Llegada del MSC Aurora al muelle de Altamira', {
				kept: ['MSC Aurora', 'Altamira'],
				translate: wordByWord
			})
		).toEqual({ english: 'Arrival of the MSC Aurora at the berth of Altamira', isWhole: true });
	});

	it('keeps a word written in capitals, like HC, TD and TT', async () => {
		expect(await translateText('Revisión de HC y TT', { kept: [], translate: wordByWord })).toEqual(
			{ english: 'Inspection of HC and TT', isWhole: true }
		);
	});

	it('translates a line typed all in capitals, keeping only its names', async () => {
		expect(
			await translateText('LLEGADA DEL MSC AURORA', { kept: ['MSC Aurora'], translate: wordByWord })
		).toEqual({ english: 'Arrival of the MSC AURORA', isWhole: true });
	});

	it('keeps a name only as it is written, not a word spelt like it', async () => {
		expect(
			await translateText('Llegada del Mar al muelle de mar', {
				kept: ['Mar'],
				translate: wordByWord
			})
		).toEqual({ english: 'Arrival of the Mar at the berth of sea', isWhole: true });
	});

	it('says when the translator lost a name it was asked to keep', async () => {
		expect(
			await translateText('Llegada del MSC Aurora', {
				kept: ['MSC Aurora'],
				translate: async (text) => text.replace(/ZQX\d+/g, 'the vessel')
			})
		).toEqual({ english: 'Llegada del the vessel', isWhole: false });
	});
});

describe('the words a project keeps as typed', () => {
	it('are its customer, organization, people, companies, transport and facilities', () => {
		const [project] = projectOf();
		project.fields = [
			{ id: 'f1', label: 'Title', type: 'text', value: 'Descarga de transformadores' },
			{ id: 'f2', label: 'Organization', type: 'select', value: 'Trident Cubed' },
			{ id: 'f3', label: 'Customer', type: 'select', value: 'Acme Energía' }
		];
		project.owner = 'Ana Ruiz';
		project.assigned = ['Luis Pérez'];
		project.personnel = [
			{
				id: 'c1',
				company: 'Grúas del Norte',
				people: [{ id: 'q1', name: 'Marta Gil', title: 'Jefa', phone: '', email: '' }]
			}
		];
		const trip = panel('transport', 'Transport Mode', {
			stops: [
				{
					id: 's1',
					point: 'Start',
					type: 'Sea',
					mode: 'Vessel',
					name: 'MSC Aurora',
					facility: 'Altamira'
				},
				{ id: 's2', point: 'End', type: '', mode: '', name: '', facility: '' }
			]
		});

		expect(keptWordsOf([project, trip])).toEqual([
			'Trident Cubed',
			'Acme Energía',
			'Ana Ruiz',
			'Luis Pérez',
			'Grúas del Norte',
			'Marta Gil',
			'MSC Aurora',
			'Altamira'
		]);
	});
});

describe('the report in English', () => {
	function translated() {
		const panels = projectOf();
		panels[0].translations = [
			{
				id: 't1',
				source: 'Llegada del buque al muelle',
				english: 'The vessel arrived at the berth'
			},
			{ id: 't2', source: 'Grúa detenida por lluvia', english: 'Crane stopped by rain' },
			{ id: 't3', source: 'Llegada del buque', english: 'Vessel arrived' },
			{ id: 't4', source: 'Carga', english: '' }
		];
		return panels;
	}

	it('prints the English of each text in its place, wherever that text is typed', () => {
		const [project, operations, timelog] = toEnglish(translated());

		expect(project.introduction).toBe('The vessel arrived at the berth');
		expect(operations.groups[0].photos.map((photo) => photo.description)).toEqual([
			'Crane stopped by rain',
			'',
			'Crane stopped by rain'
		]);
		expect(timelog.days[0].entries[0].activity).toBe('Vessel arrived');
	});

	it('prints a text with no English as typed, and leaves what holds none untouched', () => {
		const panels = translated();
		const [, operations, timelog, items] = toEnglish(panels);

		expect(operations.groups[0].title).toBe('Carga');
		expect(operations.groups[0].description).toBe('Inicio de carga en bodega 2');
		expect(timelog.days[0].entries[1]).toBe(panels[2].days[0].entries[1]);
		expect(items).toBe(panels[3]);
	});

	it('is the panels themselves when nothing has English', () => {
		const panels = projectOf();

		expect(toEnglish(panels)).toBe(panels);
	});
});

describe('the English saved', () => {
	const CURRENT = [
		{ id: 't1', source: 'Carga', english: 'Loading' },
		{ id: 't2', source: 'Llegada del buque', english: 'Vessel arrived' },
		{ id: 't3', source: 'Descarga', english: 'Discharge' }
	];
	let count = 0;
	function newId() {
		count += 1;
		return `new-${count}`;
	}

	it('keeps each text its own row, adds the new ones, and drops one whose English was cleared', () => {
		expect(
			toTranslations(
				CURRENT,
				[
					{ source: 'Carga', english: ' Loading operations ' },
					{ source: 'Llegada del buque', english: '' },
					{ source: 'Grúa detenida', english: 'Crane stopped' },
					{ source: 'Bodega 2', english: '  ' }
				],
				newId
			)
		).toEqual([
			{ id: 't1', source: 'Carga', english: 'Loading operations' },
			{ id: 't3', source: 'Descarga', english: 'Discharge' },
			{ id: 'new-1', source: 'Grúa detenida', english: 'Crane stopped' }
		]);
	});
});
