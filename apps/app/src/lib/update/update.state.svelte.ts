// The update rule (#202, ADR 0007): when an open app switches to a new version. A new version is offered, never
// taken: the switch needs the User's tap on What's New's button, and it never happens while a change is Saving or
// Not saved.
// A tap made then is kept, and the switch follows once the Save state is back to Saved. The switch is the new
// version's service worker taking over, then a reload onto the same address.
//
// It knows nothing of the browser: `isNew` (SvelteKit's own version check), `save` (the sync loop's state),
// `takeOver` (the service worker) and `reload` are handed to it.
import type { SaveStateType } from '#lib/rows/rows.state.svelte.js';

/** What the button shows: nothing, the offer, that it waits for the save, or that the app is switching. */
export type UpdateStepType = 'none' | 'offered' | 'waiting' | 'switching';

export type UpdateOptionsType = {
	/** Whether a new version exists. */
	isNew: () => boolean;
	/** The Save state, as the cloud shows it. */
	save: () => SaveStateType;
	/** Asks the new version's service worker to take over; done once it has, or at once when none waits. */
	takeOver: () => Promise<void>;
	/** Reloads the page it is on. */
	reload: () => void;
};

export class UpdateState {
	#isAsked = $state(false);
	#isTakingOver = false;
	#options: UpdateOptionsType;

	constructor(options: UpdateOptionsType) {
		this.#options = options;
	}

	get step(): UpdateStepType {
		if (!this.#options.isNew()) return 'none';
		if (!this.#isAsked) return 'offered';
		return this.#options.save() === 'saved' ? 'switching' : 'waiting';
	}

	/** The User's tap on the note. */
	tap() {
		this.#isAsked = true;
	}

	/** For the note's effect, which runs it whenever the step may have changed: switches once the step says so. */
	follow() {
		if (this.step === 'switching') void this.#switch();
	}

	async #switch() {
		if (this.#isTakingOver) return;
		this.#isTakingOver = true;
		try {
			await this.#options.takeOver();
		} catch {
			// The new version could not be asked. The reload still lands on it: a page always comes from the network.
		} finally {
			this.#isTakingOver = false;
		}
		// A change made while the new version took over is saved first; `follow` runs again once it is.
		if (this.step === 'switching') this.#options.reload();
	}
}
