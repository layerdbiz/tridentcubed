// What the signed-in person has seen (#403; Justin, 2026-11-27, picked on the prototype). A line of the bell's
// Notifications stays light blue, and counts on the bell, until its person taps it: then it is seen, on every device.
// Lines older than `NEW_DAYS` count as seen, so a first look at the bell is not a week's backlog and the marks can go.
// The Activity Log shows in light blue what others did since its person last opened it (the line `log`), kept for that
// visit, and nothing on the first.
import type { LookState } from './look.state.svelte';

/** One mark: its own id, what was seen (a Notifications line's id, or `log`), and when. */
export type SeenType = { id: string; line: string; at: string };

/** The mark of the Activity Log's last opening. */
export const LOG_LINE = 'log';

/** How many days a Notifications line stays new while nobody taps it. */
export const NEW_DAYS = 7;

const DAY = 86_400_000;

type LineType = { id: string; at: string };

/** The ids of `lines` not seen yet: newer than `NEW_DAYS` days and never tapped. */
export function unseenOf(look: LookState, lines: LineType[], now = Date.now()) {
	const seen = new Set(look.seen.map((each) => each.line));
	return new Set(
		lines
			.filter((line) => !seen.has(line.id) && now - Date.parse(line.at) < NEW_DAYS * DAY)
			.map((line) => line.id)
	);
}

/**
 * Marks `lines` seen at `at`, those not seen already. Marks older than `NEW_DAYS` go: what they marked counts as seen
 * by its age now.
 */
export function markSeen(look: LookState, lines: string[], at = new Date()) {
	const seen = new Set(look.seen.map((each) => each.line));
	const fresh = [...new Set(lines)].filter((line) => !seen.has(line));
	const kept = look.seen.filter(
		(each) => each.line === LOG_LINE || at.getTime() - Date.parse(each.at) < NEW_DAYS * DAY
	);
	if (!fresh.length && kept.length === look.seen.length) return;
	look.seen = [
		...kept,
		...fresh.map((line) => ({ id: crypto.randomUUID(), line, at: at.toISOString() }))
	];
}

// The Activity Log's mark, the newest when two devices made one at once.
function logMark(look: LookState) {
	return look.seen
		.filter((each) => each.line === LOG_LINE)
		.toSorted((a, b) => b.at.localeCompare(a.at))[0];
}

/** When the person last opened the Activity Log; nothing before their first time. */
export function logSeenAt(look: LookState) {
	return logMark(look)?.at;
}

/** Keeps that the Activity Log was opened at `at`: its one mark, moved on. */
export function markLogSeen(look: LookState, at = new Date()) {
	const mark = logMark(look);
	const time = at.toISOString();
	look.seen = mark
		? look.seen.map((each) => (each === mark ? { ...each, at: time } : each))
		: [...look.seen, { id: crypto.randomUUID(), line: LOG_LINE, at: time }];
}
