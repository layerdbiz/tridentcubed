// The update rule with plain data (#202): a version check, a Save state, a handover and a reload that are functions.
// What is checked is when the app switches to a new version: only after the User's tap, and never while a change is
// Saving or Not saved.
import { describe, expect, it } from 'vite-plus/test';
import type { SaveStateType } from '#lib/rows/rows.state.svelte.js';
import { UpdateState } from './update.state.svelte';

function createApp(save: SaveStateType = 'saved') {
	let isNew = false;
	let handOver: (() => void) | undefined;
	let refuse: ((reason: Error) => void) | undefined;
	const app = {
		handovers: 0,
		reloads: 0,
		update: new UpdateState({
			isNew: () => isNew,
			save: () => save,
			takeOver: () => {
				app.handovers += 1;
				return new Promise<void>((resolve, reject) => {
					handOver = resolve;
					refuse = reject;
				});
			},
			reload: () => (app.reloads += 1)
		}),
		// The note's effect runs `follow` whenever something it read changes; here every change runs it.
		deploy() {
			isNew = true;
			app.update.follow();
		},
		tap() {
			app.update.tap();
			app.update.follow();
		},
		setSave(state: SaveStateType) {
			save = state;
			app.update.follow();
		},
		/** The new version's service worker has taken over. */
		async finishHandover() {
			handOver?.();
			await Promise.resolve();
		},
		/** The new version's service worker could not be asked. */
		async failHandover() {
			refuse?.(new Error('No service worker answered.'));
			await Promise.resolve();
		}
	};
	return app;
}

describe('the update rule', () => {
	it('shows nothing while there is no new version', () => {
		const app = createApp();

		expect(app.update.step).toBe('none');
	});

	it.each<SaveStateType>(['saved', 'saving', 'failed'])(
		'offers a new version and never switches by itself, while the Save state is %s',
		(save) => {
			const app = createApp(save);

			app.deploy();

			expect(app.update.step).toBe('offered');
			expect(app.handovers).toBe(0);
			expect(app.reloads).toBe(0);
		}
	);

	it('switches on a tap while everything is saved: the new version takes over, then the page reloads', async () => {
		const app = createApp();
		app.deploy();

		app.tap();

		expect(app.update.step).toBe('switching');
		expect(app.handovers).toBe(1);
		expect(app.reloads).toBe(0);

		await app.finishHandover();

		expect(app.reloads).toBe(1);
	});

	it('waits on a tap while a change is Saving, and switches once it is Saved', async () => {
		const app = createApp('saving');
		app.deploy();

		app.tap();

		expect(app.update.step).toBe('waiting');
		expect(app.handovers).toBe(0);
		expect(app.reloads).toBe(0);

		app.setSave('saved');
		await app.finishHandover();

		expect(app.handovers).toBe(1);
		expect(app.reloads).toBe(1);
	});

	it('waits on a tap while a change is Not saved, through the retry, and switches once it is Saved', async () => {
		const app = createApp('failed');
		app.deploy();

		app.tap();
		app.setSave('saving');

		expect(app.update.step).toBe('waiting');
		expect(app.handovers).toBe(0);

		app.setSave('failed');

		expect(app.update.step).toBe('waiting');
		expect(app.handovers).toBe(0);

		app.setSave('saved');
		await app.finishHandover();

		expect(app.handovers).toBe(1);
		expect(app.reloads).toBe(1);
	});

	it('does not reload over a change made while the new version takes over; it reloads once that is Saved', async () => {
		const app = createApp();
		app.deploy();
		app.tap();

		app.setSave('saving');
		await app.finishHandover();

		expect(app.update.step).toBe('waiting');
		expect(app.reloads).toBe(0);

		app.setSave('saved');
		await app.finishHandover();

		expect(app.reloads).toBe(1);
	});

	it('asks the new version to take over once, however often the Save state settles meanwhile', async () => {
		const app = createApp();
		app.deploy();
		app.tap();

		app.setSave('saving');
		app.setSave('saved');

		expect(app.handovers).toBe(1);

		await app.finishHandover();

		expect(app.reloads).toBe(1);
	});

	it('still reloads when the new version cannot be asked to take over, and is not left on Updating', async () => {
		const app = createApp();
		app.deploy();
		app.tap();

		await app.failHandover();

		expect(app.reloads).toBe(1);
	});
});
