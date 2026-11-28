// The branch's history for What's New (#399, #400), read from git when the app is built: every commit the branch took
// and when, the ones a merge brought counted as landing with the merge, and the release that first held each one
// (releases.server.ts). A build on Vercel or in CI starts from a shallow copy without tags, so the rest is fetched
// first; the repository is public, so no key is needed. Without git, or without a network, What's New is empty and
// says so; the build goes on. A release on dev shows in its highlights (highlights.ts), and next.app shows the
// release to come on top once its highlights are written. A build of dev that would make a release without its
// highlights stops instead (Justin, 2026-11-28): dev.app stays on the version before until they are written on next.
import { HIGHLIGHTS, type HighlightsType } from './highlights.ts';
import { HIDDEN_TICKETS, PLAIN } from './notes.ts';
import {
	SHORT,
	isMissingHighlights,
	toHistory,
	type HistoryType,
	type LandedType
} from './history.utils.ts';
import { FIELD, RECORD, git, readReleaseState, readyRepository } from './releases.server.ts';
import { isPrerelease, toPrereleaseVersion, toTag } from './releases.utils.ts';

/** A release on dev about to be made without its highlights: the build stops on it. */
export class MissingHighlightsError extends Error {}

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

/**
 * The history of `head` with its releases, from a copy that is already whole. It stops on a release being made
 * without its highlights.
 */
export function readHistoryOf(
	head = 'HEAD',
	highlights: Record<string, HighlightsType> = HIGHLIGHTS
): HistoryType {
	const { head: commit, chain, landed } = readLanded(head);
	const state = readReleaseState(commit);
	if (state.isNew && state.version && isMissingHighlights(state.version, highlights)) {
		throw new MissingHighlightsError(
			`${toTag(state.version)} has no highlights: write them in apps/app/src/lib/releases/highlights.ts on next, then move next to dev again (apps/app/AGENTS.md, "Releases and What's New").`
		);
	}
	// On next, the release its versions lead to: v1.2.0-next.19 leads to 1.2.0.
	const upcoming =
		state.version && isPrerelease(state.version)
			? toPrereleaseVersion(toTag(state.version))?.base
			: undefined;
	const released = landed.map((each) => {
		const release = each.commit ? state.versionOf(each.commit) : undefined;
		return release ? { ...each, release } : each;
	});
	return toHistory(commit, chain, released, {
		plain: PLAIN,
		hidden: HIDDEN_TICKETS,
		releases: state.releases,
		version: state.label,
		highlights,
		upcoming
	});
}

/** What's New's history for the build: empty when git cannot tell it. */
export function readHistory(): HistoryType {
	try {
		readyRepository();
		return readHistoryOf();
	} catch (error) {
		if (error instanceof MissingHighlightsError) throw error;
		console.warn(`What's New: the branch's history could not be read (${String(error)})`);
		return { head: '', chain: [], batches: [] };
	}
}
