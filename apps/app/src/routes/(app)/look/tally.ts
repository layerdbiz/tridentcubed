// How much of a section is filled in, said the way a panel says it: "2 of 7 complete" (Justin, 2026-11-16: every
// section that opens and closes shows this under its name, in place of a line describing it). A section hands over
// the values that count; one counts as done when it holds something: words, a pick, a list with something in it, or
// a plain yes.

export type TallyType = { done: number; total: number };

function isDone(value: unknown) {
	if (typeof value === 'string') return value.trim().length > 0;
	if (Array.isArray(value)) return value.length > 0;
	return Boolean(value);
}

export function tallyOf(values: unknown[]): TallyType {
	return { done: values.filter(isDone).length, total: values.length };
}

/** "2 of 7 complete". A section with nothing in it yet has one thing to do, as a panel with no rows does. */
export function toTally(values: unknown[]) {
	const { done, total } = tallyOf(values);
	return `${done} of ${Math.max(1, total)} complete`;
}
