// PROTOTYPE (#161) run 27: photo files dragged in from the desktop (Justin, 2026-11-12: "select a bunch of photos
// ... drag and drop onto a panel or a photo section, and they would all get uploaded"). Dropped on a group they join
// that group; dropped on the panel they join its last group, or a first group made for them. Each is shrunk as an
// upload is (image.ts). Anything that is not a picture is left out.
import { shrink } from './image';
import { createId, type GroupType, type PanelType } from './look.data';

// Whether what is being dragged over is files, not a photo being reordered or a piece of text.
export function hasFiles(event: DragEvent) {
	return [...(event.dataTransfer?.types ?? [])].includes('Files');
}

export async function addPhotos(panel: PanelType, files: File[], group?: GroupType) {
	const images = files.filter((file) => file.type.startsWith('image/'));
	if (!images.length) return 0;
	if (!group && !panel.groups.length)
		panel.groups.push({ id: createId('group'), title: '', description: '', layout: 4, photos: [] });
	const target = group ?? panel.groups.at(-1)!;
	for (const file of images)
		target.photos.push({ id: createId('photo'), src: await shrink(file), description: '' });
	return images.length;
}
