// Download on the Preview tab (#190): the pages the preview sends, printed to a PDF for a signed-in member. Who may
// call it, how the report's files open and the limits of this way are written in #lib/server/export.ts; the browser
// is #lib/server/pdf-browser.ts. Rendering the report on the server from the database (#145) replaces it.
import { exportPdf } from '#lib/server/export.js';
import { printPdf } from '#lib/server/pdf-browser.js';
import type { RequestHandler } from './$types';

// Its own Vercel function, with time for a cold start (the Chromium pack download) and a long report. Memory is a
// project setting on Vercel (Settings > Functions > Function CPU), not set here.
export const config = { maxDuration: 300, split: true };

// The blank page of this site the export browser writes the pages into.
export const GET: RequestHandler = () =>
	new Response('<!doctype html><title>Report</title>', {
		headers: { 'content-type': 'text/html' }
	});

export const POST: RequestHandler = ({ request, locals }) =>
	exportPdf({ request, actor: locals.actor }, printPdf);
