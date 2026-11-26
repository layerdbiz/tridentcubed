// Spanish typed, English printed (#360): the team types a project in Spanish and the customer gets its report in
// English. What is typed stays as typed, Spanish and all; each text that prints has its English kept beside it (the
// Project panel's `translations`, one row per text), and the report prints that English in its place
// (`toEnglish`). The English is made on the device by the browser's own translator where it has one
// (translator.ts), or typed, and a person reads it before it is saved (translate-window.svelte).
//
// Decided by default on 2026-11-26, for Justin to change (#360 asks him five questions): every text the team types
// that prints is offered (the stages' names and descriptions, the photos' descriptions, the Time Log's entries, the
// items and a typed opening sentence); only when someone asks, never while typing or at Download; the person who
// asks reads and fixes each English before saving it; names and words written in capitals keep their spelling; and
// the Spanish is always kept.
import type { PanelType, TranslationType } from './look.data';

/** A text typed in the project that prints on its report, once however often it is typed, and where it is. */
export type TypedTextType = { source: string; where: string[] };

/** Each text typed in the switched-on panels that prints on the report, once each, in the order the report has them. */
export function textsOf(panels: PanelType[]): TypedTextType[] {
	const texts = new Map<string, TypedTextType>();
	function add(text: string | undefined, where: string) {
		const source = text?.trim() ?? '';
		if (!/\p{L}/u.test(source)) return;
		const known = texts.get(source);
		if (!known) texts.set(source, { source, where: [where] });
		else if (!known.where.includes(where)) known.where.push(where);
	}
	for (const panel of panels) {
		if (!panel.isEnabled) continue;
		if (panel.kind === 'project') add(panel.introduction, panel.name);
		for (const group of panel.groups) {
			if (!group.isEnabled) continue;
			add(group.title, panel.name);
			add(group.description, panel.name);
			for (const photo of group.photos) add(photo.description, panel.name);
		}
		for (const day of panel.days) for (const entry of day.entries) add(entry.activity, panel.name);
		for (const item of panel.items) add(item.description, panel.name);
	}
	return [...texts.values()];
}

// The words that tell Spanish from English in a job's log: the little words of each, and the words of the work.
// A word in neither, a name or a number, says nothing.
const SPANISH_WORDS = new Set(
	`de del la las el los y en con por para que se un una unos unas al es son esta estan fue sin sobre desde hasta
	entre muy mas pero como cuando donde hacia segun tras durante inicio inicia inician comienza comienzo fin termina
	termino finaliza llegada llega llego llegaron salida sale zarpa zarpe atraque atraca desatraque buque barco muelle
	carga cargado cargando descarga grua gruas camion camiones contenedor contenedores bodega bodegas amarre trinca
	trincado izado eslinga eslingas pieza piezas bulto bultos caja cajas dano danos danado revision inspeccion lluvia
	viento espera retraso demora hora horas operacion operaciones equipo personal almacen patio tripulacion practico
	puerto realiza realizo cliente listo lista`.split(/\s+/)
);
const ENGLISH_WORDS = new Set(
	`the of and to at on with for from by is was were are be been into onto off after before then start started
	commenced commence completed complete finished finish arrived arrival departed vessel crane cargo truck trucks berth
	berthed loading loaded discharge discharged lifting lift gear securing secured lashing lashed operations inspection
	inspected damage damaged rain wind waiting delay delayed barge crew site pier port standby hold holds pieces piece
	crate crates`.split(/\s+/)
);
// Endings only one of the two has: "operación", "transformadores", "izaje", "cargando"; "loading", "arrived".
const SPANISH_ENDING = /(ción|ciones|dores?|doras?|aje|ando|iendo|mente)$/u;
const ENGLISH_ENDING = /(ing|ed|tion|ly)$/u;
const SPANISH_MARKS = /[áéíóúñü¿¡]/u;

/** Whether a text reads as Spanish: more of its words are Spanish than English. A text with neither is not. */
export function isSpanish(text: string) {
	let spanish = (text.match(/[¿¡]/gu) ?? []).length;
	let english = 0;
	for (const word of text.toLowerCase().match(/\p{L}+/gu) ?? []) {
		const plain = word.normalize('NFD').replace(/\p{M}/gu, '');
		if (SPANISH_WORDS.has(plain) || SPANISH_MARKS.test(word) || SPANISH_ENDING.test(word))
			spanish++;
		else if (ENGLISH_WORDS.has(plain) || ENGLISH_ENDING.test(word)) english++;
	}
	return spanish > english;
}

// The Project panel's fields that hold a name.
const NAME_FIELDS = ['Organization', 'Customer'];

/**
 * The names in a project, which keep their spelling in English: its organization and customer, its people and the
 * companies on the job, and the trip's transport and facilities.
 */
export function keptWordsOf(panels: PanelType[]) {
	const words: string[] = [];
	for (const panel of panels) {
		if (panel.kind === 'project') {
			words.push(
				...panel.fields
					.filter((field) => NAME_FIELDS.includes(field.label))
					.map((field) => field.value),
				panel.owner,
				...panel.assigned
			);
			for (const company of panel.personnel ?? [])
				words.push(company.company, ...company.people.map((person) => person.name));
		}
		for (const stop of panel.stops) words.push(stop.name, stop.facility);
	}
	return [...new Set(words.map((word) => word.trim()).filter(Boolean))];
}

/** What puts a text into English: the browser's translator (translator.ts), or a stand-in in tests. */
export type TranslateType = (text: string) => Promise<string>;

// What stands in for a kept word while the rest is translated: letters and a number no translator changes.
const MARK = 'ZQX';
const MARKS = new RegExp(`${MARK}\\s?(\\d+)`, 'giu');
// A word written in capitals, two letters or more (HC, TD, TT, MSC), that is not a mark already. Matched apart from
// the names, which are matched in any case: `\p{Lu}` matches small letters too when case is ignored.
const CAPITALS = new RegExp(
	`(?<![\\p{L}\\p{N}])(?!${MARK}\\d)\\p{Lu}{2,}[\\p{Lu}\\p{N}]*(?![\\p{L}\\p{N}])`,
	'gu'
);

function escapeOf(text: string) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A text in English, its kept words as they are typed in it and every word in capitals untouched: each stands
 * aside as a mark while the rest is translated, and comes back after. `isWhole` is false when a mark did not come
 * back, so someone checks that line.
 */
export async function translateText(
	text: string,
	{ kept, translate }: { kept: string[]; translate: TranslateType }
) {
	const words: string[] = [];
	function mark(word: string) {
		return `${MARK}${words.push(word) - 1}`;
	}
	const names = kept
		.filter(Boolean)
		.toSorted((a, b) => b.length - a.length)
		.map(escapeOf);
	const named = names.length
		? text.replace(
				new RegExp(`(?<![\\p{L}\\p{N}])(?:${names.join('|')})(?![\\p{L}\\p{N}])`, 'giu'),
				mark
			)
		: text;
	const marked = named.replace(CAPITALS, mark);
	const found = new Set<number>();
	const english = (await translate(marked)).replace(MARKS, (all, index: string) => {
		const word = words[Number(index)];
		if (word === undefined) return all;
		found.add(Number(index));
		return word;
	});
	return { english: english.trim(), isWhole: found.size === words.length };
}

/** Each text's English, by the text as typed, from a project's panels; a text whose English is blank has none. */
function englishOf(panels: PanelType[]) {
	const translations: TranslationType[] =
		panels.find((panel) => panel.kind === 'project')?.translations ?? [];
	return new Map(
		translations
			.filter((translation) => translation.english.trim())
			.map((translation) => [translation.source, translation.english.trim()])
	);
}

// A list with its changed parts in place of the old ones; the list itself when no part changed, so what did not
// change stays the same object and the report redraws only what did.
function changedOf<T>(list: T[], change: (item: T) => T) {
	const next = list.map(change);
	return next.some((item, index) => item !== list[index]) ? next : list;
}

/**
 * The panels as the report prints them in English: each typed text that has English, in its place. What has none
 * stays the same object; the panels themselves when no text has English.
 */
export function toEnglish(panels: PanelType[]): PanelType[] {
	const english = englishOf(panels);
	if (!english.size) return panels;
	function of<T extends object, K extends keyof T>(item: T, key: K): T {
		const text = item[key];
		const translated = typeof text === 'string' ? english.get(text.trim()) : undefined;
		return translated === undefined ? item : { ...item, [key]: translated };
	}
	return changedOf(panels, (panel) => {
		const groups = changedOf(panel.groups, (group) => {
			const photos = changedOf(group.photos, (photo) => of(photo, 'description'));
			const named = of(of(group, 'title'), 'description');
			return photos === group.photos ? named : { ...named, photos };
		});
		const days = changedOf(panel.days, (day) => {
			const entries = changedOf(day.entries, (entry) => of(entry, 'activity'));
			return entries === day.entries ? day : { ...day, entries };
		});
		const items = changedOf(panel.items, (item) => of(item, 'description'));
		const own = of(panel, 'introduction');
		return own === panel && groups === panel.groups && days === panel.days && items === panel.items
			? panel
			: { ...own, groups, days, items };
	});
}

/** One text and its English as someone left it in the Translate window. */
export type EnglishLineType = { source: string; english: string };

/**
 * A project's translations once the window's lines are saved: a text keeps its row with its new English, a new
 * one gets a row, and one whose English was cleared has none, so it prints as typed. Texts not in the window keep
 * theirs.
 */
export function toTranslations(
	current: TranslationType[],
	lines: EnglishLineType[],
	newId: () => string
): TranslationType[] {
	const edited = new Map(lines.map((line) => [line.source, line.english.trim()]));
	const kept = current.flatMap((translation) => {
		const english = edited.get(translation.source);
		if (english === undefined) return [translation];
		return english ? [{ ...translation, english }] : [];
	});
	const known = new Set(current.map((translation) => translation.source));
	const added = lines
		.filter((line) => !known.has(line.source) && line.english.trim())
		.map((line) => ({ id: newId(), source: line.source, english: line.english.trim() }));
	return [...kept, ...added];
}
