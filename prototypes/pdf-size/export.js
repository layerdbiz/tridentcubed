// PROTOTYPE (#146). Exports test reports the V1 way and measures them: a print page on its own
// origin, every photo turned into a JPEG sized to its spot, headless Chromium (the
// @sparticuz/chromium build V1 runs on Vercel) printing it with page.pdf(). Then pdfimages checks
// what actually landed in the file.
//
//   pnpm export                 every scenario
//   pnpm export all-1up mixed   just those
//   pnpm export -- --naive      embed the stored WebP as is, to see what not resizing costs
//   pnpm export -- --sharpen    a light unsharp mask after resizing
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import sharp from 'sharp';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { cellOf, chooseStep, LADDER, LAYOUTS, paginate, sampleOf, printedSize, printPixels, PAGE } from './plan.js';

const STORED = new URL('./photos/stored/', import.meta.url);
const OUT = new URL('./out/', import.meta.url);
const args = process.argv.slice(2);
const isNaive = args.includes('--naive');
const shouldSharpen = args.includes('--sharpen');
const fixedStep = args.find((a) => a.startsWith('--step='))?.slice(7);

// Each scenario is a report: photo groups, each with its layout, as a surveyor would set them
const SCENARIOS = {
	'all-1up': (p) => [{ layout: '1-up', photos: p.slice(0, 100) }],
	'all-2up': (p) => [{ layout: '2-up', photos: p.slice(0, 100) }],
	'all-4up': (p) => [{ layout: '4-up', photos: p.slice(0, 100) }],
	'all-8up': (p) => [{ layout: '8-up', photos: p.slice(0, 100) }],
	mixed: (p) => [
		{ layout: '1-up', photos: p.slice(0, 10) },
		{ layout: '2-up', photos: p.slice(10, 40) },
		{ layout: '4-up', photos: p.slice(40, 80) },
		{ layout: '8-up', photos: p.slice(80, 100) }
	],
	// ADR 0004 expects about 150 photos a report; the extra 50 are mirrored copies, so their
	// bytes differ and Chromium cannot share one image between two spots
	'mixed-150': (p) => [
		{ layout: '1-up', photos: p.slice(0, 15) },
		{ layout: '2-up', photos: p.slice(15, 60) },
		{ layout: '4-up', photos: [...p.slice(60, 100), ...p.slice(100, 120)] },
		{ layout: '8-up', photos: p.slice(120, 150) }
	]
};

async function loadPhotos() {
	const names = (await readdir(STORED)).sort();
	const photos = [];
	for (const name of names) {
		const file = new URL(name, STORED).pathname;
		const meta = await sharp(file).metadata();
		photos.push({ id: name, file, width: meta.width, height: meta.height });
	}
	for (const p of photos.slice(0, 50)) photos.push({ ...p, id: `mirror-${p.id}`, isMirror: true });
	return photos;
}

/** One print JPEG: baseline, YCbCr 4:2:0, upright, no metadata, so Skia copies it byte for byte. */
async function printJpeg(photo, layout, step) {
	const px = printPixels(layout, photo, step.ppi);
	let img = sharp(photo.file).resize(px.width, px.height, { kernel: 'lanczos3' });
	if (photo.isMirror) img = img.flop();
	if (shouldSharpen) img = img.sharpen({ sigma: 0.5 });
	return img.jpeg({ quality: step.quality, chromaSubsampling: '4:2:0', mozjpeg: true }).toBuffer();
}

async function encodeAll(spots, step) {
	const images = new Map();
	const jobs = [...spots];
	await Promise.all(
		Array.from({ length: 4 }, async () => {
			for (let job = jobs.shift(); job; job = jobs.shift()) {
				images.set(job.photo.id, await printJpeg(job.photo, job.layout, step));
			}
		})
	);
	return images;
}

function html(title, pages) {
	const pageCss = `
		@page { size: Letter; margin: 0 }
		* { box-sizing: border-box; margin: 0 }
		body { font-family: 'Open Sans', sans-serif; color: #1c2430 }
		.page { width: ${PAGE.width}in; height: ${PAGE.height}in; padding: ${PAGE.margin}in; break-after: page; overflow: hidden }
		header { height: ${PAGE.header}in; display: flex; justify-content: space-between; font-size: 9pt; color: #5b6573; border-bottom: 1px solid #d5dbe3; margin-bottom: 0.1in }
		.grid { display: grid; gap: ${PAGE.gap}in }
		figure { display: flex; flex-direction: column; align-items: center }
		.frame { display: flex; align-items: center; justify-content: center }
		figcaption { height: ${PAGE.caption}in; font-size: 8pt; padding-top: 0.05in }
		h1 { font-size: 28pt; margin-top: 3in } p { font-size: 11pt; line-height: 1.5; margin-top: 0.2in; max-width: 6in }`;
	const cover = `<section class="page"><h1>${title}</h1><p>Prototype export for ticket #146. Every photo below
		is a JPEG made for its spot on the page. This text stays real, selectable text in the PDF.</p></section>`;
	const body = pages
		.map((page, n) => {
			const cell = cellOf(page.layout);
			const { cols } = LAYOUTS[page.layout];
			const figures = page.photos
				.map((photo) => {
					const size = printedSize(page.layout, photo);
					return `<figure style="width:${cell.width}in"><div class="frame" style="height:${cell.height}in">
						<img src="/img/${photo.id}" style="width:${size.width}in;height:${size.height}in"></div>
						<figcaption>${photo.id} · ${page.layout} · captured 2026-09 · Grand Isle</figcaption></figure>`;
				})
				.join('');
			return `<section class="page"><header><span>${title}</span><span>Photos · page ${n + 1} of ${pages.length}</span></header>
				<div class="grid" style="grid-template-columns:repeat(${cols},${cell.width}in)">${figures}</div></section>`;
		})
		.join('');
	return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${pageCss}</style></head><body>${cover}${body}</body></html>`;
}

/** Peak resident memory (MB) of a process and all its children, sampled every 100 ms. */
function watchMemory(rootPid) {
	let peak = 0;
	const timer = setInterval(() => {
		try {
			const rows = execFileSync('ps', ['-eo', 'pid=,ppid=,rss='], { encoding: 'utf8' })
				.trim()
				.split('\n')
				.map((l) => l.trim().split(/\s+/).map(Number));
			const tree = new Set([rootPid]);
			for (let grew = true; grew; ) {
				grew = false;
				for (const [pid, ppid] of rows) {
					if (tree.has(ppid) && !tree.has(pid)) (tree.add(pid), (grew = true));
				}
			}
			const kb = rows.filter(([pid]) => tree.has(pid)).reduce((sum, [, , rss]) => sum + rss, 0);
			peak = Math.max(peak, kb / 1024);
		} catch {}
	}, 100);
	return () => (clearInterval(timer), Math.round(peak));
}

function inspect(pdfPath) {
	const list = execFileSync('pdfimages', ['-list', pdfPath], { encoding: 'utf8' }).split('\n').slice(2);
	return list
		.filter(Boolean)
		.map((line) => line.trim().split(/\s+/))
		.map((c) => ({ page: +c[0], width: +c[3], height: +c[4], color: c[5], enc: c[8], xppi: +c[12], size: c[14] }));
}

async function run(name, all) {
	const pages = paginate(SCENARIOS[name](all));
	const pageCount = pages.length + 1;
	const t0 = performance.now();
	let images;
	let choice;
	if (isNaive) {
		images = new Map(
			await Promise.all(pages.flatMap((p) => p.photos).map(async (p) => [p.id, await readFile(p.file)]))
		);
		choice = { step: { ppi: 'stored', quality: 'stored' }, fits: null, tried: [] };
	} else {
		const spots = pages.flatMap((page) => page.photos.map((photo) => ({ photo, layout: page.layout })));
		const total = (map) => [...map.values()].reduce((s, b) => s + b.length, 0);
		if (fixedStep) {
			const step = LADDER[+fixedStep];
			images = await encodeAll(spots, step);
			choice = { step, fits: null, tried: [] };
		} else {
			// Pick a step from every fifth photo (it runs about 5 % heavy), then make all the JPEGs from one
			// step above it and check the real total
			const sample = sampleOf(spots);
			const guess = await chooseStep(pageCount, async (step) =>
				Math.round((total(await encodeAll(sample, step)) * spots.length) / sample.length)
			);
			choice = await chooseStep(
				pageCount,
				async (step) => total((images = await encodeAll(spots, step))),
				{ from: Math.max(0, guess.index - 1) }
			);
			choice.tried = [...guess.tried.map((t) => ({ ...t, isSample: true })), ...choice.tried];
		}
	}
	const encodeMs = performance.now() - t0;
	const photoBytes = [...images.values()].reduce((s, b) => s + b.length, 0);

	const page = html(`Test report · ${name}`, pages);
	const server = createServer((req, res) => {
		if (req.url === '/print') return res.end(page);
		const img = images.get(decodeURIComponent(req.url.slice(5)));
		if (!img) return ((res.statusCode = 404), res.end());
		res.setHeader('content-type', isNaive ? 'image/webp' : 'image/jpeg');
		res.end(img);
	});
	await new Promise((r) => server.listen(0, '127.0.0.1', r));
	const t1 = performance.now();
	const browser = await puppeteer.launch({
		executablePath: await chromium.executablePath(),
		args: chromium.args,
		headless: 'shell'
	});
	const stopWatching = watchMemory(browser.process().pid);
	const tab = await browser.newPage();
	await tab.goto(`http://127.0.0.1:${server.address().port}/print`, { waitUntil: 'networkidle0' });
	const pdfPath = new URL(`${name}${isNaive ? '.naive' : ''}${shouldSharpen ? '.sharp' : ''}${fixedStep ? `.step${fixedStep}` : ''}.pdf`, OUT).pathname;
	await tab.pdf({ path: pdfPath, printBackground: true, preferCSSPageSize: true, tagged: true, timeout: 0 });
	const chromeMb = stopWatching();
	await browser.close();
	server.close();
	const renderMs = performance.now() - t1;

	const pdfBytes = (await stat(pdfPath)).size;
	const embedded = inspect(pdfPath);
	const expected = pages.flatMap((p) => p.photos.map((photo) => printPixels(p.layout, photo, choice.step.ppi)));
	const isAllSlotJpeg =
		!isNaive &&
		embedded.length === expected.length &&
		embedded.every((e, i) => e.enc === 'jpeg' && e.width === expected[i].width && e.height === expected[i].height);
	return {
		scenario: name,
		mode: isNaive ? 'naive (stored WebP as is)' : shouldSharpen ? 'slot JPEG + sharpen' : 'slot JPEG',
		photos: expected.length,
		pages: pageCount,
		step: choice.step,
		fits: choice.fits,
		tried: choice.tried.map((t) => `${t.isSample ? 'sample ' : ''}${t.ppi}ppi q${t.quality}: ${(t.estimate / 1e6).toFixed(2)} MB`),
		photoMB: +(photoBytes / 1e6).toFixed(2),
		pdfMB: +(pdfBytes / 1e6).toFixed(2),
		overheadKB: Math.round((pdfBytes - photoBytes) / 1e3),
		encodeS: +(encodeMs / 1e3).toFixed(1),
		chromiumS: +(renderMs / 1e3).toFixed(1),
		chromiumPeakMB: chromeMb,
		nodePeakMB: Math.round(process.resourceUsage().maxRSS / 1024),
		images: { count: embedded.length, encodings: [...new Set(embedded.map((e) => e.enc))], isAllSlotJpeg }
	};
}

await mkdir(OUT, { recursive: true });
const all = await loadPhotos();
const names = args.filter((a) => !a.startsWith('--'));
const results = [];
for (const name of names.length ? names : Object.keys(SCENARIOS)) {
	const r = await run(name, all);
	console.log(JSON.stringify(r));
	results.push(r);
}
const tag = `${isNaive ? 'naive' : 'slot'}${shouldSharpen ? '-sharp' : ''}${fixedStep ? `-step${fixedStep}` : ''}`;
await writeFile(new URL(`results-${tag}.json`, OUT), JSON.stringify(results, null, '\t'));
