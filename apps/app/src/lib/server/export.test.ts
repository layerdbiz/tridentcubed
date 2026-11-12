// Download on the Preview tab (#190; spec #179 stories 73 to 75): who may call the PDF export, and what they get. The
// headless browser is the boundary, played here by a printer that records what it was asked to print; the Users are
// real sign-ins on the in-process database.
import { beforeAll, describe, expect, it } from 'vite-plus/test';
import { exportPdf, type PrinterType, type PrintJobType } from './export';
import { createTestSignIn } from './testing';

const SITE = 'http://localhost:5174';
const PDF = new TextEncoder().encode('%PDF-1.7 fake');

function createPrinter() {
	const jobs: PrintJobType[] = [];
	const print: PrinterType = async (job) => {
		jobs.push(job);
		return PDF;
	};
	return { jobs, print };
}

function requestOf({
	origin = SITE,
	cookie = 'better-auth.session_token=abc',
	body = {
		pages: '<article data-page>One</article>',
		styles: '',
		filename: 'KOGA-2026-11-12-J01-FR01.pdf'
	}
}: { origin?: string | null; cookie?: string; body?: unknown } = {}) {
	const headers = new Headers({ 'content-type': 'application/json', cookie });
	if (origin) headers.set('origin', origin);
	return new Request(`${SITE}/api/export/pdf`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	});
}

describe('the PDF export', () => {
	let test: Awaited<ReturnType<typeof createTestSignIn>>;
	beforeAll(async () => {
		test = await createTestSignIn();
	});

	it('gives a signed-out visitor nothing', async () => {
		const printer = createPrinter();
		const response = await exportPdf({ request: requestOf(), actor: undefined }, printer.print);
		expect(response.status).toBe(401);
		expect(response.headers.get('content-type')).not.toBe('application/pdf');
		expect(printer.jobs).toEqual([]);
	});

	it('gives a Guest nothing', async () => {
		const { actor: guest, cookie } = await test.signIn('someone@gmail.com');
		expect(guest.organizationId).toBeNull();
		const printer = createPrinter();
		const response = await exportPdf(
			{ request: requestOf({ cookie }), actor: guest },
			printer.print
		);
		expect(response.status).toBe(403);
		expect(printer.jobs).toEqual([]);
	});

	it('refuses a member’s request when it comes from another site', async () => {
		const { actor, cookie } = await test.signIn('ana@tridentcubed.com');
		const printer = createPrinter();
		for (const origin of ['https://evil.example', 'http://localhost:5175', null]) {
			const response = await exportPdf(
				{ request: requestOf({ origin, cookie }), actor },
				printer.print
			);
			expect(response.status).toBe(403);
		}
		expect(printer.jobs).toEqual([]);
	});

	it('gives a member the PDF of the pages they sent, named by the document ID', async () => {
		const { actor, cookie } = await test.signIn('ana@tridentcubed.com');
		const printer = createPrinter();
		const response = await exportPdf(
			{
				request: requestOf({
					cookie,
					body: {
						pages:
							'<article data-page><img src="/files/0b6f2f8e-2b1c-4c47-9d8e-1f4c6f0a1b2c"></article>',
						styles: '<style>.a{}</style>',
						filename: 'SGL-2026-02-03-J01-FR01.pdf'
					}
				}),
				actor
			},
			printer.print
		);
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('application/pdf');
		expect(response.headers.get('content-disposition')).toBe(
			'attachment; filename="SGL-2026-02-03-J01-FR01.pdf"'
		);
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(PDF);
		// The pages are printed on this site, with the member's own session, so their files open.
		expect(printer.jobs).toHaveLength(1);
		const [job] = printer.jobs;
		expect(job.site).toBe(SITE);
		expect(job.html).toContain('<img src="/files/0b6f2f8e-2b1c-4c47-9d8e-1f4c6f0a1b2c">');
		expect(job.html).toContain('<style>.a{}</style>');
		expect(job.html).toContain(`<base href="${SITE}/" />`);
		expect(job.session).toEqual({ cookie });
	});

	it('names the file by the document ID alone, whatever else the name holds', async () => {
		const { actor, cookie } = await test.signIn('ana@tridentcubed.com');
		const printer = createPrinter();
		async function nameOf(filename: unknown) {
			const response = await exportPdf(
				{
					request: requestOf({
						cookie,
						body: { pages: '<article data-page></article>', filename }
					}),
					actor
				},
				printer.print
			);
			return response.headers.get('content-disposition');
		}
		expect(await nameOf('  CVA-2026-05-12-J01-FR01-R01.pdf ')).toBe(
			'attachment; filename="CVA-2026-05-12-J01-FR01-R01.pdf"'
		);
		expect(await nameOf('CVA-2026-05-12-J01-FR01')).toBe(
			'attachment; filename="CVA-2026-05-12-J01-FR01.pdf"'
		);
		expect(await nameOf('../"x"\r\nset-cookie: a.pdf')).toBe(
			'attachment; filename="x-set-cookie-a.pdf"'
		);
		expect(await nameOf(undefined)).toBe('attachment; filename="report.pdf"');
		expect(await nameOf('')).toBe('attachment; filename="report.pdf"');
	});
});
