// PROTOTYPE (#161) run 27: photo files dragged in from the desktop (Justin, 2026-11-12: "select a bunch of photos
// ... drag and drop onto a panel or a photo section, and they would all get uploaded"). Dropped on a group they join
// that group; dropped on the panel they join its last group, or a first group made for them. Anything that is not a
// picture is left out; a picture the browser hands over with no type (a HEIC on Windows) is known by its name (#294).
//
// #189: each photo, picked, taken or dropped, goes to private storage on its own through the upload helper
// (`startUpload`), which reads its time and place and shrinks it first. It shows in place at once (its `src` is its
// own preview, a `blob:` address) with an uploading mark (`uploadOf`); once its file is stored its `src` becomes the
// app's file address and the mapper saves it (mapper.photos.ts). One failed upload is marked on its photo and is
// retried by itself; the others carry on. #293: photos picked or dropped together share one toast that counts them.
//
// #327: a PDF or a video goes where a photo does, and is one too in the group's list (glossary "Attachment"): its
// picture (the PDF's first page, the video's thumbnail) is made on the device, and both it and the file itself go to
// storage before the mapper saves it.
import type { Progress } from '@layerd/ui';
import { SvelteMap } from 'svelte/reactivity';
import {
	ATTACHMENT_NOUNS,
	type AttachmentKindType,
	toAttachmentKind,
	toAttachmentType,
	toTyped
} from '#lib/files/files.schema.js';
import {
	type AttachmentUpload,
	type MadeType,
	startAttachment,
	startUpload,
	type Upload,
	UploadBatch,
	type UploadOptionsType,
	type UploadStepsType
} from '#lib/files/files.state.svelte.js';
import { readPdf } from '#lib/pdf/pdf.utils.js';
import { readVideo } from '#lib/video/video.utils.js';
import { groupOf, type GroupType, type PanelType, type PhotoType } from './look.data';

// The photos on their way, or whose upload failed, by photo id. A photo whose file is stored has none.
const uploads = new SvelteMap<string, Upload | AttachmentUpload>();

/** What a photo group's file picker takes (#327): pictures, PDFs and videos. */
export const ATTACHMENT_ACCEPT = 'image/*,application/pdf,.pdf,video/*,.mov,.mp4,.m4v,.webm';

/** What reads a PDF or a video on the device before it goes; a test hands in its own. */
export type ReadersType = {
	pdf: (file: File) => Promise<MadeType>;
	video: (file: File) => Promise<MadeType>;
};

const BROWSER_READERS: ReadersType = { pdf: readPdf, video: readVideo };

/** The upload of a photo still on its way or that failed: its mark and its Retry. */
export function uploadOf(photo: PhotoType) {
	return uploads.get(photo.id);
}

// Whether what is being dragged over is files, not a photo being reordered or a piece of text.
export function hasFiles(event: DragEvent) {
	return [...(event.dataTransfer?.types ?? [])].includes('Files');
}

/**
 * What a photo group holds, in words (#327): "3 photos", or with PDFs and videos among them "3 photos, 1 PDF, 2
 * videos". An empty group holds "0 photos".
 */
export function countLabelOf(photos: ReadonlyArray<Pick<PhotoType, 'kind'>>) {
	const counts: Record<AttachmentKindType, number> = { photo: 0, pdf: 0, video: 0 };
	for (const photo of photos) counts[photo.kind ?? 'photo'] += 1;
	const parts = Object.entries(counts)
		.filter(([kind, count]) => count || (kind === 'photo' && !photos.length))
		.map(([kind, count]) => {
			const noun = ATTACHMENT_NOUNS[kind as AttachmentKindType];
			return `${count} ${noun}${count === 1 ? '' : 's'}`;
		});
	return parts.join(', ');
}

/** How many of each kind a list of picked or dropped files holds, as a sentence says it: "2 photos, 1 PDF". */
export function filesLabelOf(files: readonly File[]) {
	const kinds = files.map((file) => toAttachmentKind(file)).filter((kind) => kind !== '');
	return countLabelOf(kinds.map((kind) => ({ kind: kind === 'photo' ? undefined : kind })));
}

/** A new, empty group at the end of a photo panel: the one in the panel's list, so changes to it show. */
export function addGroup(panel: PanelType): GroupType {
	panel.groups.push(groupOf());
	return panel.groups.at(-1)!;
}

/**
 * Moves a photo out of one photo group into another (Justin, 2026-11-21), in the same panel or in another of the
 * project's photo panels: to the place `to` there, or to its end. Says whether it moved: a drop on its own group,
 * or from a place that holds no photo, moves nothing. A photo still on its way to storage moves like any other;
 * its upload finishes where it now is.
 */
export function movePhoto(
	panels: PanelType[],
	fromId: string,
	from: number,
	toId: string,
	to?: number
) {
	const groups = panels.flatMap((panel) => panel.groups ?? []);
	const source = groups.find((group) => group.id === fromId);
	const target = groups.find((group) => group.id === toId);
	if (!source || !target || source === target || !source.photos[from]) return false;
	const [photo] = source.photos.splice(from, 1);
	const place = Math.min(Math.max(to ?? target.photos.length, 0), target.photos.length);
	target.photos.splice(place, 0, photo);
	return true;
}

// #402: photos selected together (Justin on #287, 2026-11-24). Every photo group of the project's photo panels, and
// the photos with these ids in the order they sit there: stage by stage, left to right.
function groupsOf(panels: PanelType[]) {
	return panels.flatMap((panel) => panel.groups ?? []);
}

function photosOf(panels: PanelType[], ids: readonly string[]) {
	return groupsOf(panels).flatMap((group) =>
		group.photos.filter((photo) => ids.includes(photo.id))
	);
}

/**
 * Moves the photos with these ids, from any groups, into one group (#402): in the order they sit, before the photo at
 * place `to` there (counted as the group is now, so it may be one of them), or at its end. Says how many moved;
 * none when no group has that id.
 */
export function movePhotos(panels: PanelType[], ids: readonly string[], toId: string, to?: number) {
	const target = groupsOf(panels).find((group) => group.id === toId);
	if (!target) return 0;
	const moving = photosOf(panels, ids);
	const place =
		to === undefined
			? undefined
			: target.photos.slice(0, Math.max(to, 0)).filter((photo) => !ids.includes(photo.id)).length;
	for (const group of groupsOf(panels)) takeOut(group, ids);
	target.photos.splice(place ?? target.photos.length, 0, ...moving);
	return moving.length;
}

/** Deletes the photos with these ids from their groups (#402), and says how many went. */
export function deletePhotos(panels: PanelType[], ids: readonly string[]) {
	let count = 0;
	for (const group of groupsOf(panels)) count += takeOut(group, ids);
	return count;
}

/** Gives the photos with these ids one description for all (#402), and says how many took it. */
export function describePhotos(panels: PanelType[], ids: readonly string[], description: string) {
	const photos = photosOf(panels, ids);
	for (const photo of photos) photo.description = description.trim();
	return photos.length;
}

function takeOut(group: GroupType, ids: readonly string[]) {
	let count = 0;
	for (let at = group.photos.length - 1; at >= 0; at -= 1) {
		if (!ids.includes(group.photos[at].id)) continue;
		group.photos.splice(at, 1);
		count += 1;
	}
	return count;
}

export type AddPhotosType = {
	/** The group they join; none is the panel's last group, or a first one made for them. */
	group?: GroupType;
	/** The project the panel is in, so a Sent project refuses the upload before it starts. */
	projectId: string;
	/** Makes the toast the photos share (toasts.svelte.ts); without it each shows only its own mark. */
	toast?: () => Progress;
	steps?: UploadStepsType;
	readers?: ReadersType;
};

/**
 * Adds the pictures, PDFs and videos among `files` to a photo panel, each on its way to storage, and says how many
 * there were. Anything else is left out.
 */
export function addPhotos(panel: PanelType, files: File[], options: AddPhotosType) {
	const taken = files.filter((file) => toAttachmentKind(file));
	if (!taken.length) return 0;
	const group = options.group ?? panel.groups.at(-1) ?? addGroup(panel);
	const batch = options.toast && new UploadBatch(options.toast());
	// A photo deleted from the panel on its way no longer counts in the toast (moved to another panel's group, it
	// keeps only its own mark).
	function isThere(id: string) {
		return () => panel.groups.some((each) => each.photos.some((one) => one.id === id));
	}
	for (const file of taken) {
		const kind = toAttachmentKind(file);
		if (kind === 'pdf' || kind === 'video') {
			addAttachment(group, file, kind, { ...options, batch, isThere });
			continue;
		}
		const id = crypto.randomUUID();
		group.photos.push({ id, src: '', description: '' });
		// The photo as the group holds it, so setting its address shows and saves.
		const photo = group.photos.at(-1)!;
		const settings: UploadOptionsType = {
			for: { table: 'photo', column: 'file', id, projectId: options.projectId },
			kind: 'photo',
			steps: options.steps,
			ondone: (address) => {
				photo.src = address;
				uploads.delete(id);
				if (upload.preview.startsWith('blob:') && typeof URL.revokeObjectURL === 'function')
					URL.revokeObjectURL(upload.preview);
			}
		};
		const upload = batch ? batch.add(file, settings, isThere(id)) : startUpload(file, settings);
		uploads.set(id, upload);
		photo.src = upload.preview;
	}
	return taken.length;
}

// A PDF or a video into a group (#327): in its place at once, its picture showing once the device has made it, and
// saved once its picture and the file are both stored.
function addAttachment(
	group: GroupType,
	file: File,
	kind: 'pdf' | 'video',
	options: AddPhotosType & {
		batch?: UploadBatch;
		isThere: (id: string) => () => boolean;
	}
) {
	const id = crypto.randomUUID();
	group.photos.push({ id, src: '', description: '', kind, source: '' });
	const photo = group.photos.at(-1)!;
	const readers = options.readers ?? BROWSER_READERS;
	const settings = {
		for: { table: 'photo' as const, id, projectId: options.projectId },
		noun: ATTACHMENT_NOUNS[kind],
		make: async (picked: File) => {
			const made = await readers[kind](picked);
			// Its picture shows in its tile as soon as it is made, before anything is stored.
			if (!photo.src && typeof URL.createObjectURL === 'function') {
				photo.src = URL.createObjectURL(made.picture);
			}
			if (kind === 'pdf') photo.pageCount = made.pageCount;
			else photo.duration = made.duration;
			return made;
		},
		steps: options.steps,
		ondone: (done: { picture: string; source: string; pageCount?: number; duration?: number }) => {
			const shown = photo.src;
			photo.src = done.picture;
			photo.source = done.source;
			if (kind === 'pdf') photo.pageCount = done.pageCount ?? 0;
			else photo.duration = done.duration ?? 0;
			uploads.delete(id);
			if (shown.startsWith('blob:') && typeof URL.revokeObjectURL === 'function')
				URL.revokeObjectURL(shown);
		}
	};
	// Sent with the type the server keeps it as, whatever the browser called it (a .mov with none).
	const typed = new File([toTyped(file, toAttachmentType(file))], file.name, {
		type: toAttachmentType(file)
	});
	const upload = options.batch
		? options.batch.addAttachment(typed, settings, options.isThere(id))
		: startAttachment(typed, settings);
	uploads.set(id, upload);
}
