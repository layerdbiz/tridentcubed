// Where the new version window (#396) reads its list. The newest version's commit comes from the app's own server
// (routes/api/build), which always answers from the newest deployment. What changed between two commits comes from
// GitHub, asked by the browser itself so each person's own allowance covers it (60 asks an hour without a sign-in;
// the window asks once per new version). The commit titles carry the kind of each change (✨ feat, 🐛 fix), read
// the way a release reads them (releases.utils.ts).
import { isAppChange, toReleaseChanges } from '#lib/releases/releases.utils.js';
import { COMPARE_URL } from './changes.constants';

/** The part of GitHub's compare answer that is read. */
export type CompareType = { commits?: { commit: { message: string } }[] };

/** The new features and fixes people meet in the app, from GitHub's compare answer. */
export function toCompareChanges(answer: CompareType) {
	const commits = (answer.commits ?? []).map(({ commit }) => {
		const [subject = '', ...body] = commit.message.split('\n');
		return { subject, body: body.join('\n') };
	});
	return toReleaseChanges(commits).filter(isAppChange);
}

/** The commit the newest deployment was built from, or nothing when the server cannot be reached. */
export async function fetchNewest() {
	try {
		const answer = await fetch('/api/build', { cache: 'no-store' });
		if (!answer.ok) return undefined;
		const { commit } = (await answer.json()) as { commit?: string };
		return commit || undefined;
	} catch {
		return undefined;
	}
}

/** The new features and fixes after `base` up to `head`, or nothing when GitHub cannot answer. */
export async function fetchBetween(base: string, head: string) {
	try {
		const answer = await fetch(`${COMPARE_URL}/${base}...${head}`, {
			headers: { accept: 'application/vnd.github+json' }
		});
		if (!answer.ok) return undefined;
		return toCompareChanges((await answer.json()) as CompareType);
	} catch {
		return undefined;
	}
}
