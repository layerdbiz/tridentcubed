// Works out the release a push makes and writes its notes (#157): `node apps/app/scripts/release.ts`, run by
// .github/workflows/release.yml on each push to dev and to next. On dev it reads the tags and the commits since the
// newest one and applies the release rule (src/lib/releases/releases.utils.ts); on next every push is the next
// prerelease of the release to come, v1.0.0-next.4 (Justin, 2026-11-27). It writes the notes the GitHub release
// shows: What's New's days, each under its date, with their features and fixes in plain words, then, folded away,
// the rest. Next's first prerelease lists everything up to it, the same as What's New. A release on dev is told in
// its highlights (src/lib/releases/highlights.ts): each feature under a short title with its highlights, then the
// fixes; with none written for it, nothing is made and the run fails, saying so (Justin, 2026-11-28). The workflow tags the
// commit and publishes the release; this script never writes to git. Plain Node, no packages, so the workflow
// needs no install.
//
//   --branch <name>  the branch pushed: dev (unless told) or next; any other makes nothing
//   --first          show dev's first release, v1.0.0, though releases are not turned on yet (IS_RELEASING): a preview
//   --notes <file>   where to write the release notes (Markdown)
//   --head <ref>     work on this commit as though it were the branch's newest: an earlier prerelease's tag, to write
//                    its notes again
//   --dry-run        print what the release would be, and write nothing
//
// It says what it found in GITHUB_OUTPUT when that is set: `version=1.1.0` and `prerelease=false`, or nothing when
// there is no release. A commit that already has its tag (a run done again) gets that version and its notes, so a
// GitHub release that failed to publish is made the second time.
import { appendFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { HIGHLIGHTS } from '../src/lib/releases/highlights.ts';
import { readLanded } from '../src/lib/releases/history.server.ts';
import {
	isHidden,
	isMissingHighlights,
	toHistory,
	toPlainLines,
	toReleaseNotes
} from '../src/lib/releases/history.utils.ts';
import { HIDDEN_TICKETS, PLAIN } from '../src/lib/releases/notes.ts';
import {
	git,
	isHeld,
	readCommitIds,
	readCommits,
	readPrereleaseTags,
	readReleaseState,
	readTags,
	toReleaseRange,
	type TagType
} from '../src/lib/releases/releases.server.ts';
import {
	FIRST_SUMMARY,
	IS_RELEASING,
	PRERELEASE_BRANCH,
	isPrerelease,
	toReleaseChanges,
	toReleaseRef,
	toTag
} from '../src/lib/releases/releases.utils.ts';

const { values } = parseArgs({
	options: {
		branch: { type: 'string', default: 'dev' },
		first: { type: 'boolean', default: false },
		notes: { type: 'string' },
		head: { type: 'string', default: 'HEAD' },
		'dry-run': { type: 'boolean', default: false }
	}
});

function say(line: string) {
	process.stdout.write(`${line}\n`);
}

// The newer of two tags HEAD holds: the one the other leads to.
function toNewer(a: TagType | undefined, b: TagType | undefined) {
	if (!a || !b) return a ?? b;
	return isHeld(a, b.commit) ? b : a;
}

const head = git('rev-parse', `${values.head}^{commit}`);
const tags = readTags();

let version: string;
let last: TagType | undefined;
if (values.branch === PRERELEASE_BRANCH) {
	// Every push to next is a prerelease: its tag already, when the run is done again, or the next one.
	const prereleases = readPrereleaseTags();
	const own = prereleases.find((tag) => tag.commit === head);
	const state = readReleaseState(head, { branch: values.branch });
	if (!own && !state.isNew) {
		say(`No prerelease: this commit is ${state.label} already.`);
		process.exit(0);
	}
	version = own?.version ?? state.version!;
	const before = prereleases.filter((tag) => tag !== own && isHeld(tag, head)).at(-1);
	// Its notes are what came since the newest tag before it, a prerelease or a release.
	last = toNewer(before, state.last);
} else if (values.branch === 'dev') {
	const own = tags.find((tag) => tag.commit === head);
	if (own) {
		// Done again: the release this commit already is.
		version = own.version;
		last = tags[tags.indexOf(own) - 1];
	} else {
		const state = readReleaseState(head, { branch: 'dev', isOn: IS_RELEASING || values.first });
		if (!state.planned) {
			say(
				state.last
					? `No release: nothing since ${toTag(state.last.version)} is a new feature or a fix.`
					: 'No release: releases are not turned on yet (IS_RELEASING in src/lib/releases/releases.utils.ts).'
			);
			process.exit(0);
		}
		version = state.planned.version;
		last = state.last;
	}
} else {
	say(
		`No release: releases are made from dev, and prereleases from ${PRERELEASE_BRANCH}, not ${values.branch}.`
	);
	process.exit(0);
}
// A release on dev is told in its highlights: without them it is not made (a dry run only says so).
if (isMissingHighlights(version, HIGHLIGHTS)) {
	say(
		`${toTag(version)} has no highlights: write them in apps/app/src/lib/releases/highlights.ts on next, then move next to dev again.`
	);
	if (!values['dry-run']) process.exit(1);
}
const isTagged = [...tags, ...readPrereleaseTags()].some(
	(tag) => tag.commit === head && tag.version === version
);

// The release's own commits, What's New's sections made of them, and the rest of its features and fixes. A release
// made on dev is one section, dated the day it reached dev: its tag's day, or today for the one being made (Justin,
// 2026-11-27), told in its highlights; a prerelease's are its days. Dev's first release has nothing behind the scenes.
const isRelease = !isPrerelease(version);
const isFirst = !last && isRelease;
const date = isRelease
	? (tags.find((tag) => tag.commit === head && tag.version === version)?.date ??
		new Date().toISOString())
	: undefined;
const range = toReleaseRange(head, last);
const held = new Set(readCommitIds(...range));
const { chain, landed } = readLanded(head);
const batches = toHistory(
	head,
	chain,
	landed
		.filter((each) => each.commit && held.has(each.commit))
		.map((each) => (isRelease ? { ...each, release: version } : each)),
	{
		plain: PLAIN,
		hidden: HIDDEN_TICKETS,
		highlights: HIGHLIGHTS,
		releases: isRelease ? [toReleaseRef(version, date)] : []
	}
).batches;
const others = isFirst
	? []
	: toReleaseChanges(
			readCommits(...range).filter((commit) => toPlainLines(commit, PLAIN).length === 0)
		).filter((change) => !isHidden(change, HIDDEN_TICKETS));
// Where it was made from, so a release from next reads as next's, and the first one's welcome.
const summary = [
	isPrerelease(version) ? 'Made from **next**, for next.app.tridentcubed.com.' : '',
	last ? '' : FIRST_SUMMARY
]
	.filter(Boolean)
	.join('\n\n');
const notes = toReleaseNotes({ summary: summary || undefined, batches, others });

say(`${toTag(version)}${isTagged ? ' (tagged already)' : ''}\n\n${notes}`);
if (values['dry-run']) process.exit(0);

if (values.notes) writeFileSync(values.notes, notes);
if (process.env.GITHUB_OUTPUT) {
	appendFileSync(
		process.env.GITHUB_OUTPUT,
		`version=${version}\nprerelease=${isPrerelease(version)}\n`
	);
}
