// The service worker's rule (#201), kept apart from the worker so it can be tested: what it stores when it
// installs, what it does with a request, what it removes when a new version takes over, and the one message that
// lets it take over an open app (#202). It keeps files, never data: remote functions, server routes, file
// addresses and anything that is not a plain read are left alone.
import { KEPT_STATIC, MANIFEST_PATH, OFFLINE_PATH } from '#lib/install/install.constants.js';
import { TAKE_OVER } from '#lib/update/update.constants.js';

/** What the rule reads of a request; a real `Request` fits. */
export type AskedType = Pick<Request, 'method' | 'mode' | 'url'>;

export type DeviceType = {
	/** The app's own address. */
	origin: string;
	/** The paths answered from the device (`toKept`). */
	kept: ReadonlySet<string>;
	/** Reads a stored answer by its path. */
	read: (path: string) => Promise<Response | undefined>;
	/** Sends the request on to the network. */
	ask: () => Promise<Response>;
	/**
	 * The browser's own request for a page load (navigation preload), where the browser makes one; it gives nothing
	 * for a request that is not a page load. A request the service worker sends reaches the server as a plain read,
	 * and only the browser's own arrives as a page load.
	 */
	preload?: () => Promise<Response | undefined>;
};

export type FilesType = {
	/** Stored together or not at all: without them the app or the Needs Internet screen would not open. */
	needed: string[];
	/** Stored one by one: a missing one is skipped. */
	wanted: string[];
};

/** A built file as SvelteKit lists it (`immutable` of `$app/manifest`): a path with no leading slash. */
type BuiltType = { path: string };

/** Where the install step gets a file and where it puts it. */
export type ShelfType = {
	get: (path: string) => Promise<Response>;
	put: (path: string, response: Response) => Promise<unknown>;
};

const STORE_PREFIX = 'trident-files-';

// Addresses a browser can open like a page that are not pages: remote functions and the built files (/_app),
// server routes (/api, the manifest), file addresses (/files, /local-files) and the starting files (/start).
const NOT_PAGES = ['/_app/', '/api/', '/files/', '/local-files/', '/start/'];

function isPage(path: string) {
	return path !== MANIFEST_PATH && !NOT_PAGES.some((prefix) => path.startsWith(prefix));
}

function toPaths(built: BuiltType[]) {
	return built.map(({ path }) => `/${path}`);
}

/** The name of the store holding one version's files. */
export function toStoreName(version: string) {
	return `${STORE_PREFIX}${version}`;
}

/** What the install step stores: this version's built files, the Needs Internet screen and the named static files. */
export function toFiles(built: BuiltType[]): FilesType {
	return { needed: [...toPaths(built), OFFLINE_PATH], wanted: KEPT_STATIC };
}

/** The paths answered from the device: this version's built files and the named static files. */
export function toKept(built: BuiltType[]): ReadonlySet<string> {
	return new Set([...toPaths(built), ...KEPT_STATIC]);
}

// Only the file itself is kept. A server may send an address it has no file for on to another page (a sign-in
// guard does, to its login page): that page must never be kept under the file's name.
async function keep(path: string, { get, put }: ShelfType) {
	const response = await get(path);
	if (!response.ok || response.redirected) throw new Error(`Could not store ${path}`);
	await put(path, response);
}

/**
 * Fills a store. Without a built file or the Needs Internet screen the install fails; a named static file that is
 * missing is skipped, so one missing icon never stops an install.
 */
export async function fill(shelf: ShelfType, { needed, wanted }: FilesType) {
	await Promise.all(needed.map((path) => keep(path, shelf)));
	await Promise.all(wanted.map((path) => keep(path, shelf).catch(() => undefined)));
}

/** The stores of other versions, removed when this version takes over. */
export function toOld(names: string[], version: string) {
	const current = toStoreName(version);
	return names.filter((name) => name.startsWith(STORE_PREFIX) && name !== current);
}

/** Whether a message asks a waiting version to take over the open app: the update note's, sent on the User's tap. */
export function isTakeOver(message: unknown) {
	return message === TAKE_OVER;
}

async function fromDevice(path: string, { read, ask }: DeviceType) {
	return (await read(path)) ?? ask();
}

// A page load is the browser's own request where it made one. A host that keeps a visitor on the version they
// started with (Vercel's Skew Protection, by a cookie) moves them to the newest version on a page load only, and
// a request sent from here does not arrive as one: the visitor stayed on the old version, and the update note came
// back after every tap.
async function load({ preload, ask }: DeviceType) {
	return (await preload?.()) ?? ask();
}

async function fromNetwork(device: DeviceType) {
	try {
		return await load(device);
	} catch (error) {
		const screen = await device.read(OFFLINE_PATH);
		if (screen) return screen;
		throw error;
	}
}

/**
 * Where a request's answer comes from. A kept file comes from the device; a page request goes to the network and
 * gets the Needs Internet screen only when the network fails. `undefined` leaves the request alone: the browser
 * sends it as if there were no service worker.
 *
 * A page load of an address that is not a page (a sign-in callback, a download) is never answered from here. Where
 * the browser has already made its own request for it, that request is handed back as it came: left alone, the
 * browser would ask a second time, and a sign-in code works once.
 */
export function answer(asked: AskedType, device: DeviceType): Promise<Response> | undefined {
	if (asked.method !== 'GET') return undefined;
	const url = new URL(asked.url);
	if (url.origin !== device.origin) return undefined;
	if (device.kept.has(url.pathname)) return fromDevice(url.pathname, device);
	if (asked.mode !== 'navigate') return undefined;
	if (isPage(url.pathname)) return fromNetwork(device);
	return device.preload ? load(device) : undefined;
}
