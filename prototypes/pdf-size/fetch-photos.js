// PROTOTYPE (#146). Builds the 100 "stored photos" the export reads, the way ADR 0004 says the
// phone stores them. Throwaway: photos/ is gitignored, delete it whenever.
//
// 1. Download 100 distinct real camera photos (Unsplash via picsum.photos) at phone size:
//    4032×3024, a third of them portrait.
// 2. Turn each into a "phone original": half the portraits are written the iPhone way (landscape
//    pixels + EXIF Orientation 6), the rest upright; every file gets camera EXIF (make, model,
//    capture time, GPS).
// 3. Shrink it "on the phone": apply orientation, 2048 px long side, copy the metadata, WebP q80
//    (JPEG q92 for every tenth photo, the old-phone fallback). That is the only copy V1 stores.
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import sharp from 'sharp';

const COUNT = 100;
const ORIGINALS = new URL('./photos/originals/', import.meta.url);
const STORED = new URL('./photos/stored/', import.meta.url);

async function list() {
	const all = [];
	for (const page of [1, 2, 3, 4]) {
		const res = await fetch(`https://picsum.photos/v2/list?page=${page}&limit=100`);
		all.push(...(await res.json()));
	}
	// Big originals only, so the 4032 px download is a real downscale, not an upscale
	return all.filter((p) => p.width >= 4000).slice(0, COUNT);
}

function cameraExif(i, isIphone) {
	const day = String(1 + (i % 28)).padStart(2, '0');
	return {
		IFD0: isIphone
			? { Make: 'Apple', Model: 'iPhone 15 Pro' }
			: { Make: 'samsung', Model: 'SM-S921B' },
		IFD2: { DateTimeOriginal: `2026:09:${day} 10:${String(i % 60).padStart(2, '0')}:00` },
		IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '29/1 57/1 0/1', GPSLongitudeRef: 'W', GPSLongitude: '90/1 4/1 0/1' }
	};
}

async function phoneOriginal(p, i) {
	const isPortrait = i % 3 === 0;
	const isIphone = i % 2 === 0;
	const [w, h] = isPortrait ? [3024, 4032] : [4032, 3024];
	const res = await fetch(`https://picsum.photos/id/${p.id}/${w}/${h}`);
	let img = sharp(Buffer.from(await res.arrayBuffer()));
	let orientation = 1;
	if (isPortrait && isIphone) {
		// iPhone keeps the sensor's landscape pixels and says "rotate me" in EXIF
		img = sharp(await img.rotate(-90).toBuffer());
		orientation = 6;
	}
	const file = new URL(`${String(i).padStart(3, '0')}.jpg`, ORIGINALS);
	await img
		.withExif(cameraExif(i, isIphone))
		.withMetadata({ orientation })
		.jpeg({ quality: 92 })
		.toFile(file.pathname);
	return file;
}

async function phoneShrink(file, i) {
	const isJpegFallback = i % 10 === 9;
	const out = new URL(
		`${String(i).padStart(3, '0')}.${isJpegFallback ? 'jpg' : 'webp'}`,
		STORED
	);
	// createImageBitmap on the phone applies EXIF orientation, so the stored pixels are upright and
	// the copied metadata must say Orientation 1, or every viewer rotates the photo a second time
	const img = sharp(file.pathname)
		.autoOrient()
		.resize(2048, 2048, { fit: 'inside' })
		.keepMetadata();
	await (isJpegFallback ? img.jpeg({ quality: 92 }) : img.webp({ quality: 80 })).toFile(
		out.pathname
	);
}

await mkdir(ORIGINALS, { recursive: true });
await mkdir(STORED, { recursive: true });
const have = new Set(await readdir(STORED));
const photos = await list();
let i = 0;
const queue = photos.map((p) => ({ p, i: i++ }));
async function worker() {
	for (let job = queue.shift(); job; job = queue.shift()) {
		const name = String(job.i).padStart(3, '0');
		if (have.has(`${name}.webp`) || have.has(`${name}.jpg`)) continue;
		const original = await phoneOriginal(job.p, job.i);
		await phoneShrink(original, job.i);
		process.stdout.write('.');
	}
}
await Promise.all(Array.from({ length: 8 }, worker));
await writeFile(
	new URL('./photos/credits.json', import.meta.url),
	JSON.stringify(photos.map(({ id, author, url }) => ({ id, author, url })), null, '\t')
);
console.log(`\n${photos.length} photos in photos/stored`);
