// The Select's choices and its Lookup (#298).

/** One choice in a Select. */
export interface SelectOptionType {
	value: string;
	label: string;
	/** A second, quieter word or line: a facility's city, where a found place is. */
	note?: string;
	/** The picture beside it: its own icon, a round picture, or a dot of colour. */
	icon?: string;
	image?: string;
	/** How the round picture fills its circle: `cover` a photo (the default), `contain` a logo kept whole on white. */
	fit?: 'cover' | 'contain';
	dot?: string;
}

/**
 * A Lookup (glossary): what finds the choices for what someone types, such as places from an outside service. Every
 * lookup answers in this one shape, so a Select takes any of them through its `lookup` prop and never knows where the
 * choices come from (Justin, 2026-11-24).
 */
export interface LookupType {
	/** The choices for the words typed, lowercased. `signal` aborts once newer words make the answer moot. */
	find: (text: string, signal: AbortSignal) => Promise<SelectOptionType[]>;
	/** How many letters it waits for before it is asked: three when left out. */
	letters?: number;
	/** Who answers, credited under what it finds: Powered by Geoapify. */
	credit?: { name: string; href: string };
}

// How long typing pauses before a lookup is asked, and how many letters it waits for by default.
const PAUSE = 350;
const LETTERS = 3;

// What each lookup said for a text, kept for the visit and shared by every Select that asks it, so the same words are
// never asked twice.
const ANSWERS = new WeakMap<LookupType, Map<string, SelectOptionType[]>>();

function answersOf(lookup: LookupType) {
	let answers = ANSWERS.get(lookup);
	if (!answers) ANSWERS.set(lookup, (answers = new Map()));
	return answers;
}

/**
 * Asks a Select's lookup about what is typed: once typing pauses, only with enough letters, never for words a known
 * choice already names, and only once a visit for the same words. A newer ask cancels the one before it.
 */
export class LookupState {
	/** What the lookup found for the last words typed. */
	found = $state<SelectOptionType[]>([]);
	/** The lookup has been asked and has not answered yet. */
	isAsking = $state(false);
	#lookup: () => LookupType | undefined;
	#text = '';
	#timer: ReturnType<typeof setTimeout> | undefined;
	#request: AbortController | undefined;

	constructor(lookup: () => LookupType | undefined) {
		this.#lookup = lookup;
	}

	/** Words were typed. `isKnown` says a known choice is called that already, so there is nothing to look up. */
	type(words: string, isKnown: boolean) {
		this.clear();
		const text = words.trim().toLowerCase();
		this.#text = text;
		const lookup = this.#lookup();
		if (!lookup || isKnown || text.length < (lookup.letters ?? LETTERS)) return;
		this.#timer = setTimeout(() => void this.#ask(lookup, text), PAUSE);
	}

	/** A choice was picked: nothing found shows any more, and no ask waits. */
	clear() {
		clearTimeout(this.#timer);
		this.found = [];
	}

	async #ask(lookup: LookupType, text: string) {
		const answers = answersOf(lookup);
		const known = answers.get(text);
		if (known) {
			this.found = known;
			return;
		}
		this.#request?.abort();
		const request = new AbortController();
		this.#request = request;
		this.isAsking = true;
		try {
			const found = await lookup.find(text, request.signal);
			answers.set(text, found);
			if (text === this.#text) this.found = found;
		} catch {
			// Newer words cancelled this ask, or the network is away: the known choices still show.
		} finally {
			if (this.#request === request) this.isAsking = false;
		}
	}
}
