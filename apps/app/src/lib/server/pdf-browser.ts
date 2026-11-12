// The headless browser both PDF routes print with: the pack Chromium on a serverless host, Chrome or Edge on a
// developer's machine. Shared by the report export (routes/api/export/pdf) and the look prototype's download
// (routes/prototype/look/pdf).
import { access } from 'node:fs/promises';

import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

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

// The PDF browser now navigates directly to the SSR print route, so normal same-origin
// stylesheet loading should work without the earlier about:blank/setContent workaround.
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
