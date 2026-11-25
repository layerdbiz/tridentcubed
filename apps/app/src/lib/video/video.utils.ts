// Videos on the device (#327; glossary "Attachment", "Thumbnail"; Justin, 2026-11-24): a video in a photo group gets
// a thumbnail made automatically from one of its frames, which is what its spot shows, with a play button in the
// middle and its length at the bottom right. A PDF cannot play a video, so in the downloaded report the thumbnail is
// a link that opens the real video in the app (`toVideoLink`).
//
// Making the video smaller (WebM, #307) is a later ticket: for now it goes to storage as it came.
import { FILE_PREFIX } from '#lib/files/files.schema.js';
import type { MadeType } from '#lib/files/files.state.svelte.js';

/** Where the app plays a stored video: `/video/<file id>`, behind sign-in like every app address. */
export const VIDEO_PATH = '/video';

/** The longest side of a thumbnail, in pixels. */
const THUMBNAIL_SIDE = 1280;

/** How long the device waits for a video to say what it is before it makes a plain thumbnail instead. */
const WAIT_MS = 15_000;

/** The app's address that plays the video stored at `source` (`/files/<id>`); none for anything else. */
export function toVideoLink(origin: string, source: string) {
	const id = source.startsWith(FILE_PREFIX) ? source.slice(FILE_PREFIX.length) : '';
	return /^[0-9a-f-]{36}$/i.test(id) ? `${origin}${VIDEO_PATH}/${id}` : '';
}

/** A video's length as a clock reads it: 0:07, 1:05, 1:02:03. Nothing for a length not known. */
export function toLengthLabel(seconds: number | undefined) {
	if (!seconds || !Number.isFinite(seconds) || seconds < 0) return '';
	const whole = Math.max(1, Math.round(seconds));
	const hours = Math.floor(whole / 3600);
	const minutes = Math.floor((whole % 3600) / 60);
	const rest = String(whole % 60).padStart(2, '0');
	return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
}

/** Where in a video its thumbnail is taken: a second in, or a tenth of the way through a shorter one. */
export function toThumbnailTime(duration: number) {
	if (!Number.isFinite(duration) || duration <= 0) return 0;
	return Math.min(1, duration / 10);
}

/** A size fitted inside the longest side the thumbnail has, its shape kept. */
export function toThumbnailSize(width: number, height: number) {
	const scale = Math.min(1, THUMBNAIL_SIDE / Math.max(width, height, 1));
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale))
	};
}

// Waits for one of the video's events, or gives up after a while or on its error.
function when(video: HTMLVideoElement, event: string) {
	return new Promise<void>((resolve, reject) => {
		const timer = setTimeout(() => finish(new Error(`The video gave no ${event}.`)), WAIT_MS);
		function finish(error?: Error) {
			clearTimeout(timer);
			video.removeEventListener(event, done);
			video.removeEventListener('error', failed);
			if (error) reject(error);
			else resolve();
		}
		const done = () => finish();
		const failed = () => finish(new Error('The video could not be read.'));
		video.addEventListener(event, done);
		video.addEventListener('error', failed);
	});
}

function toJpeg(canvas: HTMLCanvasElement) {
	return new Promise<Blob>((resolve, reject) =>
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('The thumbnail could not be made.'))),
			'image/jpeg',
			0.86
		)
	);
}

// A plain dark thumbnail, for a video this device cannot draw a frame of (an iPhone's HEVC in some browsers): the
// play button and the length still show on it.
async function createPlainThumbnail() {
	const canvas = document.createElement('canvas');
	canvas.width = 1280;
	canvas.height = 720;
	const pen = canvas.getContext('2d');
	if (pen) {
		pen.fillStyle = '#1e293b';
		pen.fillRect(0, 0, canvas.width, canvas.height);
	}
	return toJpeg(canvas);
}

// A frame of the video drawn at the thumbnail's size; nothing when the device cannot draw it.
async function frameOf(video: HTMLVideoElement) {
	if (!video.videoWidth || !video.videoHeight) return undefined;
	const { width, height } = toThumbnailSize(video.videoWidth, video.videoHeight);
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const pen = canvas.getContext('2d');
	if (!pen) return undefined;
	pen.drawImage(video, 0, 0, width, height);
	// A frame that never decoded draws as nothing at all: see-through everywhere.
	const corner = pen.getImageData(0, 0, Math.min(16, width), Math.min(16, height)).data;
	const middle = pen.getImageData(Math.floor(width / 2), Math.floor(height / 2), 1, 1).data;
	if (corner[3] === 0 && middle[3] === 0) return undefined;
	return toJpeg(canvas);
}

/** A picked video, read before it goes (#327): how long it runs, and a thumbnail made from one of its frames. */
export async function readVideo(file: File): Promise<MadeType> {
	const url = URL.createObjectURL(file);
	const video = document.createElement('video');
	video.muted = true;
	video.playsInline = true;
	video.preload = 'auto';
	video.src = url;
	let duration = 0;
	let blob: Blob | undefined;
	try {
		await when(video, 'loadedmetadata');
		duration = Number.isFinite(video.duration) ? video.duration : 0;
		if (video.readyState < 2) {
			// An iPhone loads no frame of a video that never plays: a muted play starts it, paused again at once.
			const loaded = when(video, 'loadeddata');
			await video.play().catch(() => undefined);
			video.pause();
			await loaded;
		}
		const at = toThumbnailTime(duration);
		if (at > 0) {
			const seeked = when(video, 'seeked');
			video.currentTime = at;
			await seeked;
		}
		blob = await frameOf(video);
	} catch {
		// What the device could not read of it, the plain thumbnail stands in for.
	} finally {
		video.removeAttribute('src');
		video.load();
		URL.revokeObjectURL(url);
	}
	const picture = blob ?? (await createPlainThumbnail());
	const name = `${file.name.replace(/\.[^.]+$/, '')}.jpg`;
	return { picture: new File([picture], name, { type: 'image/jpeg' }), duration };
}
