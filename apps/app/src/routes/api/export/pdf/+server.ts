import puppeteer from "puppeteer";
import { json } from "@sveltejs/kit";

import {
	createExportSession,
	deleteExportSession,
} from "$lib/server/export-session-store";

import type { RequestHandler } from "./$types";

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
	let token = "";

	try {
		const session = createExportSession({ markup, filename });
		token = session.token;
		const printUrl = new URL(`/export/print/${token}`, request.url).href;

		browser = await puppeteer.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});

		const page = await browser.newPage();
		await page.setViewport({ width: 816, height: 1056, deviceScaleFactor: 1 });
		await page.emulateMediaType("screen");
		const response = await page.goto(printUrl, { waitUntil: "networkidle0" });

		if (!response || !response.ok()) {
			throw new Error(
				`Print route failed with status ${response?.status() ?? "unknown"}`,
			);
		}

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
		return json({ message: "PDF export failed." }, { status: 500 });
	} finally {
		if (token) deleteExportSession(token);
		if (browser) await browser.close();
	}
};
