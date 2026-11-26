// The releases as git knows them (#157, #400): the `v*` tags, which commits each one first held, the newest one a
// build holds, and the release the build's newer commits make. A tag is the whole record of a release (the GitHub
// release carries its notes), so a build reads it from git: Vercel's copy has no tags and a short history, so
// `readyRepository` fetches both from the public repository first; no key is needed.
//
// What it works out goes through the plain rule in releases.utils.ts, so the release workflow (scripts/release.ts)
// and every build agree on the version without asking each other: a build on dev in the minute before its tag
// exists already says the version the workflow is about to give it.
import { execFileSync } from 'node:child_process';
import {
	IS_RELEASING,
	RELEASE_BRANCHES,
	isNewer,
	planRelease,
	toReleaseUrl,
	toTagVersion,
	toVersionLabel,
	type CommitType,
	type ReleaseRefType,
	type ReleaseType
} from './releases.utils.ts';

const REPOSITORY = 'https://github.com/layerdbiz/tridentcubed.git';
// Between fields and between commits, characters no commit title or body holds.
const FIELD = '\u001f';
const RECORD = '\u001e';

export function git(...args: string[]) {
	return execFileSync('git', args, {
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
		stdio: ['ignore', 'pipe', 'pipe']
	}).trim();
}

/**
 * Makes the copy whole for reading releases: the rest of the history when it is shallow, and the release tags when
 * it is shallow or on Vercel, whose copies come without them. A full copy elsewhere (a PC, a thread) keeps the tags
 * it has.
 */
export function readyRepository(head = 'HEAD') {
	const isShallow = git('rev-parse', '--is-shallow-repository') === 'true';
	if (isShallow) {
		git('fetch', '--quiet', '--unshallow', '--no-tags', REPOSITORY, git('rev-parse', head));
	}
	if (isShallow || process.env.VERCEL) {
		git('fetch', '--quiet', '--force', '--no-tags', REPOSITORY, '+refs/tags/v*:refs/tags/v*');
	}
}

/** A release tag: its version, the commit it marks and when it was made (ISO). */
export type TagType = { version: string; commit: string; at: string };

/** The release tags, oldest version first. Any other tag is left out. */
export function readTags(): TagType[] {
	const out = git(
		'for-each-ref',
		'refs/tags/v*',
		`--format=%(refname:short)${FIELD}%(objectname)${FIELD}%(*objectname)${FIELD}%(creatordate:iso-strict)`
	);
	const tags: TagType[] = [];
	for (const line of out.split('\n').filter(Boolean)) {
		const [name, object, peeled, at] = line.split(FIELD);
		const version = toTagVersion(name);
		// An annotated tag names its commit as the peeled object; a light one is the commit.
		if (version) tags.push({ version, commit: peeled || object, at });
	}
	return tags.sort((a, b) => (isNewer(a.version, b.version) ? 1 : -1));
}

/** The commits in `range` (git log's words), oldest first, merges left out. */
export function readCommits(...range: string[]): CommitType[] {
	return git('log', '--no-merges', '--reverse', `--format=%s${FIELD}%b${RECORD}`, ...range)
		.split(RECORD)
		.map((record) => record.trim())
		.filter(Boolean)
		.map((record) => {
			const [subject, body] = record.split(FIELD);
			return { subject, body };
		});
}

function count(...range: string[]) {
	return Number(git('rev-list', '--count', ...range));
}

// Whether `head` holds every change of `tag`: its own commit, or every commit of it bar merges (dev's merge of next
// is then the release, next holding all it brought).
function holds(head: string, tag: TagType) {
	return count('--no-merges', tag.commit, '--not', head) === 0;
}

export type ReleaseStateType = {
	/** The newest release the build holds all of. */
	last?: TagType;
	/** The release the build's commits since `last` make, if any: on dev, the one being made now. */
	planned?: ReleaseType;
	/** How many commits the build holds that `last` does not. */
	ahead: number;
	/** The build's version as people read it: v1.2.0, v1.3.0-next.4, or empty. */
	label: string;
	/** Every release the build knows, oldest first: the published ones and, on dev, the one being made. */
	releases: ReleaseRefType[];
	/** The version of the first release that held a commit (its full name), if any. */
	versionOf: (commit: string) => string | undefined;
};

export type ReleaseStateOptionsType = {
	/** The branch the build is made from; Vercel names it. */
	branch?: string;
	/** Whether releases are made, before the first tag exists. */
	isOn?: boolean;
	/** For the first release only: the commits it lists are the ones after this commit, tag or day. */
	since?: string;
	/** The day a release made now gets, as YYYY-MM-DD. */
	date?: string;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Which commits the release after `last` holds, in git log's words: those since `last`, or for the first, those
 * since `since` (a commit, tag or day); nothing for a first release with no `since`.
 */
export function toReleaseRange(head: string, last?: TagType, since?: string) {
	if (last) return [`${last.commit}..${head}`];
	if (!since) return undefined;
	return DAY.test(since) ? [`--since=${since}`, head] : [`${since}..${head}`];
}

/** The commits the release after `last` lists (toReleaseRange). */
export function readReleaseCommits(head: string, last?: TagType, since?: string) {
	const range = toReleaseRange(head, last, since);
	return range ? readCommits(...range) : [];
}

/** What the releases are for the build of `head`. Reads git only: `readyRepository` first, where it is needed. */
export function readReleaseState(
	head = 'HEAD',
	{
		branch = process.env.VERCEL_GIT_COMMIT_REF ?? '',
		isOn = IS_RELEASING,
		since,
		date
	}: ReleaseStateOptionsType = {}
): ReleaseStateType {
	const commit = git('rev-parse', head);
	const tags = readTags();
	const last = tags.toReversed().find((tag) => holds(commit, tag));
	const isReleaseBranch = RELEASE_BRANCHES.includes(branch);
	const planned =
		last || isOn
			? planRelease(last?.version, readReleaseCommits(commit, last, since), date)
			: undefined;
	const ahead = last ? count(commit, '--not', last.commit) : count(commit);

	// Which release first held each commit: each tag in turn, less what the tags before it held.
	const versions = new Map<string, string>();
	for (const [index, tag] of tags.entries()) {
		const before = tags.slice(0, index).map((each) => each.commit);
		const held = git('rev-list', tag.commit, ...(before.length ? ['--not', ...before] : []));
		for (const each of held.split('\n').filter(Boolean)) versions.set(each, tag.version);
	}
	const releases: ReleaseRefType[] = tags.map((tag) => ({
		version: tag.version,
		date: tag.at.slice(0, 10),
		url: toReleaseUrl(tag.version)
	}));
	// On dev, what no tag holds yet is the release being made from it now.
	if (planned && isReleaseBranch) {
		const free = git(
			'rev-list',
			commit,
			...(tags.length ? ['--not', ...tags.map((tag) => tag.commit)] : [])
		);
		for (const each of free.split('\n').filter(Boolean)) versions.set(each, planned.version);
		releases.push({
			version: planned.version,
			date: planned.date,
			url: toReleaseUrl(planned.version)
		});
	}

	return {
		last,
		planned,
		ahead,
		label: toVersionLabel({
			last: last?.version,
			planned: planned?.version,
			isReleaseBranch,
			ahead
		}),
		releases,
		versionOf: (each) => versions.get(each)
	};
}

/**
 * The build's version as people read it, for vite.config.ts to write into the app. On Vercel it readies the copy
 * first; elsewhere it reads what the copy has, without the network, and a copy with no git says nothing.
 */
export function readVersionLabel() {
	try {
		if (process.env.VERCEL) readyRepository();
		else if (git('rev-parse', '--is-shallow-repository') === 'true') return '';
		return readReleaseState().label;
	} catch {
		return '';
	}
}
