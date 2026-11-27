// A photo's crop (#312, glossary "Crop"): how it is framed in its spot in the report, zoomed in on part of it,
// always in the photo's own shape. The photo's file never changes. Since #295 a photo is edited as edit.ts keeps it,
// and a crop from before is read as its frame (routes/(app)/look/attachments.ts `fromOldCrop`).

/**
 * How a photo sits in its box. `zoom` is 1 (the box filled, as `object-fit: cover`) up to `MOST_ZOOM`; `x` and `y`
 * are the point of the photo, from 0 to 1, drawn at the box's centre. The crop is kept as these three numbers, so it
 * holds for a box of any size.
 */
export type CropType = { zoom: number; x: number; y: number };
export type SizeType = { width: number; height: number };
