import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';

// When next moves into dev, the close-issues workflow closes the tickets of each pull request into next that the
// push brings onto dev (`.github/workflows/close-issues.yml`). This is the part that reads a pull request: its branch
// and its body give the tickets it finishes, and a ticket that is only mentioned stays open.
const SCRIPT = fileURLToPath(new URL('../../../.github/scripts/closes.sh', import.meta.url));

/** The tickets a pull request finishes, as the workflow reads them from its branch and its body. */
function finishedBy(branch: string, body = '') {
	const { stdout } = spawnSync('sh', [SCRIPT, branch], { input: body, encoding: 'utf8' });
	return stdout.split('\n').filter(Boolean).map(Number);
}

// Windows has no `sh` outside Git Bash; the script runs on GitHub's Linux runners.
const hasShell = spawnSync('sh', ['-c', 'exit 0']).status === 0;

describe.skipIf(!hasShell)('which tickets a pull request into next finishes', () => {
	it('finishes the ticket its branch is named for', () => {
		expect(finishedBy('perf/397-faster-tracing')).toEqual([397]);
	});

	it('finishes each ticket its body closes, in any of GitHub closing words', () => {
		expect(
			finishedBy('claude/project-thread-f8cdf3', 'fixes #3\nResolved: #40\nclose #7\nFIXED #8\n')
		).toEqual([3, 7, 8, 40]);
	});

	it('names a ticket once when the branch and the body both name it', () => {
		expect(finishedBy('feat/354-email-signature', 'Closes #354\n')).toEqual([354]);
	});

	it('leaves a ticket open that the body only mentions', () => {
		expect(
			finishedBy('claude/project-thread-f8cdf3', 'Round 3 of the signature (#354).\n\nRefs #295\n')
		).toEqual([]);
	});

	it('does not read a closing word inside a longer word', () => {
		expect(finishedBy('', 'prefixes #77 and unfixed #78\n')).toEqual([]);
	});

	it('takes no number from a branch not named <type>/<n>-<slug>', () => {
		expect(finishedBy('next')).toEqual([]);
		expect(finishedBy('release-2026/12')).toEqual([]);
	});
});
