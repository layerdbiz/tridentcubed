// The browser's own translator (#360): Chrome and Edge on a computer put Spanish into English on the device, free,
// with nothing sent anywhere (the Translator API). Phones have none yet, nor Safari or Firefox (2026-11): there the
// English is typed. On a computer the first use fetches the browser's Spanish to English pack, once, which starts
// from a tap. No paid translation service is used: none is chosen yet (#283 lists the outside services).
import type { TranslateType } from './translation';

type AvailabilityType = 'unavailable' | 'downloadable' | 'downloading' | 'available';
type LanguagesType = { sourceLanguage: string; targetLanguage: string };
// The parts of the Translator API this uses; TypeScript does not describe it yet.
type TranslatorApiType = {
	availability(languages: LanguagesType): Promise<AvailabilityType>;
	create(
		options: LanguagesType & { monitor?: (monitor: EventTarget) => void }
	): Promise<{ translate(text: string): Promise<string> }>;
};

const SPANISH_TO_ENGLISH: LanguagesType = { sourceLanguage: 'es', targetLanguage: 'en' };

function apiOf() {
	return (globalThis as { Translator?: TranslatorApiType }).Translator;
}

// How long the browser may take to say whether it can translate: a browser with the API but no way to use it (a
// headless one) never answers.
const ASK_LIMIT = 3000;

/** Whether this browser can put Spanish into English by itself. */
export async function canTranslate() {
	const api = apiOf();
	if (!api) return false;
	try {
		const answer = await Promise.race([
			api.availability(SPANISH_TO_ENGLISH),
			new Promise<AvailabilityType>((resolve) =>
				setTimeout(() => resolve('unavailable'), ASK_LIMIT)
			)
		]);
		return answer !== 'unavailable';
	} catch {
		return false;
	}
}

/**
 * The browser's Spanish to English translator. Called from a tap: the first time, the browser fetches its language
 * pack, and `onprogress` hears how much of it has come, from 0 to 1.
 */
export async function createTranslator(
	onprogress?: (share: number) => void
): Promise<TranslateType> {
	const api = apiOf();
	if (!api) throw new Error('This browser has no translator of its own.');
	const translator = await api.create({
		...SPANISH_TO_ENGLISH,
		monitor(monitor) {
			monitor.addEventListener('downloadprogress', (event) =>
				onprogress?.((event as ProgressEvent).loaded)
			);
		}
	});
	return (text) => translator.translate(text);
}
