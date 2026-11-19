// The Operations panel's link (#233; Michael through Justin, 2026-11-18): the address of the project's folder
// somewhere else, a OneDrive folder say, holding its photos, videos and files. One input at the top of the panel
// takes it as pasted; the report prints it as one short line to click, on the Project Report's first page and on
// the Operations panel's first, and nothing when there is none. What is typed is kept as typed; only an address a
// browser can open is ever printed or counted as filled in.

/** What the input is called in the panel, and in the one list the completed counts read (tally.ts). */
export const LINK_LABEL = 'Project Files Link';
/** What the line on the report is called. */
export const LINK_TITLE = 'Project Files';

/**
 * The address a typed link opens: as typed, with `https://` in front when it names no scheme. Nothing for what is
 * not a web address (`javascript:`, a few words, a name with no dot), so a report never prints a link that goes
 * nowhere or does something else.
 */
export function toLink(value: string | undefined) {
	const typed = value?.trim() ?? '';
	if (!typed || /\s/.test(typed)) return '';
	const address = /^https?:\/\//i.test(typed) ? typed : `https://${typed}`;
	if (!URL.canParse(address)) return '';
	const url = new URL(address);
	return url.hostname.includes('.') && !url.username && !url.password ? url.href : '';
}

// Where a link goes, by the end of its host: the name people call the place.
const PLACES: [string, string][] = [
	['1drv.ms', 'OneDrive'],
	['onedrive.live.com', 'OneDrive'],
	['onedrive.com', 'OneDrive'],
	['sharepoint.com', 'OneDrive'],
	['drive.google.com', 'Google Drive'],
	['docs.google.com', 'Google Drive'],
	['dropbox.com', 'Dropbox'],
	['box.com', 'Box']
];

/** What the report calls where a link goes: OneDrive for a OneDrive or SharePoint folder, else the site's name. */
export function linkNameOf(link: string) {
	if (!URL.canParse(link)) return '';
	const host = new URL(link).hostname.toLowerCase().replace(/^www\./, '');
	const place = PLACES.find(([end]) => host === end || host.endsWith(`.${end}`));
	return place ? place[1] : host;
}
