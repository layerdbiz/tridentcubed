// The releases as git knows them (#157, #400): the `v*` tags, which commits each one first held, the newest one a
// build holds, and the release the build's newer commits make. A tag is the whole record of a release (the GitHub
// release carries its notes), so a build reads it from git: Vercel's copy has no tags and a short history, so
// `readyRepository` fetches both from the public repository first; no key is needed.
//
// Releases are made from dev; every push to next is a prerelease of the one to come, v1.0.0-next.4, with a tag of
// its own (Justin, 2026-11-27). What it works out goes through the plain rule in releases.utils.ts, so the release
// workflow (scripts/release.ts) and every build agree on the version without asking each other: a build in the
// minute before its tag exists already says the version the workflow is about to give it.
import { execFileSync } from 'node:child_process';
import {
	IS_RELEASING,
	RELEASE_BRANCHES,
	REPOSITORY_URL,
	isNewer,
	isPrerelease,
	planRelease,
	toNextPrerelease,
	toPrereleaseBase,
	toPrereleaseVersion,
	toReleaseRef,
	toTag,
	toTagVersion,
	type CommitType,
	type PrereleaseType,
	type ReleaseRefType,
	type ReleaseType
} from './releases.utils.ts';

const REPOSITORY = `${REPOSITORY_URL}.git`;
/** Between fields and between commits in what git prints, characters no commit title or body holds. */
export const FIELD = '\u001f';
export const RECORD = '\u001e';

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

/** A release tag: its version, the commit it marks and, read from git, when it was made (ISO). */
export type TagType = { version: string; commit: string; date?: string };

/** A prerelease tag: its version, the release it leads to, its number and the commit it marks. */
export type PrereleaseTagType = TagType & PrereleaseType;

// Every v* tag as its name, the commit it marks and when it was made: the release workflow's annotated tags are dated
// the moment the push reached the branch.
function readTagNames() {
	const out = git(
		'for-each-ref',
		'refs/tags/v*',
		`--format=%(refname:short)${FIELD}%(objectname)${FIELD}%(*objectname)${FIELD}%(creatordate:iso-strict)`
	);
	return out
		.split('\n')
		.filter(Boolean)
		.map((line) => {
			const [name, object, peeled, date] = line.split(FIELD);
			// An annotated tag names its commit as the peeled object; a light one is the commit.
			return { name, commit: peeled || object, date };
		});
}

/** The release tags, oldest version first. Prereleases and any other tag are left out. */
export function readTags(): TagType[] {
	const tags: TagType[] = [];
	for (const { name, commit, date } of readTagNames()) {
		const version = toTagVersion(name);
		if (version) tags.push({ version, commit, date });
	}
	return tags.sort((a, b) => (isNewer(a.version, b.version) ? 1 : -1));
}

/** The prerelease tags (v1.0.0-next.3), oldest first: by the release they lead to, then by number. */
export function readPrereleaseTags(): PrereleaseTagType[] {
	const tags: PrereleaseTagType[] = [];
	for (const { name, commit } of readTagNames()) {
		const prerelease = toPrereleaseVersion(name);
		if (prerelease) tags.push({ ...prerelease, commit });
	}
	return tags.sort((a, b) =>
		a.base === b.base ? a.number - b.number : isNewer(a.base, b.base) ? 1 : -1
	);
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

/** The commits in `range` (git rev-list's words), as full names. */
export function readCommitIds(...range: string[]) {
	return git('rev-list', ...range)
		.split('\n')
		.filter(Boolean);
}

function count(...range: string[]) {
	return Number(git('rev-list', '--count', ...range));
}

/**
 * Whether `head` holds every change of `tag`: its own commit, or every commit of it bar merges (dev's merge of next
 * is then the release, next holding all it brought).
 */
export function isHeld(tag: TagType, head: string) {
	return count('--no-merges', tag.commit, '--not', head) === 0;
}

export type ReleaseStateType = {
	/** The newest release the build holds all of. */
	last?: TagType;
	/** The release the build's commits since `last` make, if any: on dev, the one being made now. */
	planned?: ReleaseType;
	/** The build's version without its v: 1.2.0 on dev, 1.3.0-next.4 on next; none while nothing is released on dev. */
	version?: string;
	/** Whether `version` is a prerelease still to be tagged: the one the next workflow is about to make. */
	isNew: boolean;
	/** The build's version as people read it: v1.2.0, v1.3.0-next.4, or empty. */
	label: string;
	/**
	 * Every release the build knows, oldest first: the published ones, on next its prereleases too, and the one being
	 * made from the build.
	 */
	releases: ReleaseRefType[];
	/** The version of the first release that held a commit (its full name), if any. */
	versionOf: (commit: string) => string | undefined;
};

export type ReleaseStateOptionsType = {
	/** The branch the build is made from; Vercel names it. */
	branch?: string;
	/** Whether releases are made, before the first tag exists. */
	isOn?: boolean;
};

/**
 * Which commits the release after `last` holds, in git's words: those since `last`, or for the first release,
 * everything up to it, as What's New lists it.
 */
export function toReleaseRange(head: string, last?: TagType) {
	return last ? [`${last.commit}..${head}`] : [head];
}

/** What the releases are for the build of `head`. Reads git only: `readyRepository` first, where it is needed. */
export function readReleaseState(
	head = 'HEAD',
	{
		branch = process.env.VERCEL_GIT_COMMIT_REF ?? '',
		isOn = IS_RELEASING
	}: ReleaseStateOptionsType = {}
): ReleaseStateType {
	const commit = git('rev-parse', head);
	const tags = readTags();
	const last = tags.toReversed().find((tag) => isHeld(tag, commit));
	const isReleaseBranch = RELEASE_BRANCHES.includes(branch);
	const commits = readCommits(...toReleaseRange(commit, last));
	const planned = last || isOn ? planRelease(last?.version, commits) : undefined;
	// Prereleases are next's own: dev and main name only releases.
	const prereleases = isReleaseBranch ? [] : readPrereleaseTags();

	// Which release first held each commit: each release in turn, less what the ones before it held, then on next each
	// prerelease over them the same way. On next a commit stays the prerelease's that brought it, after a release holds
	// it too: next.app keeps its next versions, and dev and main, which read no prereleases, name only releases
	// (Justin, 2026-11-27).
	const versions = new Map<string, string>();
	for (const group of [tags, prereleases]) {
		for (const [index, tag] of group.entries()) {
			const before = group.slice(0, index).map((each) => each.commit);
			const held = readCommitIds(tag.commit, ...(before.length ? ['--not', ...before] : []));
			for (const each of held) versions.set(each, tag.version);
		}
	}
	const releases: ReleaseRefType[] = [
		...prereleases.map((tag) => toReleaseRef(tag.version)),
		...tags.map((tag) => toReleaseRef(tag.version, tag.date))
	];

	// The build's own version: on dev the release being made from it, or the last; on next its prerelease tag, or the
	// prerelease the workflow is about to tag it with.
	let version: string | undefined;
	let isNew = false;
	if (isReleaseBranch) {
		version = planned?.version ?? last?.version;
		isNew = Boolean(planned);
	} else {
		const own = prereleases.find((tag) => tag.commit === commit);
		version = own?.version ?? (last?.commit === commit ? last.version : undefined);
		if (!version) {
			const base = toPrereleaseBase(last?.version, commits);
			const numbers = prereleases.filter((tag) => tag.base === base).map((tag) => tag.number);
			version = toNextPrerelease(base, numbers);
			isNew = true;
		}
	}
	// What no tag holds yet is the release or prerelease being made from the build now.
	if (version && isNew) {
		const made = [...prereleases, ...tags].map((tag) => tag.commit);
		for (const each of readCommitIds(commit, ...(made.length ? ['--not', ...made] : []))) {
			versions.set(each, version);
		}
		releases.push(
			toReleaseRef(version, isPrerelease(version) ? undefined : new Date().toISOString())
		);
	}

	return {
		last,
		planned,
		version,
		isNew,
		label: version ? toTag(version) : '',
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
