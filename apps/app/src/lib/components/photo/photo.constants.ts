import type { CropType } from './photo.types';

/** The furthest a photo zooms in: five times. */
export const MOST_ZOOM = 5;
/** The whole photo filling its box. */
export const WHOLE: CropType = { zoom: 1, x: 0.5, y: 0.5 };
/** The smallest the crop frame may be pulled in to, in pixels. */
export const LEAST_FRAME = 64;
/** Every grip of the crop frame: its four corners, then its four edges. */
export const GRIPS = ['tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r'] as const;
