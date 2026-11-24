// The work a Toast (glossary) shows (#293; it began as the PDF download's progress, #240). Justin, 2026-11-18: it
// opens the moment the work starts, stays until it is done, and must always look alive, "because the last thing you
// want to do is leave the user wondering".
//
// The bar follows the real work: each real step (a page prepared, a part printed, a photo stored) puts it at least
// at that step's mark. Between steps nothing can be measured, so the bar creeps toward the next step's mark, fast at
// first and slower the closer it gets, and never arrives on its own: a step that is not done is never shown as done,
// and 100 is the work done and nothing else. A step that finishes early moves the bar straight on. A failure stops
// it where it is, with the reason and a way to try again.

// How often the bar creeps, and how long it takes to cover about two thirds of the way to the next mark.
const TICK = 100;
const PACE = 12_000;
const RATE = 1 - Math.exp(-TICK / PACE);
// How close to the next mark creeping may come: the number shown stays under it.
const SHY = 0.5;
// How long the toast stays up once the work is done ("PDF downloaded").
const GOODBYE = 1600;

export class Progress {
	isOpen = $state(false);
	/** What is happening, in a few plain words. */
	label = $state('');
	/** Why the work failed; empty while it has not. */
	problem = $state('');
	/** Where the bar is, 0 to 100. */
	value = $state(0);
	#isDone = $state(false);
	#mark = 0;
	#again: (() => void) | undefined;
	#ticker: ReturnType<typeof setInterval> | undefined;
	#closer: ReturnType<typeof setTimeout> | undefined;

	/** The whole number shown beside the bar: 100 only once the work is done. */
	get percent() {
		return this.#isDone ? 100 : Math.min(Math.floor(this.value), 99);
	}

	/** Whether the work is under way: what started it does nothing more until it ends. */
	get isBusy() {
		return this.isOpen && !this.problem && !this.#isDone;
	}

	/** The work has begun: the toast opens at nothing and creeps toward `next`, the first step's mark. */
	start(label: string, next: number) {
		this.#stop();
		this.isOpen = true;
		this.#isDone = false;
		this.problem = '';
		this.label = label;
		this.value = 0;
		this.#mark = next;
		this.#ticker = setInterval(() => this.#creep(), TICK);
	}

	/**
	 * Real work has got as far as `done`: the bar is at least there (and stays where it crept to when that is
	 * further), and creeps toward `next` while the following step runs.
	 */
	reach(done: number, next: number, label?: string) {
		if (!this.isBusy) return;
		this.value = Math.max(this.value, Math.min(done, 99));
		this.#mark = next;
		if (label) this.label = label;
	}

	/** The work is done: the bar reads 100 and the toast goes a moment later. */
	finish(label: string) {
		this.#stop();
		this.#isDone = true;
		this.value = 100;
		this.label = label;
		this.#closer = setTimeout(() => this.close(), GOODBYE);
	}

	/** The work failed: the toast stays, with why, until it is closed or tried again. */
	fail(problem: string, again: () => void) {
		this.#stop();
		this.problem = problem;
		this.#again = again;
	}

	retry() {
		this.#again?.();
	}

	close() {
		this.#stop();
		this.isOpen = false;
		this.problem = '';
	}

	#creep() {
		const limit = Math.min(this.#mark, 99) - SHY;
		if (this.value < limit) this.value += (limit - this.value) * RATE;
	}

	#stop() {
		clearInterval(this.#ticker);
		clearTimeout(this.#closer);
		this.#again = undefined;
	}
}
