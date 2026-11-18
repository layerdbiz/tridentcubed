// A report's link (#216): the short address the QR code on a report page holds, `<app>/report/<project>/<page>`,
// and where in the app it opens. Short, so the code stays easy to scan at the size it prints; an address of its
// own, so codes already printed keep working when the app's own address for a screen changes. The route
// (routes/report) sends it on to the project's Preview, which stays behind sign-in like every app address.

const REPORT_PATH = '/report';

/** A page number as an address gives it: a whole number from 1; anything else is no page (0). */
export function toPageNumber(value: string | null | undefined) {
	return value && /^[1-9]\d{0,3}$/.test(value) ? Number(value) : 0;
}

/** What the QR code on a report page holds: the app's address of that project's report, at that page. */
export function toReportLink(origin: string, project: string, page: number) {
	return `${origin}${REPORT_PATH}/${encodeURIComponent(project)}/${page}`;
}

/** The app address a report link opens: the project's Preview, at the page asked for when it names one. */
export function toReportAddress(project: string, page?: string) {
	const search = new URLSearchParams({ screen: 'workspace', tab: 'preview', project });
	const pageNumber = toPageNumber(page);
	if (pageNumber) search.set('page', String(pageNumber));
	return `/?${search}`;
}
