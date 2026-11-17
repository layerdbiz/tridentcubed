// Download on the Preview tab (#190; spec #179 stories 73 to 75), carried over from the look prototype (#161 run 33)
// as it works there: the preview sends its pages exactly as it has drawn them, with the page's own styles, and the
// export browser (pdf-browser.ts) prints them. A page is 595 by 842, the size the preview draws it. The PDF is named
// by the report's document ID, which the preview sends as the file name.
//
// Who may call it: a signed-in member of an organization, from a page of this same site. A signed-out visitor and a
// Guest get a refusal and nothing is printed (the sign-in guard refuses them before this too; this is the route's own
// check, as a remote function makes its own).
//
// The report's photos and logos are the app's file addresses (/files/<id>), which open only for a signed-in member.
// The export browser opens them as the member who asked: it is handed that request's Cookie header (the session) and
// sends it only on requests to this site's own origin, never to another host. /files/<id> then checks the member
// and sends the browser on to a short-lived signed link, as it does in the app.
//
// Limits, until rendering the report on the server from the database (#145) replaces this:
// - It prints whatever markup a signed-in member's browser sends; nothing checks the pages are the report's. A member
//   can only make a PDF of what their own session can open, but the markup is theirs, not the database's.
// - The export browser follows any address in that markup (other hosts get no session from it).
// - One headless Chromium per Download: a few seconds warm, more on a cold start, which downloads the 66 MB
//   Chromium pack. The route is its own Vercel function with 300 seconds (its `config`); memory is the project's
//   Function CPU setting (2 GB on Hobby; 4 GB on Pro for reports with many photos).
// - The pages travel in one request body, which Vercel caps at 4.5 MB; the preview sends big photos slimmed.
import type { ActorType } from './db/claims';

export const PAGE_WIDTH = 595;
export const PAGE_HEIGHT = 842;

/** What the export browser is asked to print: the whole document, the site it is printed on, and the session
 * headers it sends to that site (and nowhere else). */
export type PrintJobType = { html: string; site: string; session: Record<string, string> };

export type PrinterType = (job: PrintJobType) => Promise<Uint8Array>;

export type ExportCallType = { request: Request; actor: ActorType | undefined };

// What lets the export browser open this site as the person asking: their session, and a preview deployment's
// protection (its own cookie, or the automation bypass header).
const SESSION_HEADERS = ['cookie', 'authorization', 'x-vercel-protection-bypass'];

/** The PDF's file name: the document ID the preview sent (SGL-2026-02-03-J01-FR01.pdf), kept to letters, digits,
 * dots and dashes so it cannot break out of the header. */
export function toFileName(name: unknown) {
	const id = (typeof name === 'string' ? name : '')
		.trim()
		.replace(/\.pdf$/i, '')
		.replace(/[^\w.-]+/g, '-')
		.replace(/^[.-]+|[.-]+$/g, '');
	return `${id || 'report'}.pdf`;
}

function refuse(status: 400 | 401 | 403, message: string) {
	return Response.json({ message }, { status });
}

function toSession(request: Request) {
	const session: Record<string, string> = {};
	for (const name of SESSION_HEADERS) {
		const value = request.headers.get(name);
		if (value) session[name] = value;
	}
	return session;
}

/** The whole document the pages are printed from: their styles, the page size, and the pages as drawn. */
export function toPrintDocument({
	pages,
	styles,
	site
}: {
	pages: string;
	styles: string;
	site: string;
}) {
	return `<!doctype html>
<html lang="en" data-theme>
	<head>
		<meta charset="utf-8" />
		<base href="${site}/" />
		${styles}
		<style>
			@page { size: ${PAGE_WIDTH}px ${PAGE_HEIGHT}px; margin: 0; }
			html, body { margin: 0; padding: 0; background: #fff; min-height: 0; overflow: visible; }
			article {
				position: relative !important;
				left: 0 !important;
				top: 0 !important;
				box-shadow: none !important;
				break-after: page;
			}
		</style>
	</head>
	<body>
		<div class="look font-sans text-slate-800 [color-scheme:light]">${pages}</div>
	</body>
</html>`;
}

export async function exportPdf({ request, actor }: ExportCallType, print: PrinterType) {
	if (!actor) return refuse(401, 'Sign in first.');
	if (!actor.organizationId) return refuse(403, 'You are waiting for access.');
	const site = new URL(request.url).origin;
	if (request.headers.get('origin') !== site) return refuse(403, 'Not from this site.');

	const payload = (await request.json().catch(() => null)) as {
		pages?: unknown;
		styles?: unknown;
		filename?: unknown;
	} | null;
	const pages = typeof payload?.pages === 'string' ? payload.pages : '';
	const styles = typeof payload?.styles === 'string' ? payload.styles : '';
	const filename = toFileName(payload?.filename);
	if (!pages) return refuse(400, 'No pages to print.');

	try {
		const pdf = await print({
			html: toPrintDocument({ pages, styles, site }),
			site,
			session: toSession(request)
		});
		return new Response(Buffer.from(pdf), {
			headers: {
				'content-type': 'application/pdf',
				'content-disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (error) {
		return Response.json(
			{ message: error instanceof Error ? error.message : 'The PDF could not be made.' },
			{ status: 500 }
		);
	}
}
