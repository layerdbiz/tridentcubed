import { access } from "node:fs/promises";

import chromium from "@sparticuz/chromium-min";
import { json } from "@sveltejs/kit";
import puppeteer from "puppeteer-core";

import { createExportSession } from "$lib/server/export-session-store";
import type { RequestHandler } from "./$types";

/** Inject a `<base href>` so all relative CSS/font URLs resolve against the deployment origin. */
function withDocumentBase(html: string, baseHref: string) {
	return html.replace(/(<head[^>]*>)/i, `$1<base href="${baseHref}">`);
}

/** Strip all `<script>` tags — safety net for any residual client bootstrap code. */
function stripScripts(html: string) {
	return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

/**
 * Inject additional `<link rel="stylesheet">` tags before `</head>`.
 * Used to include the client page's full CSS set (Tailwind, app CSS, all
 * Svelte-scoped component files) so the PDF matches the live preview.
 */
function injectCssLinks(html: string, hrefs: string[]) {
	if (!hrefs.length) return html;
	const tags = hrefs
		.map((href) =>
			`<link rel="stylesheet" href="${href.replace(/"/g, "&quot;")}">`
		)
		.join("");
	return html.replace(/(<\/head>)/i, `${tags}$1`);
}

type InlineCssBlock = {
	href: string;
	cssText: string;
};

type InlineStylesheetResult = {
	href: string;
	normalizedHref: string;
	ok: boolean;
	status?: number;
	contentType?: string | null;
	bytes?: number;
	error?: string;
};

function extractStylesheetHrefs(html: string) {
	return Array.from(
		html.matchAll(
			/<link\b(?=[^>]*\brel=["'][^"']*stylesheet[^"']*["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi,
		),
		(match) => match[1],
	);
}

function normalizeAssetUrl(href: string, baseHref: string) {
	const url = new URL(href, baseHref);
	const baseUrl = new URL(baseHref);
	const isSameAppAsset = url.pathname.startsWith("/_app/") ||
		url.pathname === "/favicon.svg" ||
		url.pathname.startsWith("/branding/") ||
		url.pathname.startsWith("/data/") ||
		url.pathname.startsWith("/dividers/") ||
		url.pathname.startsWith("/emails/") ||
		url.pathname.startsWith("/icons/") ||
		url.pathname.startsWith("/images/") ||
		url.pathname.startsWith("/masks/") ||
		url.pathname.startsWith("/partners/") ||
		url.pathname.startsWith("/photos/") ||
		url.pathname.startsWith("/services/") ||
		url.pathname.startsWith("/social/") ||
		url.pathname.startsWith("/team/") ||
		url.pathname.startsWith("/video/");

	if (
		url.origin !== baseUrl.origin &&
		isSameAppAsset &&
		(url.hostname.endsWith(".vercel.app") ||
			baseUrl.hostname.endsWith(".vercel.app"))
	) {
		return new URL(`${url.pathname}${url.search}${url.hash}`, baseUrl).href;
	}

	return url.href;
}

function rebaseCssUrls(
	cssText: string,
	stylesheetHref: string,
	baseHref: string,
) {
	return cssText.replace(/url\(([^)]+)\)/gi, (fullMatch, rawValue) => {
		const value = String(rawValue).trim().replace(/^(['"])(.*)\1$/, "$2");

		if (
			!value ||
			value.startsWith("data:") ||
			value.startsWith("blob:") ||
			value.startsWith("#") ||
			value.startsWith("http:") ||
			value.startsWith("https:")
		) {
			return fullMatch;
		}

		try {
			const absoluteUrl = normalizeAssetUrl(
				new URL(value, stylesheetHref).href,
				baseHref,
			);
			return `url("${absoluteUrl}")`;
		} catch {
			return fullMatch;
		}
	});
}

function injectCssBlocks(html: string, blocks: InlineCssBlock[]) {
	if (!blocks.length) return html;
	const tags = blocks
		.map(
			(block, index) =>
				`<style data-pdf-inline-css="${index}" data-pdf-source="${
					block.href.replace(/"/g, "&quot;")
				}">${block.cssText.replace(/<\/style/gi, "<\\/style")}</style>`,
		)
		.join("");
	return html.replace(/(<\/head>)/i, `${tags}$1`);
}

function ensureHtmlDocument(html: string) {
	if (/<html[\s>]/i.test(html) && /<head[\s>]/i.test(html)) {
		return html;
	}

	return `<!doctype html><html lang="en"><head></head><body>${html}</body></html>`;
}

async function inlineStylesheets({
	hrefs,
	fetch,
	baseHref,
}: {
	hrefs: string[];
	fetch: typeof globalThis.fetch;
	baseHref: string;
}) {
	const uniqueHrefs = Array.from(
		new Set(hrefs.map((href) => normalizeAssetUrl(href, baseHref))),
	);
	const blocks: InlineCssBlock[] = [];
	const results: InlineStylesheetResult[] = [];

	for (const href of uniqueHrefs) {
		try {
			const response = await fetch(href);
			const cssText = await response.text();
			const contentType = response.headers.get("content-type");
			const rebasedCss = rebaseCssUrls(cssText, href, baseHref);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			if (!rebasedCss.trim()) {
				throw new Error("Empty stylesheet response");
			}

			if (
				contentType &&
				!contentType.includes("text/css") &&
				!href.toLowerCase().includes(".css")
			) {
				throw new Error(`Unexpected stylesheet content-type: ${contentType}`);
			}

			blocks.push({ href, cssText: rebasedCss });
			results.push({
				href,
				normalizedHref: href,
				ok: true,
				status: response.status,
				contentType,
				bytes: rebasedCss.length,
			});
		} catch (error) {
			results.push({
				href,
				normalizedHref: href,
				ok: false,
				error: getErrorMessage(error),
			});
		}
	}

	return { blocks, results };
}

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

// --disable-web-security is intentional: the PDF Chromium instance loads our own SSR HTML
// via setContent (page URL = about:blank). Without this flag, CORS blocks CSS and font
// requests from the null origin to the deployment's absolute asset URLs.
const pdfChromiumArgs = [
	"--disable-web-security",
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

export const POST: RequestHandler = async ({ request, fetch }) => {
	const payload = (await request.json().catch(() => null)) as {
		snapshot?: unknown;
		filename?: unknown;
		cssLinks?: unknown;
	} | null;
	const snapshot = payload?.snapshot ?? null;
	const filename =
		typeof payload?.filename === "string" && payload.filename.trim()
			? payload.filename.trim()
			: "survey-report.pdf";
	// Only allow absolute http(s) URLs to prevent injection.
	const cssLinks = (Array.isArray(payload?.cssLinks) ? payload.cssLinks : [])
		.filter((l): l is string =>
			typeof l === "string" && /^https?:\/\//.test(l)
		);

	if (!snapshot || typeof snapshot !== "object") {
		return json({ message: "Missing export snapshot." }, { status: 400 });
	}

	let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

	try {
		const session = createExportSession({ data: snapshot, filename });
		const exportId = session.token;
		const baseHref = new URL("/", request.url).href;
		const printUrl =
			new URL(`/export/print/${session.token}`, request.url).href;

		// SvelteKit's internal fetch short-circuits same-origin page routes in-process,
		// so the session store is always in the same function instance — no cross-process loss.
		// The [token] page has ssr=true;csr=false so the returned HTML contains the markup.
		const printResponse = await fetch(
			new Request(printUrl, {
				headers: {
					accept: "text/html",
				},
			}),
		);

		if (!printResponse.ok) {
			throw new Error(
				`Print route returned ${printResponse.status}: ${await printResponse
					.text()}`,
			);
		}

		const rawPrintHtml = ensureHtmlDocument(
			stripScripts(await printResponse.text()),
		);
		const printShellCssLinks = extractStylesheetHrefs(rawPrintHtml);
		const { blocks: inlineCssBlocks, results: inlineCssResults } =
			await inlineStylesheets({
				hrefs: [...printShellCssLinks, ...cssLinks],
				fetch,
				baseHref,
			});

		console.info("[pdf-export] stylesheet-plan", {
			exportId,
			requestUrl: request.url,
			printUrl,
			baseHref,
			printResponseContentType: printResponse.headers.get("content-type"),
			hasDocumentHead: /<head[\s>]/i.test(rawPrintHtml),
			clientCssLinkCount: cssLinks.length,
			clientCssLinks: cssLinks,
			printShellCssLinkCount: printShellCssLinks.length,
			printShellCssLinks,
			inlineCssCount: inlineCssBlocks.length,
		});

		console.info("[pdf-export] stylesheet-results", {
			exportId,
			results: inlineCssResults,
		});

		const printHtml = withDocumentBase(
			injectCssBlocks(
				injectCssLinks(rawPrintHtml, cssLinks),
				inlineCssBlocks,
			),
			baseHref,
		);

		browser = await launchBrowser();

		const page = await browser.newPage();
		page.on("response", (response) => {
			const resourceType = response.request().resourceType();
			if (resourceType !== "stylesheet" && resourceType !== "font") return;

			console.info("[pdf-export] asset-response", {
				exportId,
				resourceType,
				url: response.url(),
				status: response.status(),
			});
		});
		page.on("requestfailed", (request) => {
			const resourceType = request.resourceType();
			if (resourceType !== "stylesheet" && resourceType !== "font") return;

			console.error("[pdf-export] asset-failed", {
				exportId,
				resourceType,
				url: request.url(),
				error: request.failure()?.errorText ?? "Unknown request failure",
			});
		});
		page.on("pageerror", (error) => {
			console.error("[pdf-export] page-error", {
				exportId,
				error: getErrorMessage(error),
			});
		});
		await page.setViewport({ width: 816, height: 1056, deviceScaleFactor: 1 });
		await page.emulateMediaType("screen");

		// setContent loads the pre-rendered HTML directly (no outbound document request).
		// withDocumentBase injects <base href> so CSS/font URLs resolve against the
		// deployment origin. --disable-web-security (in pdfChromiumArgs) lifts the CORS
		// restriction that would otherwise block asset fetches from the null/about:blank origin.
		await page.setContent(printHtml, { waitUntil: "networkidle0" });

		// Markup is in the SSR HTML; safety assertion only.
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
