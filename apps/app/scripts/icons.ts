// Makes the home screen icons (#200) again: `pnpm --filter app icons`. Each is the dark-background logo
// (packages/ui/static/branding/logo-dark.svg) on solid black, drawn by a browser and saved as a PNG into the shared
// static folder under the names in src/lib/install/install.constants.ts. The files are committed; run this only when
// the logo changes, then look at every file before committing it.
//
// The browser is the PDF export's (src/lib/server/pdf-browser.ts): the local Chrome or Edge, or the one named by
// PUPPETEER_EXECUTABLE_PATH. A bare Vite server loads the app's code, as scripts/seed-sql.ts does.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const STATIC = fileURLToPath(new URL('../../../packages/ui/static', import.meta.url));

// How wide the logo is, as a share of the icon. A plain icon is shown whole, so the logo only needs air around it.
// A maskable icon is cut by Android to a circle or squircle that always keeps the middle circle, 80% of the icon
// wide: nothing of the logo may be farther from the centre than 40% of the icon's width. At 60% wide its farthest
// point is 34% out; `readReach` measures each maskable icon and stops the run if one reaches past the circle.
const PLAIN_SHARE = 0.68;
const MASKABLE_SHARE = 0.6;
const SAFE_REACH = 0.4;

function toPage(logo: string, share: number) {
	return `<!doctype html>
		<style>
			html, body { margin: 0; height: 100%; background: #000000; }
			body { display: grid; place-items: center; }
			svg { width: ${share * 100}vw; height: auto; }
		</style>
		${logo}`;
}

// How far the logo reaches from the centre of a finished icon, as a share of its width: the farthest pixel that is
// not black. Read in the page, since the browser already knows how to open a PNG.
async function readReach(png: string) {
	const image = new Image();
	image.src = `data:image/png;base64,${png}`;
	await image.decode();
	const side = image.naturalWidth;
	const canvas = document.createElement('canvas');
	canvas.width = side;
	canvas.height = side;
	const pen = canvas.getContext('2d')!;
	pen.drawImage(image, 0, 0);
	const { data } = pen.getImageData(0, 0, side, side);
	const centre = (side - 1) / 2;
	let reach = 0;
	for (let y = 0; y < side; y += 1) {
		for (let x = 0; x < side; x += 1) {
			const at = (y * side + x) * 4;
			if (data[at] + data[at + 1] + data[at + 2] === 0) continue;
			reach = Math.max(reach, Math.hypot(x - centre, y - centre) / side);
		}
	}
	return reach;
}

const server = await createServer({
	// As a path of this machine: a URL's own pathname is not one on Windows (/V:/...), where Vite then finds nothing.
	root: fileURLToPath(new URL('..', import.meta.url)),
	configFile: false,
	logLevel: 'silent',
	server: { middlewareMode: true, hmr: false, ws: false },
	appType: 'custom'
});
try {
	const install = await server.ssrLoadModule('/src/lib/install/install.constants.ts');
	const { launchBrowser } = await server.ssrLoadModule('/src/lib/server/pdf-browser.ts');
	const icons = [
		{ path: install.ICON_192, size: 192, share: PLAIN_SHARE, isMaskable: false },
		{ path: install.ICON_512, size: 512, share: PLAIN_SHARE, isMaskable: false },
		{ path: install.ICON_APPLE, size: 180, share: PLAIN_SHARE, isMaskable: false },
		{ path: install.ICON_MASKABLE_192, size: 192, share: MASKABLE_SHARE, isMaskable: true },
		{ path: install.ICON_MASKABLE_512, size: 512, share: MASKABLE_SHARE, isMaskable: true }
	];
	const logo = await readFile(join(STATIC, install.LOGO), 'utf8');

	const browser = await launchBrowser();
	try {
		const page = await browser.newPage();
		for (const { path, size, share, isMaskable } of icons) {
			const file = join(STATIC, path);
			await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
			await page.setContent(toPage(logo, share));
			const png = Buffer.from(await page.screenshot({ type: 'png' }));
			const reach = await page.evaluate(readReach, png.toString('base64'));
			if (isMaskable && reach > SAFE_REACH) {
				throw new Error(
					`${path}: the logo reaches ${reach.toFixed(3)} from the centre, past ${SAFE_REACH}.`
				);
			}
			await mkdir(dirname(file), { recursive: true });
			await writeFile(file, png);
			console.log(`${size} px  logo reaches ${reach.toFixed(3)}  ${file}`);
		}
	} finally {
		await browser.close();
	}
} finally {
	await server.close();
}
process.exit(0);
