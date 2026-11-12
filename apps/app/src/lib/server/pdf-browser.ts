// The export browser (#190): the headless Chromium the PDF export (export.ts) prints with. On Vercel it is the
// @sparticuz/chromium-min pack, downloaded from the release below into /tmp on a cold start and reused while the
// function stays warm (nothing of it is in the deployment, so the function stays under its size cap); on a
// developer's machine it is the local Chrome or Edge.
//
// It opens this site as the member who asked: their session headers go on requests to the site's own origin only
// (`sessionFor`), so /files/<id> opens for them and then sends the browser on to the storage host's signed link with
// no session attached. Fonts and styles load from the site the same way.
import { access } from 'node:fs/promises';

import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';
import { PAGE_HEIGHT, PAGE_WIDTH, type PrintJobType } from './export';

const chromiumVersion = '143.0.4';
const chromiumPackArch = process.arch === 'arm64' ? 'arm64' : 'x64';
const chromiumPackUrl = `https://github.com/Sparticuz/chromium/releases/download/v${chromiumVersion}/chromium-v${chromiumVersion}-pack.${chromiumPackArch}.tar`;

const localExecutableCandidates = [
	process.env.PUPPETEER_EXECUTABLE_PATH,
	process.env.CHROME_EXECUTABLE_PATH,
	process.env.GOOGLE_CHROME_BIN,
	process.env.CHROMIUM_PATH,
	'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
	'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
	'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
	'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
	'/usr/bin/google-chrome-stable',
	'/usr/bin/google-chrome',
	'/usr/bin/chromium-browser',
	'/usr/bin/chromium'
].filter((value): value is string => Boolean(value));

async function fileExists(filePath: string) {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function resolveLocalExecutablePath() {
	for (const candidate of localExecutableCandidates) {
		if (await fileExists(candidate)) {
			return candidate;
		}
	}

	return null;
}

function isServerlessChromiumRuntime() {
	return Boolean(
		process.env.VERCEL || process.env.AWS_EXECUTION_ENV || process.env.LAMBDA_TASK_ROOT
	);
}

const pdfChromiumArgs = ['--no-sandbox', '--disable-setuid-sandbox'];

export async function launchBrowser() {
	if (isServerlessChromiumRuntime()) {
		return puppeteer.launch({
			args: puppeteer.defaultArgs({
				args: [...chromium.args, ...pdfChromiumArgs],
				headless: 'shell'
			}),
			executablePath: await chromium.executablePath(chromiumPackUrl),
			headless: 'shell'
		});
	}

	const executablePath = await resolveLocalExecutablePath();

	if (!executablePath) {
		throw new Error(
			'No local Chrome/Edge executable found. Set PUPPETEER_EXECUTABLE_PATH before exporting PDFs.'
		);
	}

	return puppeteer.launch({
		args: pdfChromiumArgs,
		executablePath,
		headless: true
	});
}

/** The session headers a request of the export browser carries: the asker's, to this site's own origin; none to
 * any other host, port or scheme. */
export function sessionFor(address: string, site: string, session: Record<string, string>) {
	if (!URL.canParse(address)) return {};
	return new URL(address).origin === site ? session : {};
}

/** Prints the job's document to a PDF of 595 by 842 pages. The document is written into a blank page of the site
 * (GET /api/export/pdf), not a bare one, so the fonts and pictures it names load from the site as they do in the
 * app. */
export async function printPdf({ html, site, session }: PrintJobType) {
	const browser = await launchBrowser();
	try {
		const page = await browser.newPage();
		await page.setViewport({ width: PAGE_WIDTH, height: PAGE_HEIGHT, deviceScaleFactor: 2 });
		await page.emulateMediaType('screen');
		await page.setRequestInterception(true);
		page.on('request', (request) => {
			if (request.isInterceptResolutionHandled()) return;
			const extra = sessionFor(request.url(), site, session);
			const headers = Object.keys(extra).length ? { ...request.headers(), ...extra } : undefined;
			request.continue(headers ? { headers } : undefined).catch(() => undefined);
		});
		await page.goto(`${site}/api/export/pdf`, { waitUntil: 'domcontentloaded' });
		await page.setContent(html, { waitUntil: 'networkidle0' });
		await page.evaluate(async () => {
			await document.fonts.ready;
			await Promise.all(
				Array.from(document.images, (image) => image.decode().catch(() => undefined))
			);
		});
		return await page.pdf({
			width: `${PAGE_WIDTH}px`,
			height: `${PAGE_HEIGHT}px`,
			margin: { top: '0', right: '0', bottom: '0', left: '0' },
			printBackground: true,
			preferCSSPageSize: true
		});
	} finally {
		await browser.close();
	}
}
