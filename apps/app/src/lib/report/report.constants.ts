// How many share one report page (run 9 note 17): a photo group's photos, or the pages of a PDF attached to the Items
// panel (#295), 1, 2, 4, 6 or 8, four unless someone picks another. The row registry checks it, the database
// defaults to it, the mapper reads it and the Edit tab's buttons offer it, all from here.

/** The layouts a report page takes: how many photos, or PDF pages, share it. */
export const LAYOUTS = [1, 2, 4, 6, 8] as const;

export type PageLayoutType = (typeof LAYOUTS)[number];

/** A new photo group's, a new Items PDF's, and the database's when a row has none. */
export const DEFAULT_LAYOUT: PageLayoutType = 4;

/** #295: the shapes a stage's spots keep under Fit; free is each attachment's own. A new stage's is 4:3. */
export const RATIOS = ['free', '16:9', '9:16', '1:1', '4:3'] as const;

export type RatioType = (typeof RATIOS)[number];

export const DEFAULT_RATIO: RatioType = '4:3';

/** #295: fill, a stage's spots fill the page; fit, they keep its ratio and each picture shows whole. */
export const FITS = ['fill', 'fit'] as const;

export type FitType = (typeof FITS)[number];

export const DEFAULT_FIT: FitType = 'fill';

/**
 * #295 (Justin, 2026-11-28): which way a stage's spots run on its pages: horizontal, across then down, its per page
 * laid wider than tall; vertical, down then across, laid taller than wide; auto, each page whichever way crops its
 * pictures the least (under Fit, shows them biggest). A new stage's, and every stage's until one is picked, is auto.
 */
export const DIRECTIONS = ['horizontal', 'vertical', 'auto'] as const;

export type DirectionType = (typeof DIRECTIONS)[number];

export const DEFAULT_DIRECTION: DirectionType = 'auto';

/** #295: the shapes the crop frame takes: a stage's ratios, and the picture's own (original). */
export const CROP_RATIOS = ['free', 'original', '16:9', '9:16', '1:1', '4:3'] as const;

export type CropRatioType = (typeof CROP_RATIOS)[number];
