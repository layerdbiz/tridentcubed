export function normalizeTotal(value: unknown): number {
	const total = Math.floor(Number(value));
	if (!Number.isFinite(total) || total < 1) return 1;
	return total;
}

export function createTotalIndexes(value: unknown): number[] {
	return Array.from({ length: normalizeTotal(value) }, (_, index) => index);
}
