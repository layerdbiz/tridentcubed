// The mapper's photo panels (#189): a photo panel's groups and their photos as rows, and rows back into the panel.
// A group is a `photo_group` row of its panel and a photo a `photo` row of its group, each with its place in the
// list as `position`. A photo saves only once its file is in storage: while it uploads, or after its upload failed,
// it shows on this device and keeps its place, but nothing of it is sent (photos.ts holds its upload). #312: a photo's
// crop is kept on its row, and so moves with it to another group. #327: a PDF or a video is a `photo` row too, its
// picture in `file` and the PDF or video itself in `source`.
import type { CropType } from '#lib/components/photo/photo.types.js';
import { toPageLayout } from '#lib/report/report.utils.js';
import type { RowType, SavedRowType } from '#lib/rows/rows.schema.js';
import type { GroupType, PanelType, PhotoType } from './look.data';
import { byPosition, text } from './mapper.utils';

/**
 * Whether a photo's file is in storage yet: a photo on its way shows its own preview (a `blob:` address). A PDF or a
 * video is stored once its picture and the file itself both are (#327).
 */
export function isStored(photo: PhotoType) {
	const isPicture = Boolean(photo.src) && !photo.src.startsWith('blob:');
	return photo.kind ? isPicture && Boolean(photo.source) : isPicture;
}

// A crop as its row keeps it: in jsonb's own key order (x, y, zoom), so a row sent reads the same as the row the
// server gives back and nothing is sent twice; nothing for the whole photo.
function toSavedCrop(crop?: CropType) {
	return crop ? { x: crop.x, y: crop.y, zoom: crop.zoom } : null;
}

function cropOf(values: RowType['values']): CropType | undefined {
	const crop = values.crop as Record<string, unknown> | null | undefined;
	if (!crop) return undefined;
	const { zoom, x, y } = crop;
	return typeof zoom === 'number' && typeof x === 'number' && typeof y === 'number'
		? { zoom, x, y }
		: undefined;
}

// What a PDF or a video adds to a photo (#327): nothing for a photo, so a photo reads as it always has.
function attachmentOf(values: RowType['values']): Partial<PhotoType> {
	const kind = values.kind;
	if (kind === 'pdf') {
		return { kind, source: text(values, 'source'), pageCount: Number(values.pageCount ?? 0) };
	}
	if (kind === 'video') {
		return { kind, source: text(values, 'source'), duration: Number(values.duration ?? 0) };
	}
	return {};
}

/** A photo panel's groups and their stored photos as rows, in order. */
export function toPhotoRows(projectId: string, panel: PanelType): RowType[] {
	const rows: RowType[] = [];
	for (const [position, group] of panel.groups.entries()) {
		rows.push({
			table: 'photo_group',
			id: group.id,
			values: {
				projectId,
				panelId: panel.id,
				position,
				title: group.title,
				description: group.description,
				layout: group.layout,
				isEnabled: group.isEnabled
			}
		});
		for (const [index, photo] of group.photos.filter(isStored).entries())
			rows.push({
				table: 'photo',
				id: photo.id,
				values: {
					projectId,
					groupId: group.id,
					position: index,
					file: photo.src,
					description: photo.description,
					crop: toSavedCrop(photo.crop),
					kind: photo.kind ?? 'photo',
					source: photo.kind ? (photo.source ?? '') : '',
					pageCount: photo.kind === 'pdf' ? (photo.pageCount ?? 0) : 0,
					duration: photo.kind === 'video' ? (photo.duration ?? 0) : 0
				}
			});
	}
	return rows;
}

/** A photo panel's groups and photos, as a project's rows hold them, into the panel. */
export function takePhotos(panel: PanelType, rows: SavedRowType[]) {
	const photos = rows.filter((row) => row.table === 'photo').sort(byPosition);
	panel.groups = rows
		.filter((row) => row.table === 'photo_group' && row.values.panelId === panel.id)
		.sort(byPosition)
		.map((group): GroupType => ({
			id: group.id,
			title: text(group.values, 'title'),
			description: text(group.values, 'description'),
			layout: toPageLayout(group.values.layout),
			isEnabled: group.values.isEnabled !== false,
			photos: photos
				.filter((photo) => photo.values.groupId === group.id)
				.map((photo) => ({
					id: photo.id,
					src: text(photo.values, 'file'),
					description: text(photo.values, 'description'),
					crop: cropOf(photo.values),
					...attachmentOf(photo.values)
				}))
		}));
}
