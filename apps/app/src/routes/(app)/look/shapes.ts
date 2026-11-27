// #295: the shapes a stage's attachments have, read from the pictures themselves (lib/components/photo/shape.svelte.ts)
// and from a PDF's pages (lib/pdf): what a stage laid out Free or Fit gives each its spot by, and what the editor's
// frame keeps to. Until a picture is read it is taken as 4:3, and a PDF's page as A4 upright.
import { shapeOf } from '#lib/components/photo/shape.svelte.js';
import { pageShapeOf } from '#lib/pdf/pdf.state.svelte.js';
import {
	croppedAspect,
	editOf,
	frameOf,
	lockedAspectOf,
	type SpotType,
	type StageLayoutType
} from './attachments';
import type { PhotoType } from './look.data';

const PHOTO = 4 / 3;
const PAGE = 595 / 842;

/** A picture's own width over its height: a photo's or a video's picture, or a PDF's page (`page`, from 1). */
export function pictureAspectOf(photo: PhotoType, page = 1) {
	if (photo.kind === 'pdf') {
		const shape =
			(photo.source ? pageShapeOf(photo.source, page) : undefined) ??
			(page === 1 ? shapeOf(photo.src) : undefined);
		return shape ? shape.width / shape.height : PAGE;
	}
	const shape = shapeOf(photo.src);
	return shape ? shape.width / shape.height : PHOTO;
}

/** How a spot of a stage is drawn: its edit, its picture's own shape, the shape its frame keeps and the frame. */
export function drawnOf(stage: StageLayoutType, photo: PhotoType, page = 1) {
	const edit = editOf(photo, page);
	const aspect = pictureAspectOf(photo, page);
	const locked = lockedAspectOf(stage, photo, edit, aspect);
	return { edit, aspect, locked, frame: frameOf(edit, aspect, locked) };
}

/** A spot's own shape once cropped, its width over its height: what Free and Fit lay it out by. */
export function spotAspectOf(stage: StageLayoutType, spot: SpotType<PhotoType>) {
	const { edit, aspect, locked } = drawnOf(stage, spot.photo, spot.page);
	return croppedAspect(edit, aspect, locked);
}
