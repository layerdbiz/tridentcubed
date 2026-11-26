// Reading what changed between two commits (#396) from GitHub's compare answer: the new features and fixes the app's
// people meet, in plain words, and nothing for the merges, chores and the website.
import { describe, expect, it } from 'vite-plus/test';
import { toCompareChanges } from './changes.utils';

function toCommit(message: string) {
	return { sha: message.length.toString(), commit: { message } };
}

describe('the changes between two commits', () => {
	it('lists the features and fixes of every commit GitHub gives, merges and website work left out', () => {
		const changes = toCompareChanges({
			commits: [
				toCommit(
					'✨ feat(app): show initials and company codes instead of icons (#355)\n\nA body that says more.'
				),
				toCommit('🔀 merge(app): bring initials and company codes (#355) onto next'),
				toCommit("Merge remote-tracking branch 'origin/next' into claude/project-thread-m4cajt"),
				toCommit('🐛 fix(app): take away the blank item row once a PDF is the item list'),
				toCommit('✨ feat(site): a new partner band'),
				toCommit('📝 docs(app): research how products handle organization sign-up')
			]
		});

		expect(changes).toEqual([
			{
				kind: 'feature',
				text: 'Show initials and company codes instead of icons',
				area: 'app',
				tickets: [355]
			},
			{
				kind: 'fix',
				text: 'Take away the blank item row once a PDF is the item list',
				area: 'app',
				tickets: []
			}
		]);
	});

	it('lists nothing for an answer with no commits', () => {
		expect(toCompareChanges({})).toEqual([]);
	});
});
