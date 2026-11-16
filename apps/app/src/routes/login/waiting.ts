// The email a sign-in code was just sent to, kept for this tab (session storage) while the code still works. A phone
// reloads a page it comes back to, and a User leaves the page to read their code, so without this the page forgot it
// was waiting for one and asked for the email again (Justin, 2026-11-16).

export type WaitingType = { email: string; at: number };

/** What to keep: the email and when its code was sent. */
export function toWaiting(email: string, now = Date.now()) {
	return JSON.stringify({ email, at: now } satisfies WaitingType);
}

/** The email still waiting for its code, or nothing: what was kept is missing, broken or older than the code lasts. */
export function readWaiting(kept: string | null, minutes: number, now = Date.now()) {
	if (!kept) return '';
	try {
		const { email, at } = JSON.parse(kept) as Partial<WaitingType>;
		if (typeof email !== 'string' || typeof at !== 'number') return '';
		return now >= at && now - at < minutes * 60_000 ? email : '';
	} catch {
		return '';
	}
}
