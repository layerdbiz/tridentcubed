import { createExportSession } from '#lib/server/export-session-store.js';
import { launchBrowser } from '#lib/server/pdf-browser.js';
import type { RequestHandler } from './$types';

const pdfOptions = {
	format: 'Letter',
	margin: {
		top: '0',
		right: '0',
		bottom: '0',
		left: '0'
	},
	printBackground: true,
	preferCSSPageSize: true
} as const;

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : 'Unknown error';
}

function getForwardedNavigationHeaders(request: Request) {
	const headerNames = [
		'cookie',
		'authorization',
		'accept-language',
		'x-vercel-protection-bypass',
		'x-vercel-set-bypass-cookie'
	];
	const headers: Record<string, string> = {};

	for (const headerName of headerNames) {
		const value = request.headers.get(headerName);
		if (value) headers[headerName] = value;
	}

	return headers;
}

export const POST: RequestHandler = async ({ request }) => {
	const payload = (await request.json().catch(() => null)) as {
		snapshot?: unknown;
		filename?: unknown;
	} | null;
	const snapshot = payload?.snapshot ?? null;
	const filename =
		typeof payload?.filename === 'string' && payload.filename.trim()
			? payload.filename.trim()
			: 'survey-report.pdf';

	if (!snapshot || typeof snapshot !== 'object') {
		return Response.json({ message: 'Missing export snapshot.' }, { status: 400 });
	}

	let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;

	try {
		const session = createExportSession({ data: snapshot, filename });
		const printUrl = new URL(`/export/print/${session.token}`, request.url).href;
		const navigationHeaders = getForwardedNavigationHeaders(request);

		browser = await launchBrowser();

		const page = await browser.newPage();
		if (Object.keys(navigationHeaders).length) {
			await page.setExtraHTTPHeaders(navigationHeaders);
		}
		await page.setViewport({ width: 816, height: 1056, deviceScaleFactor: 1 });
		await page.emulateMediaType('screen');
		const printResponse = await page.goto(printUrl, {
			waitUntil: 'networkidle0'
		});

		if (!printResponse || !printResponse.ok()) {
			throw new Error(`Print route failed with status ${printResponse?.status() ?? 'unknown'}`);
		}

		const renderDiagnostics = await page.evaluate(() => ({
			locationHref: location.href,
			title: document.title,
			previewPagesRootCount: document.querySelectorAll('.preview-pages').length,
			previewPageCount: document.querySelectorAll('.preview-page').length,
			bodyTextSnippet: document.body.textContent?.replace(/\s+/g, ' ').trim().slice(0, 240) ?? ''
		}));

		if (!renderDiagnostics.previewPageCount) {
			throw new Error(
				`Print route did not render preview pages. Final URL: ${page.url()}. Snippet: ${renderDiagnostics.bodyTextSnippet}`
			);
		}

		await page.evaluate(async () => {
			await document.fonts.ready;

			await Promise.all(
				Array.from(document.images).map(async (image) => {
					if ('decode' in image) {
						try {
							await image.decode();
						} catch {
							return;
						}
					}
				})
			);
		});

		const pdf = await page.pdf(pdfOptions);

		return new Response(Buffer.from(pdf), {
			status: 200,
			headers: {
				'content-type': 'application/pdf',
				'content-disposition': `attachment; filename="${filename.replace(/"/g, '')}"`
			}
		});
	} catch (error) {
		return Response.json(
			{
				message: 'PDF export failed.',
				details: getErrorMessage(error)
			},
			{ status: 500 }
		);
	} finally {
		if (browser) await browser.close();
	}
};
