// The branch's history for What's New (#399), read from git when the app is built: every commit the branch took and
// when, the ones a merge brought counted as landing with the merge. A build on Vercel or in CI starts from a shallow
// copy, so the rest of the history is fetched first; the repository is public, so no key is needed. Without git, or
// without a network, What's New is empty and says so; the build goes on.
import { execFileSync } from 'node:child_process';
import { NOTES } from './notes.ts';
import { SHORT, toHistory, type HistoryType, type LandedType } from './history.utils.ts';

const REPOSITORY = 'https://github.com/layerdbiz/tridentcubed.git';
const UNIT = '\u001f';
const RECORD = '\u001e';

function git(...args: string[]) {
	return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
}

function read(range: string, ...options: string[]) {
	const out = git('log', ...options, `--format=%H${UNIT}%P${UNIT}%cI${UNIT}%s${RECORD}`, range);
	return out
		.split(RECORD)
		.map((record) => record.trim())
		.filter(Boolean)
		.map((record) => {
			const [commit, parents, at, subject] = record.split(UNIT);
			return { commit, parents: parents.split(' ').filter(Boolean), at, subject };
		});
}

function deepen(head: string) {
	if (git('rev-parse', '--is-shallow-repository') !== 'true') return;
	git('fetch', '--quiet', '--unshallow', '--no-tags', REPOSITORY, head);
}

/** The branch's commits, each with when it landed, oldest first. */
export function readLanded(head = 'HEAD'): { head: string; chain: string[]; landed: LandedType[] } {
	const commit = git('rev-parse', head);
	deepen(commit);
	const branch = read(commit, '--first-parent', '--reverse');
	const landed: LandedType[] = [];
	for (const [index, own] of branch.entries()) {
		const [first, second] = own.parents;
		if (!second) {
			landed.push({ subject: own.subject, at: own.at, landed: index });
			continue;
		}
		for (const brought of read(`${first}..${second}`, '--no-merges', '--reverse')) {
			landed.push({ subject: brought.subject, at: own.at, landed: index });
		}
	}
	return { head: commit, chain: branch.map((own) => own.commit.slice(0, SHORT)), landed };
}

/** What's New's history for the build: empty when git cannot tell it. */
export function readHistory(): HistoryType {
	try {
		const { head, chain, landed } = readLanded();
		return toHistory(head, chain, landed, NOTES);
	} catch (error) {
		console.warn(`What's New: the branch's history could not be read (${String(error)})`);
		return { head: '', chain: [], batches: [] };
	}
}
