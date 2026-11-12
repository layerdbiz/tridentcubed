// The mapper's photo panels (#189): a photo panel's groups and their photos as rows, and rows back into the panel.
// A group is a `photo_group` row of its panel and a photo a `photo` row of its group, each with its place in the
// list as `position`. A photo saves only once its file is in storage: while it uploads, or after its upload failed,
// it shows on this device and keeps its place, but nothing of it is sent (photos.ts holds its upload).
import type { RowType, SavedRowType } from '#lib/rows/rows.schema.js';
import type { GroupType, PanelType, PhotoType } from './look.data';
import { byPosition, text } from './mapper.utils';

/** Whether a photo's file is in storage yet: a photo on its way shows its own preview (a `blob:` address). */
export function isStored(photo: PhotoType) {
	return Boolean(photo.src) && !photo.src.startsWith('blob:');
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
				layout: group.layout
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
					description: photo.description
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
			layout: Number(group.values.layout ?? 4),
			photos: photos
				.filter((photo) => photo.values.groupId === group.id)
				.map((photo) => ({
					id: photo.id,
					src: text(photo.values, 'file'),
					description: text(photo.values, 'description')
				}))
		}));
}
