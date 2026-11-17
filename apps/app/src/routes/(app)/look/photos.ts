// PROTOTYPE (#161) run 27: photo files dragged in from the desktop (Justin, 2026-11-12: "select a bunch of photos
// ... drag and drop onto a panel or a photo section, and they would all get uploaded"). Dropped on a group they join
// that group; dropped on the panel they join its last group, or a first group made for them. Anything that is not a
// picture is left out.
//
// #189: each photo, picked, taken or dropped, goes to private storage on its own through the upload helper
// (`startUpload`), which reads its time and place and shrinks it first. It shows in place at once (its `src` is its
// own preview, a `blob:` address) with an uploading mark (`uploadOf`); once its file is stored its `src` becomes the
// app's file address and the mapper saves it (mapper.photos.ts). One failed upload is marked on its photo and is
// retried by itself; the others carry on.
import { SvelteMap } from 'svelte/reactivity';
import { startUpload, type Upload, type UploadStepsType } from '#lib/files/files.state.svelte.js';
import type { GroupType, PanelType, PhotoType } from './look.data';

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
	panel.groups.push({
		id: crypto.randomUUID(),
		title: '',
		description: '',
		layout: 4,
		photos: []
	});
	return panel.groups.at(-1)!;
}

export type AddPhotosType = {
	/** The group they join; none is the panel's last group, or a first one made for them. */
	group?: GroupType;
	/** The project the panel is in, so a Sent project refuses the upload before it starts. */
	projectId: string;
	steps?: UploadStepsType;
};

/** Adds the pictures among `files` to a photo panel, each on its way to storage, and says how many there were. */
export function addPhotos(panel: PanelType, files: File[], options: AddPhotosType) {
	const images = files.filter((file) => file.type.startsWith('image/'));
	if (!images.length) return 0;
	const group = options.group ?? panel.groups.at(-1) ?? addGroup(panel);
	for (const file of images) {
		const id = crypto.randomUUID();
		group.photos.push({ id, src: '', description: '' });
		// The photo as the group holds it, so setting its address shows and saves.
		const photo = group.photos.at(-1)!;
		const upload = startUpload(file, {
			for: { table: 'photo', column: 'file', id, projectId: options.projectId },
			kind: 'photo',
			steps: options.steps,
			ondone: (address) => {
				photo.src = address;
				uploads.delete(id);
				if (upload.preview.startsWith('blob:') && typeof URL.revokeObjectURL === 'function')
					URL.revokeObjectURL(upload.preview);
			}
		});
		uploads.set(id, upload);
		photo.src = upload.preview;
	}
	return images.length;
}
