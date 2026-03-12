import { browser } from "$app/environment";
import type {
	PhotoItem,
	PhotoOrientation,
	PhotosSection,
	Section,
} from "../types";
import { nextId } from "./id";

export function getPhotoOrientation(photo: PhotoItem): PhotoOrientation {
	if (!photo.width || !photo.height) return "square";
	if (photo.width / photo.height >= 1.1) return "landscape";
	if (photo.height / photo.width >= 1.1) return "portrait";
	return "square";
}

export function getPreviewPhotoGridClass(section: PhotosSection): string {
	if (section.photos.length <= 1) return "grid gap-3";
	return "grid grid-cols-2 gap-3";
}

export function getPreviewPhotoCardClass(
	_section: PhotosSection,
	_photo: PhotoItem,
): string {
	return "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white";
}

export function getPreviewPhotoFrameHeight(
	section: PhotosSection,
	photo: PhotoItem,
): string {
	const orientation = getPhotoOrientation(photo);

	if (section.photos.length === 1) {
		return orientation === "portrait" ? "5.6in" : "4.7in";
	}

	if (section.photos.length === 2) {
		return orientation === "portrait" ? "3.55in" : "2.45in";
	}

	return orientation === "portrait" ? "2.7in" : "1.9in";
}

export function fileToDataUrl(file: File): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result || ""));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

export function loadImageDimensions(
	src: string,
): Promise<{ width: number; height: number }> {
	return new Promise<{ width: number; height: number }>((resolve) => {
		if (!browser || !src) {
			resolve({ width: 0, height: 0 });
			return;
		}

		const image = new Image();
		image.onload = () =>
			resolve({
				width: image.naturalWidth || 0,
				height: image.naturalHeight || 0,
			});
		image.onerror = () => resolve({ width: 0, height: 0 });
		image.src = src;
	});
}

export async function createPhotoItem(file: File): Promise<PhotoItem> {
	const src = await fileToDataUrl(file);
	const { width, height } = await loadImageDimensions(src);

	return {
		id: nextId("photo"),
		name: file.name || "Photo",
		caption: file.name ? file.name.replace(/\.[^.]+$/, "") : "Photo",
		src,
		width,
		height,
	};
}

export async function hydratePhotoDimensions(
	items: Section[],
): Promise<boolean> {
	let changed = false;

	for (const section of items) {
		for (const photo of section.photos) {
			if (photo.width > 0 && photo.height > 0) continue;

			const { width, height } = await loadImageDimensions(photo.src);
			if (!width || !height) continue;

			photo.width = width;
			photo.height = height;
			changed = true;
		}
	}

	return changed;
}
