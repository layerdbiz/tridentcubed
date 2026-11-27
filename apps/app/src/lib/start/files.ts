// The starting files (spec #179 "Files"; #183, #185): the pictures the starting rows point at, shipped with the app in
// `src/lib/start` and named by a stable address, `/start/...`, that rows keep. Each is the address the build gave the
// file, or for a small one a data URL the build wrote into the code.
export const START_PATH = '/start/';

const FILES = import.meta.glob<string>('/src/lib/start/**/*.{png,jpg,jpeg,ico,webp,svg}', {
	eager: true,
	query: '?url',
	import: 'default'
});

/** The built file at a starting address (`/start/team/a.webp`, or `team/a.webp`), when there is one. */
export function toStartFile(path: string) {
	const inside = path.startsWith(START_PATH) ? path.slice(START_PATH.length) : path;
	return FILES[`/src/lib/start/${inside}`];
}
