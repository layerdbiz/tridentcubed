export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function toPercent(value: number, total: number): number {
	return total ? Math.round((value / total) * 100) : 0;
}
