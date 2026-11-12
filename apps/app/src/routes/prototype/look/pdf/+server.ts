// PROTOTYPE (#161) run 33: Download in the look prototype (Justin, 2026-11-12: "I need to deliver something for
// these guys like tomorrow"). The prototype's projects live in the browser, so the server cannot render the report
// itself: the preview sends the pages exactly as it has drawn them, with the page's own styles, and this prints
// them with the same headless browser the app's export uses (#lib/server/pdf-browser). A page is 595 by 842, the
// size the preview draws it.
// The pages are written into a blank page of this same site (GET, below), not a bare one, so the fonts and
// pictures they name load as they do in the app.
// Not for V1 as it stands: it prints whatever markup it is sent. It only takes requests from this site's own
// pages, and V1 renders the report on the server from the database instead.
import { launchBrowser } from '#lib/server/pdf-browser.js';
import type { RequestHandler } from './$types';

const WIDTH = 595;
const HEIGHT = 842;

// The blank page the pages are written into.
export const GET: RequestHandler = () =>
	new Response('<!doctype html><title>Report</title>', {
		headers: { 'content-type': 'text/html' }
	});

// What lets the headless browser open this site the way the person asking can (a preview deployment's protection).
const FORWARDED = [
	'cookie',
	'authorization',
	'x-vercel-protection-bypass',
	'x-vercel-set-bypass-cookie'
];

export const POST: RequestHandler = async ({ request, url }) => {
	if (request.headers.get('origin') !== url.origin)
		return Response.json({ message: 'Not from this site.' }, { status: 403 });
	const payload = (await request.json().catch(() => null)) as {
		pages?: unknown;
		styles?: unknown;
		filename?: unknown;
	} | null;
	const pages = typeof payload?.pages === 'string' ? payload.pages : '';
	const styles = typeof payload?.styles === 'string' ? payload.styles : '';
	const filename =
		typeof payload?.filename === 'string' && payload.filename.trim()
			? payload.filename.trim().replace(/[^\w.-]+/g, '-')
			: 'report.pdf';
	if (!pages) return Response.json({ message: 'No pages to print.' }, { status: 400 });

	const html = `<!doctype html>
<html lang="en" data-theme>
	<head>
		<meta charset="utf-8" />
		<base href="${url.origin}/" />
		${styles}
		<style>
			@page { size: ${WIDTH}px ${HEIGHT}px; margin: 0; }
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

	let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;
	try {
		browser = await launchBrowser();
		const page = await browser.newPage();
		await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });
		await page.emulateMediaType('screen');
		const headers: Record<string, string> = {};
		for (const name of FORWARDED) {
			const value = request.headers.get(name);
			if (value) headers[name] = value;
		}
		if (Object.keys(headers).length) await page.setExtraHTTPHeaders(headers);
		await page.goto(new URL('/prototype/look/pdf', url).href, { waitUntil: 'domcontentloaded' });
		await page.setContent(html, { waitUntil: 'networkidle0' });
		await page.evaluate(async () => {
			await document.fonts.ready;
			await Promise.all(
				Array.from(document.images).map((image) => image.decode().catch(() => undefined))
			);
		});
		const pdf = await page.pdf({
			width: `${WIDTH}px`,
			height: `${HEIGHT}px`,
			margin: { top: '0', right: '0', bottom: '0', left: '0' },
			printBackground: true,
			preferCSSPageSize: true
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
	} finally {
		await browser?.close();
	}
};
