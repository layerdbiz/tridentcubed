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
import type { Progress } from '@layerd/ui';
import { SvelteMap } from 'svelte/reactivity';
import { toPictureType } from '#lib/files/files.schema.js';
import {
	startUpload,
	type Upload,
	UploadBatch,
	type UploadOptionsType,
	type UploadStepsType
} from '#lib/files/files.state.svelte.js';
import { groupOf, type GroupType, type PanelType, type PhotoType } from './look.data';

// The photos on their way, or whose upload failed, by photo id. A photo whose file is stored has none.
const uploads = new SvelteMap<string, Upload>();

/** The upload of a photo still on its way or that failed: its mark and its Retry. */
export function uploadOf(photo: PhotoType) {
	return uploads.get(photo.id);
}

// Whether what is being dragged over is files, not a photo being reordered or a piece of text.
export function hasFiles(event: DragEvent) {
	return [...(event.dataTransfer?.types ?? [])].includes('Files');
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

export type AddPhotosType = {
	/** The group they join; none is the panel's last group, or a first one made for them. */
	group?: GroupType;
	/** The project the panel is in, so a Sent project refuses the upload before it starts. */
	projectId: string;
	/** Makes the toast the photos share (toasts.svelte.ts); without it each shows only its own mark. */
	toast?: () => Progress;
	steps?: UploadStepsType;
};

/** Adds the pictures among `files` to a photo panel, each on its way to storage, and says how many there were. */
export function addPhotos(panel: PanelType, files: File[], options: AddPhotosType) {
	const images = files.filter((file) => toPictureType(file).startsWith('image/'));
	if (!images.length) return 0;
	const group = options.group ?? panel.groups.at(-1) ?? addGroup(panel);
	const batch = options.toast && new UploadBatch(options.toast());
	for (const file of images) {
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
		// A photo deleted from the panel on its way no longer counts in the toast (moved to another panel's group, it
		// keeps only its own mark).
		const isThere = () => panel.groups.some((each) => each.photos.some((one) => one.id === id));
		const upload = batch ? batch.add(file, settings, isThere) : startUpload(file, settings);
		uploads.set(id, upload);
		photo.src = upload.preview;
	}
	return images.length;
}
