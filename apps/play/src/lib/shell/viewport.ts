// The shell's canvas, as numbers (#342, #361): frames lie on a surface that is panned by (x, y) and scaled by
// `scale`, so a point p on the surface shows at screen point (x + p * scale). Pinch, Ctrl+wheel and the zoom buttons
// all go through toZoom, which keeps the point under the fingers or pointer still.

export type ViewType = { scale: number; x: number; y: number };
export type SizeType = { width: number; height: number };
export type PinchStartType = { view: ViewType; x: number; y: number; distance: number };

export const ZOOM_LIMITS = { least: 0.05, most: 8 };

/** The view that shows all of `content` inside `stage`, `edge` pixels in from every side, never above real size. */
export function toFit(stage: SizeType, content: SizeType, edge: number): ViewType {
	const room = {
		width: Math.max(1, stage.width - edge * 2),
		height: Math.max(1, stage.height - edge * 2)
	};
	const scale = Math.min(
		1,
		room.width / Math.max(1, content.width),
		room.height / Math.max(1, content.height)
	);
	return {
		scale: round(scale),
		x: round((stage.width - content.width * scale) / 2),
		y: round((stage.height - content.height * scale) / 2)
	};
}

/** The view at scale `next`, with the surface point under screen point (px, py) still under it. */
export function toZoom(view: ViewType, next: number, px: number, py: number): ViewType {
	const scale = Math.min(ZOOM_LIMITS.most, Math.max(ZOOM_LIMITS.least, next));
	const surfaceX = (px - view.x) / view.scale;
	const surfaceY = (py - view.y) / view.scale;
	return { scale: round(scale), x: round(px - surfaceX * scale), y: round(py - surfaceY * scale) };
}

/** Two fingers that started at `start` and are now `distance` apart around (x, y). */
export function toPinch(start: PinchStartType, x: number, y: number, distance: number): ViewType {
	const scale = start.view.scale * (distance / Math.max(1, start.distance));
	const zoomed = toZoom(start.view, scale, start.x, start.y);
	return {
		scale: zoomed.scale,
		x: round(zoomed.x + x - start.x),
		y: round(zoomed.y + y - start.y)
	};
}

function round(value: number): number {
	return Math.round(value * 10000) / 10000;
}
