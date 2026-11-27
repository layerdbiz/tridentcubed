// The branch's history for What's New (#399, #400), read from git when the app is built: every commit the branch took
// and when, the ones a merge brought counted as landing with the merge, and the release that first held each one
// (releases.server.ts). A build on Vercel or in CI starts from a shallow copy without tags, so the rest is fetched
// first; the repository is public, so no key is needed. Without git, or without a network, What's New is empty and
// says so; the build goes on.
import { HIDDEN_TICKETS, PLAIN } from './notes.ts';
import { SHORT, toHistory, type HistoryType, type LandedType } from './history.utils.ts';
import { FIELD, RECORD, git, readReleaseState, readyRepository } from './releases.server.ts';

function read(range: string, ...options: string[]) {
	const out = git(
		'log',
		...options,
		`--format=%H${FIELD}%P${FIELD}%cI${FIELD}%s${FIELD}%b${RECORD}`,
		range
	);
	return out
		.split(RECORD)
		.map((record) => record.trim())
		.filter(Boolean)
		.map((record) => {
			const [commit, parents, at, subject, body] = record.split(FIELD);
			return { commit, parents: parents.split(' ').filter(Boolean), at, subject, body };
		});
}

/** The branch's commits, each with when it landed, oldest first. */
export function readLanded(head = 'HEAD'): { head: string; chain: string[]; landed: LandedType[] } {
	const commit = git('rev-parse', head);
	const branch = read(commit, '--first-parent', '--reverse');
	const landed: LandedType[] = [];
	for (const [index, own] of branch.entries()) {
		const [first, second] = own.parents;
		if (!second) {
			landed.push({
				subject: own.subject,
				body: own.body,
				at: own.at,
				landed: index,
				commit: own.commit
			});
			continue;
		}
		for (const brought of read(`${first}..${second}`, '--no-merges', '--reverse')) {
			landed.push({
				subject: brought.subject,
				body: brought.body,
				at: own.at,
				landed: index,
				commit: brought.commit
			});
		}
	}
	return { head: commit, chain: branch.map((own) => own.commit.slice(0, SHORT)), landed };
}

/** The history of `head` with its releases, from a copy that is already whole. */
export function readHistoryOf(head = 'HEAD'): HistoryType {
	const { head: commit, chain, landed } = readLanded(head);
	const state = readReleaseState(commit);
	const released = landed.map((each) => {
		const release = each.commit ? state.versionOf(each.commit) : undefined;
		return release ? { ...each, release } : each;
	});
	return toHistory(commit, chain, released, {
		plain: PLAIN,
		hidden: HIDDEN_TICKETS,
		releases: state.releases,
		version: state.label
	});
}

/** What's New's history for the build: empty when git cannot tell it. */
export function readHistory(): HistoryType {
	try {
		readyRepository();
		return readHistoryOf();
	} catch (error) {
		console.warn(`What's New: the branch's history could not be read (${String(error)})`);
		return { head: '', chain: [], batches: [] };
	}
}
