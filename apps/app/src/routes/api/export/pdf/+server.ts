import { access } from "node:fs/promises";

import chromium from "@sparticuz/chromium-min";
import { json } from "@sveltejs/kit";
import puppeteer from "puppeteer-core";

import { createExportSession } from "$lib/server/export-session-store";
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

// The PDF browser now navigates directly to the SSR print route, so normal same-origin
// stylesheet loading should work without the earlier about:blank/setContent workaround.
const pdfChromiumArgs = [
	"--no-sandbox",
	"--disable-setuid-sandbox",
];

async function launchBrowser() {
	if (isServerlessChromiumRuntime()) {
		return puppeteer.launch({
			args: puppeteer.defaultArgs({
				args: [...chromium.args, ...pdfChromiumArgs],
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
		args: pdfChromiumArgs,
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
		snapshot?: unknown;
		filename?: unknown;
	} | null;
	const snapshot = payload?.snapshot ?? null;
	const filename =
		typeof payload?.filename === "string" && payload.filename.trim()
			? payload.filename.trim()
			: "survey-report.pdf";

	if (!snapshot || typeof snapshot !== "object") {
		return json({ message: "Missing export snapshot." }, { status: 400 });
	}

	let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

	try {
		const session = createExportSession({ data: snapshot, filename });
		const exportId = session.token;
		const printUrl =
			new URL(`/export/print/${session.token}`, request.url).href;

		browser = await launchBrowser();

		const page = await browser.newPage();
		page.on("pageerror", (error) => {
			console.error("[pdf-export] page-error", {
				exportId,
				error: getErrorMessage(error),
			});
		});
		await page.setViewport({ width: 816, height: 1056, deviceScaleFactor: 1 });
		await page.emulateMediaType("screen");
		const printResponse = await page.goto(printUrl, {
			waitUntil: "networkidle0",
		});

		if (!printResponse || !printResponse.ok()) {
			throw new Error(
				`Print route failed with status ${
					printResponse?.status() ?? "unknown"
				}`,
			);
		}

		console.info("[pdf-export] navigation", {
			exportId,
			requestUrl: request.url,
			printUrl,
			finalUrl: page.url(),
			status: printResponse.status(),
			contentType: printResponse.headers()["content-type"] ?? null,
		});

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

		const documentDiagnostics = await page.evaluate(() => {
			const previewPage = document.querySelector(".preview-page");
			const title = document.querySelector("h1, h2");

			return {
				locationHref: location.href,
				baseURI: document.baseURI,
				headStyleCount: document.head.querySelectorAll("style").length,
				headStylesheetLinkCount: document.head.querySelectorAll(
					'link[rel="stylesheet"]',
				).length,
				stylesheetSummaries: Array.from(document.styleSheets).map(
					(sheet, index) => {
						let ruleCount: number | null = null;
						let accessError = "";

						try {
							ruleCount = sheet.cssRules.length;
						} catch (error) {
							accessError = error instanceof Error
								? error.message
								: String(error);
						}

						const ownerNode = sheet.ownerNode;
						const ownerTag =
							ownerNode && ownerNode.nodeType === Node.ELEMENT_NODE
								? (ownerNode as Element).tagName.toLowerCase()
								: null;

						return {
							index,
							href: sheet.href || "inline",
							ownerTag,
							ruleCount,
							accessError,
						};
					},
				),
				previewPage: previewPage
					? {
						className: previewPage.className,
						width: getComputedStyle(previewPage).width,
						minHeight: getComputedStyle(previewPage).minHeight,
						display: getComputedStyle(previewPage).display,
						breakAfter: getComputedStyle(previewPage).breakAfter,
						boxShadow: getComputedStyle(previewPage).boxShadow,
					}
					: null,
				title: title
					? {
						text: title.textContent?.slice(0, 80) ?? "",
						fontFamily: getComputedStyle(title).fontFamily,
						fontSize: getComputedStyle(title).fontSize,
						textTransform: getComputedStyle(title).textTransform,
					}
					: null,
			};
		});

		console.info("[pdf-export] document-diagnostics", {
			exportId,
			documentDiagnostics,
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
