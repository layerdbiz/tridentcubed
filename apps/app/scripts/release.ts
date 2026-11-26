// Works out the release a push to dev makes and writes its notes (#157): `node apps/app/scripts/release.ts`, run by
// .github/workflows/release.yml on each push to dev. It reads the tags and the commits since the newest one, applies
// the release rule (src/lib/releases/releases.utils.ts), and writes the notes the GitHub release shows: What's New's
// batches of work with their titles and words, then the changes outside the app. The workflow tags the commit and
// publishes the release; this script never writes to git. Plain Node, no packages, so the workflow needs no install.
//
//   --first          allow the first release, v1.0.0, though releases are not turned on (IS_RELEASING)
//   --since <ref>    for the first release only: list the changes made after this commit, tag or day (2026-11-20)
//   --notes <file>   where to write the release notes (Markdown)
//   --dry-run        print what the release would be, and write nothing
//
// It says what it found in GITHUB_OUTPUT when that is set: `version=1.1.0`, or nothing when there is no release. A
// commit that already has its tag (a run done again) gets that version and its notes, so a GitHub release that
// failed to publish is made the second time.
import { appendFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { readLanded } from '../src/lib/releases/history.server.ts';
import { toHistory } from '../src/lib/releases/history.utils.ts';
import { NOTES } from '../src/lib/releases/notes.ts';
import {
	git,
	readReleaseCommits,
	readReleaseState,
	readTags,
	toReleaseRange,
	type TagType
} from '../src/lib/releases/releases.server.ts';
import {
	FIRST_SUMMARY,
	IS_RELEASING,
	isAppChange,
	toReleaseChanges,
	toReleaseNotes
} from '../src/lib/releases/releases.utils.ts';

const { values } = parseArgs({
	options: {
		first: { type: 'boolean', default: false },
		since: { type: 'string' },
		notes: { type: 'string' },
		'dry-run': { type: 'boolean', default: false }
	}
});

function say(line: string) {
	process.stdout.write(`${line}\n`);
}

const head = git('rev-parse', 'HEAD');
// A push that replaced dev's history names a commit that is gone: the first release then lists nothing after it.
const DAY = /^\d{4}-\d{2}-\d{2}$/;
let since = values.since;
if (since && !DAY.test(since)) {
	try {
		git('rev-parse', '--verify', '--quiet', `${since}^{commit}`);
	} catch {
		say(`${since} is not a commit here, so the first release lists only its welcome line.`);
		since = undefined;
	}
}
const tags = readTags();
const own = tags.find((tag) => tag.commit === head);

let version: string;
let last: TagType | undefined;
if (own) {
	// Done again: the release this commit already is.
	version = own.version;
	last = tags[tags.indexOf(own) - 1];
} else {
	const state = readReleaseState(head, {
		branch: 'dev',
		isOn: IS_RELEASING || values.first,
		since
	});
	if (!state.planned) {
		say(
			state.last
				? `No release: nothing since v${state.last.version} is a new feature or a fix.`
				: 'No release: releases are not turned on yet (IS_RELEASING in src/lib/releases/releases.utils.ts).'
		);
		process.exit(0);
	}
	version = state.planned.version;
	last = state.last;
}

// The release's own commits, and What's New's batches made of them.
const range = toReleaseRange(head, last, since);
const held = new Set(
	range
		? git('rev-list', ...range)
				.split('\n')
				.filter(Boolean)
		: []
);
const { chain, landed } = readLanded(head);
const batches = toHistory(
	head,
	chain,
	landed.filter((each) => each.commit && held.has(each.commit)),
	NOTES
).batches;
const others = toReleaseChanges(readReleaseCommits(head, last, since)).filter(
	(change) => !isAppChange(change)
);
const notes = toReleaseNotes({ summary: last ? undefined : FIRST_SUMMARY, batches, others });

say(`v${version}${own ? ' (tagged already)' : ''}\n\n${notes}`);
if (values['dry-run']) process.exit(0);

if (values.notes) writeFileSync(values.notes, notes);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
