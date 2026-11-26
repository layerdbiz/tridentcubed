// Works out the next release and writes it (#157): `node apps/app/scripts/release.ts`, run by
// .github/workflows/release.yml after each merge into dev. It reads the commits since the last `v*` tag, applies the
// release rule (src/lib/releases/releases.utils.ts), puts the new release at the top of
// src/lib/releases/releases.json, which the app shows in What's New (#363), and writes its notes for the GitHub
// release. The workflow commits that file, tags the commit and makes the GitHub release; this script never touches
// git beyond reading it. Plain Node, no packages, so the workflow needs no install.
//
//   --first          allow the first release, v1.0.0, when no tag exists yet; without it, nothing is made
//   --since <ref>    for the first release only: list the changes made after this commit, tag or day (2026-11-20)
//   --notes <file>   where to write the release notes (Markdown)
//   --dry-run        print what the release would be, and write nothing
//
// It says what it made in GITHUB_OUTPUT when that is set: `version=1.1.0`, or nothing when there is no release.
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import type { CommitType, ReleaseType } from '../src/lib/releases/releases.utils.ts';
import { planRelease, toReleaseNotes } from '../src/lib/releases/releases.utils.ts';

const RELEASES = fileURLToPath(new URL('../src/lib/releases/releases.json', import.meta.url));
const DAY = /^\d{4}-\d{2}-\d{2}$/;
// Between fields and between commits, characters no commit title or body holds.
const FIELD = '\u001f';
const RECORD = '\u001e';

const { values } = parseArgs({
	options: {
		first: { type: 'boolean', default: false },
		since: { type: 'string' },
		notes: { type: 'string' },
		'dry-run': { type: 'boolean', default: false }
	}
});

function git(...args: string[]) {
	return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function readCommits(range: string[]): CommitType[] {
	return git('log', '--no-merges', `--format=%s${FIELD}%b${RECORD}`, ...range)
		.split(RECORD)
		.map((record) => record.trim())
		.filter(Boolean)
		.map((record) => {
			const [subject, body] = record.split(FIELD);
			return { subject, body };
		});
}

function say(line: string) {
	process.stdout.write(`${line}\n`);
}

const last = git('tag', '--list', 'v[0-9]*', '--sort=-v:refname', '--merged', 'HEAD')
	.split('\n')
	.find(Boolean)
	?.slice(1);

if (!last && !values.first) {
	say(
		'No release: there is no v* tag yet, and the first release is made only by a hand run (--first).'
	);
	process.exit(0);
}

let range: string[] | undefined;
if (last) range = [`v${last}..HEAD`];
else if (values.since)
	range = DAY.test(values.since) ? [`--since=${values.since}`, 'HEAD'] : [`${values.since}..HEAD`];

const release = planRelease(last, range ? readCommits(range) : []);
if (!release) {
	say(`No release: nothing since v${last} is a new feature or a fix.`);
	process.exit(0);
}

const notes = toReleaseNotes(release);
say(`v${release.version}, ${release.date}\n\n${notes}`);
if (values['dry-run']) process.exit(0);

const releases = JSON.parse(readFileSync(RELEASES, 'utf8')) as ReleaseType[];
writeFileSync(RELEASES, `${JSON.stringify([release, ...releases], null, '\t')}\n`);
if (values.notes) writeFileSync(values.notes, notes);
if (process.env.GITHUB_OUTPUT)
	appendFileSync(process.env.GITHUB_OUTPUT, `version=${release.version}\n`);
