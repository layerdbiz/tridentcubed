// A face or a logo for a record with no picture yet (#355, Justin, 2026-11-26): a person shows two initials, the
// first of the first name and of the last; a customer or another company shows its code. Projects, transport modes
// and facilities keep their icon.

/** The letters a person's circle shows: first and last name's first letters, or the one of a one-word name. */
export function initialsOf(name: string) {
	const words = name
		.replace(/^\s*Capt\.\s+/, '')
		.split(/\s+/)
		.map((word) => word.match(/[\p{L}\p{N}]/u)?.[0] ?? '')
		.filter(Boolean);
	if (words.length < 2) return (words[0] ?? '').toUpperCase();
	return `${words[0]}${words.at(-1)}`.toUpperCase();
}

/** A company's code: the one typed for it, or else the first three letters of its name, made up by the app. */
export function toCode(name: string, typed = '') {
	return (
		typed.trim() ||
		name
			.replace(/[^a-z]/gi, '')
			.slice(0, 3)
			.toUpperCase() ||
		'TC'
	);
}

/**
 * Whose circle it is, which sets its colours (Justin, 2026-11-26): a Team record's role (purple Admin, blue Manager,
 * grey Team), a customer (sky blue), and a project's Personnel: its people in black on plain white, a company of
 * theirs that is not a customer in white on black.
 */
export type InitialsToneType = 'admin' | 'manager' | 'team' | 'customer' | 'personnel' | 'company';

// Each tone's top-left and bottom-right colours, and its letters'. One colour is a plain circle, no gradient. A white
// circle on a white page still needs its edge.
const TONES: Record<InitialsToneType, { from: string; to: string; text: string; edge?: string }> = {
	admin: { from: '#a78bfa', to: '#7c3aed', text: '#ffffff' },
	manager: { from: '#60a5fa', to: '#2563eb', text: '#ffffff' },
	team: { from: '#cbd5e1', to: '#64748b', text: '#ffffff' },
	customer: { from: '#7dd3fc', to: '#0ea5e9', text: '#ffffff' },
	personnel: { from: '#ffffff', to: '#ffffff', text: '#000000', edge: '#cbd5e1' },
	company: { from: '#000000', to: '#000000', text: '#ffffff' }
};

// What every one of these pictures starts with, and no uploaded photo does.
const SVG_PREFIX = 'data:image/svg+xml,';

const PICTURES = new Map<string, string>();

/**
 * The circle as a picture, so it shows wherever a photo or logo would, on screen and in the PDF: the letters on the
 * tone's gradient, running from the top left to the bottom right. Square; the screens round it like a photo.
 */
export function toInitialsPicture(letters: string, tone: InitialsToneType) {
	// Drawn once for each letters and tone: the same few names repeat in every dashboard row (#379, measured).
	const key = `${tone} ${letters}`;
	const drawn = PICTURES.get(key);
	if (drawn) return drawn;
	const { from, to, text, edge } = TONES[tone];
	const isPlain = from === to;
	const fill = isPlain ? from : 'url(#g)';
	const gradient = isPlain
		? ''
		: `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>`;
	const size = letters.length > 3 ? 16 : letters.length > 2 ? 20 : 25;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${gradient}<rect width="64" height="64" fill="${fill}"/>${edge ? `<circle cx="32" cy="32" r="31" fill="none" stroke="${edge}" stroke-width="2"/>` : ''}<text x="32" y="32" dy="0.35em" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="${size}" font-weight="600" letter-spacing="0.5" fill="${text}" text-anchor="middle">${escapeXml(letters)}</text></svg>`;
	const picture = `${SVG_PREFIX}${encodeURIComponent(svg)}`;
	PICTURES.set(key, picture);
	return picture;
}

/** Whether a picture is one of these circles rather than a real photo or logo. */
export function isInitialsPicture(src: string) {
	return src.startsWith(SVG_PREFIX);
}

function escapeXml(text: string) {
	return text.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`);
}
