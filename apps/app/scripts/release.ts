// Works out the release a push to dev makes and writes its notes (#157): `node apps/app/scripts/release.ts`, run by
// .github/workflows/release.yml on each push to dev. It reads the tags and the commits since the newest one, applies
// the release rule (src/lib/releases/releases.utils.ts), and writes the notes the GitHub release shows: What's New's
// batches of work with their titles and words, then the changes outside the app. The first release lists everything
// up to it, the same as What's New. The workflow tags the commit and publishes the release; this script never writes
// to git. Plain Node, no packages, so the workflow needs no install.
//
//   --first          show the first release, v1.0.0, though releases are not turned on yet (IS_RELEASING): a preview
//   --notes <file>   where to write the release notes (Markdown)
//   --dry-run        print what the release would be, and write nothing
//
// It says what it found in GITHUB_OUTPUT when that is set: `version=1.1.0`, or nothing when there is no release. A
// commit that already has its tag (a run done again) gets that version and its notes, so a GitHub release that
// failed to publish is made the second time.
import { appendFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { readLanded } from '../src/lib/releases/history.server.ts';
import { toHistory, toReleaseNotes } from '../src/lib/releases/history.utils.ts';
import { NOTES } from '../src/lib/releases/notes.ts';
import {
	git,
	readCommitIds,
	readCommits,
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
	toTag
} from '../src/lib/releases/releases.utils.ts';

const { values } = parseArgs({
	options: {
		first: { type: 'boolean', default: false },
		notes: { type: 'string' },
		'dry-run': { type: 'boolean', default: false }
	}
});

function say(line: string) {
	process.stdout.write(`${line}\n`);
}

const head = git('rev-parse', 'HEAD');
const tags = readTags();
const own = tags.find((tag) => tag.commit === head);

let version: string;
let last: TagType | undefined;
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

// The release's own commits, and What's New's batches made of them.
const range = toReleaseRange(head, last);
const held = new Set(readCommitIds(...range));
const { chain, landed } = readLanded(head);
const batches = toHistory(
	head,
	chain,
	landed.filter((each) => each.commit && held.has(each.commit)),
	NOTES
).batches;
const others = toReleaseChanges(readCommits(...range)).filter((change) => !isAppChange(change));
const notes = toReleaseNotes({ summary: last ? undefined : FIRST_SUMMARY, batches, others });

say(`${toTag(version)}${own ? ' (tagged already)' : ''}\n\n${notes}`);
if (values['dry-run']) process.exit(0);

if (values.notes) writeFileSync(values.notes, notes);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
