import { access } from "node:fs/promises";

import chromium from "@sparticuz/chromium-min";
import { json } from "@sveltejs/kit";
import puppeteer from "puppeteer-core";

import type { RequestHandler } from "./$types";

const chromiumVersion = "143.0.4";
const chromiumPackArch = process.arch === "arm64" ? "arm64" : "x64";
const chromiumPackUrl =
	`https://github.com/Sparticuz/chromium/releases/download/v${chromiumVersion}/chromium-v${chromiumVersion}-pack.${chromiumPackArch}.tar`;

const localExecutableCandidates = [
	process.env.PUPPETEER_EXECUTABLE_PATH,
	process.env.CHROME_EXECUTABLE_PATH,
	process.env.GOOGLE_CHROME_BIN,
	process.env.CHROMIUM_PATH,
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
	"/usr/bin/google-chrome-stable",
	"/usr/bin/google-chrome",
	"/usr/bin/chromium-browser",
	"/usr/bin/chromium",
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
		process.env.VERCEL ||
			process.env.AWS_EXECUTION_ENV ||
			process.env.LAMBDA_TASK_ROOT,
	);
}

async function launchBrowser() {
	if (isServerlessChromiumRuntime()) {
		return puppeteer.launch({
			args: puppeteer.defaultArgs({
				args: chromium.args,
				headless: "shell",
			}),
			executablePath: await chromium.executablePath(chromiumPackUrl),
			headless: "shell",
		});
	}

	const executablePath = await resolveLocalExecutablePath();

	if (!executablePath) {
		throw new Error(
			"No local Chrome/Edge executable found. Set PUPPETEER_EXECUTABLE_PATH before exporting PDFs.",
		);
	}

	return puppeteer.launch({
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
		executablePath,
		headless: true,
	});
}

const pdfOptions = {
	format: "Letter",
	margin: {
		top: "0",
		right: "0",
		bottom: "0",
		left: "0",
	},
	printBackground: true,
	preferCSSPageSize: true,
} as const;

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : "Unknown error";
}

export const POST: RequestHandler = async ({ request }) => {
	const payload = (await request.json().catch(() => null)) as {
		markup?: unknown;
		filename?: unknown;
	} | null;
	const markup = typeof payload?.markup === "string" ? payload.markup : "";
	const filename =
		typeof payload?.filename === "string" && payload.filename.trim()
			? payload.filename.trim()
			: "survey-report.pdf";

	if (!markup) {
		return json({ message: "Missing export markup." }, { status: 400 });
	}

	let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

	try {
		const printUrl = new URL("/export/print", request.url).href;

		browser = await launchBrowser();

		const page = await browser.newPage();
		await page.setViewport({ width: 816, height: 1056, deviceScaleFactor: 1 });
		await page.emulateMediaType("screen");

		const printResponse = await page.goto(printUrl, {
			waitUntil: "networkidle0",
		});

		if (!printResponse || !printResponse.ok()) {
			throw new Error(
				`Print shell failed with status ${
					printResponse?.status() ?? "unknown"
				}`,
			);
		}

		await page.waitForSelector(".preview-pages");
		await page.evaluate(
			(input) => {
				document.title = input.filename;

				const previewPages = document.querySelector(".preview-pages");

				if (!(previewPages instanceof HTMLElement)) {
					throw new Error("Print root not found.");
				}

				previewPages.innerHTML = input.markup;
			},
			{ markup, filename },
		);

		await page.waitForFunction(
			() => document.querySelectorAll(".preview-page").length > 0,
		);

		await page.evaluate(async () => {
			await document.fonts.ready;

			await Promise.all(
				Array.from(document.images).map(async (image) => {
					if ("decode" in image) {
						try {
							await image.decode();
						} catch {
							return;
						}
					}
				}),
			);
		});

		const pdf = await page.pdf(pdfOptions);

		return new Response(Buffer.from(pdf), {
			status: 200,
			headers: {
				"content-type": "application/pdf",
				"content-disposition": `attachment; filename="${
					filename.replace(/"/g, "")
				}"`,
			},
		});
	} catch (error) {
		console.error("PDF export failed", error);
		return json(
			{
				message: "PDF export failed.",
				details: getErrorMessage(error),
			},
			{ status: 500 },
		);
	} finally {
		if (browser) await browser.close();
	}
};
