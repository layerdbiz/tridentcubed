// The download's progress (#240), as the toast shows it (progress-toast.svelte). Justin, 2026-11-18: it opens the
// moment Download is clicked, stays until the file is saved, and must always look alive, "because the last thing
// you want to do is leave the user wondering".
//
// The bar follows the real work: each real step (a page prepared, a part printed, the parts joined, the file
// saved) puts it at least at that step's mark. Between steps nothing can be measured (a part is with the printer
// for seconds, and it says nothing until it is done), so the bar creeps toward the next step's mark, fast at
// first and slower the closer it gets, and never arrives on its own: a step that is not done is never shown as
// done, and 100 is the file saved and nothing else. A step that finishes early moves the bar straight on.
// A failure stops it where it is, with the reason and a way to try again.

// How often the bar creeps, and how long it takes to cover about two thirds of the way to the next mark.
const TICK = 100;
const PACE = 12_000;
const RATE = 1 - Math.exp(-TICK / PACE);
// How close to the next mark creeping may come: the number shown stays under it.
const SHY = 0.5;
// How long "PDF downloaded" stays up.
const GOODBYE = 1600;

export class Progress {
	isOpen = $state(false);
	/** What is happening, in a few plain words. */
	label = $state('');
	/** Why the download failed; empty while it has not. */
	problem = $state('');
	/** Where the bar is, 0 to 100. */
	value = $state(0);
	#isDone = $state(false);
	#mark = 0;
	#again: (() => void) | undefined;
	#ticker: ReturnType<typeof setInterval> | undefined;
	#closer: ReturnType<typeof setTimeout> | undefined;

	/** The whole number shown beside the bar: 100 only once the file is saved. */
	get percent() {
		return this.#isDone ? 100 : Math.min(Math.floor(this.value), 99);
	}

	/** Whether a download is under way: Download does nothing more until it ends. */
	get isBusy() {
		return this.isOpen && !this.problem && !this.#isDone;
	}

	/** A download has begun: the toast opens at nothing and creeps toward `next`, the first step's mark. */
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

	/** The file is saved. */
	finish(label: string) {
		this.#stop();
		this.#isDone = true;
		this.value = 100;
		this.label = label;
		this.#closer = setTimeout(() => this.close(), GOODBYE);
	}

	/** The download failed: the toast stays, with why, until it is closed or tried again. */
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
