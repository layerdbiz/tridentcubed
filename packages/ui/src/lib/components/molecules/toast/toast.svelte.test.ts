// The work a toast shows (#293; first the PDF download's, #240; Justin, 2026-11-18: "it needs to appear to be
// actually loading, because the last thing you want to do is leave the user wondering"). What is checked is what the
// person sees: the bar opens at once, keeps moving between real steps without passing one that is not done, glides on
// when a step finishes, only reads 100 when the work is done, and stays open with the reason when it fails.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { Progress } from './toast.svelte.ts';

const SECOND = 1000;

describe('the progress a toast shows', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('is closed until a download starts', () => {
		const progress = new Progress();
		expect(progress.isOpen).toBe(false);
		expect(progress.isBusy).toBe(false);
	});

	it('opens at once, at nothing, saying what it is doing', () => {
		const progress = new Progress();
		progress.start('Getting the pages ready', 25);
		expect(progress.isOpen).toBe(true);
		expect(progress.isBusy).toBe(true);
		expect(progress.label).toBe('Getting the pages ready');
		expect(progress.percent).toBe(0);
	});

	it('keeps moving while a step runs, and never passes the step that is not done', () => {
		const progress = new Progress();
		progress.start('Getting the pages ready', 25);
		const seen: number[] = [];
		for (let second = 0; second < 600; second += 1) {
			vi.advanceTimersByTime(SECOND);
			seen.push(progress.value);
		}
		expect(seen[0]).toBeGreaterThan(0);
		// Always forward, for ten minutes of waiting, and still short of the step.
		for (const [at, value] of seen.entries()) {
			if (at) expect(value).toBeGreaterThanOrEqual(seen[at - 1]);
		}
		expect(seen[30]).toBeGreaterThan(seen[5]);
		expect(seen.at(-1)).toBeLessThan(25);
		expect(progress.percent).toBeLessThan(25);
	});

	it('is at least where the real work is the moment a step finishes', () => {
		const progress = new Progress();
		progress.start('Getting the pages ready', 25);
		vi.advanceTimersByTime(SECOND);
		progress.reach(25, 85, 'Printing 24 pages');
		expect(progress.value).toBe(25);
		expect(progress.label).toBe('Printing 24 pages');
		vi.advanceTimersByTime(20 * SECOND);
		expect(progress.value).toBeGreaterThan(40);
		expect(progress.value).toBeLessThan(85);
	});

	it('never goes back when the real work is behind where the bar crept to', () => {
		const progress = new Progress();
		progress.start('Printing', 85);
		vi.advanceTimersByTime(60 * SECOND);
		const crept = progress.value;
		progress.reach(40, 85);
		expect(progress.value).toBe(crept);
		vi.advanceTimersByTime(SECOND);
		expect(progress.value).toBeGreaterThanOrEqual(crept);
	});

	it('keeps its words when a step brings none', () => {
		const progress = new Progress();
		progress.start('Printing 24 pages', 85);
		progress.reach(50, 85);
		expect(progress.label).toBe('Printing 24 pages');
	});

	it('reads 100 only when the file is saved, then goes away', () => {
		const progress = new Progress();
		progress.start('Getting the pages ready', 25);
		progress.reach(95, 99, 'Saving the file');
		vi.advanceTimersByTime(600 * SECOND);
		expect(progress.percent).toBe(98);

		progress.finish('PDF downloaded');
		expect(progress.percent).toBe(100);
		expect(progress.label).toBe('PDF downloaded');
		expect(progress.isOpen).toBe(true);
		expect(progress.isBusy).toBe(false);

		vi.advanceTimersByTime(3 * SECOND);
		expect(progress.isOpen).toBe(false);
	});

	it('stays open with the reason when the download fails, and stops moving', () => {
		const progress = new Progress();
		progress.start('Printing 24 pages', 85);
		vi.advanceTimersByTime(5 * SECOND);
		const again = vi.fn();
		progress.fail('No connection. Check your signal and try again.', again);
		const stopped = progress.value;

		vi.advanceTimersByTime(600 * SECOND);
		expect(progress.isOpen).toBe(true);
		expect(progress.isBusy).toBe(false);
		expect(progress.problem).toBe('No connection. Check your signal and try again.');
		expect(progress.value).toBe(stopped);

		progress.retry();
		expect(again).toHaveBeenCalledOnce();
	});

	it('starts clean after a failure', () => {
		const progress = new Progress();
		progress.start('Printing', 85);
		vi.advanceTimersByTime(30 * SECOND);
		progress.fail('Printing took too long. Try again.', () => undefined);

		progress.start('Getting the pages ready', 25);
		expect(progress.problem).toBe('');
		expect(progress.percent).toBe(0);
		expect(progress.isBusy).toBe(true);
	});

	it('closes when the person closes it', () => {
		const progress = new Progress();
		progress.start('Printing', 85);
		progress.fail('Printing took too long. Try again.', () => undefined);
		progress.close();
		expect(progress.isOpen).toBe(false);
		expect(progress.problem).toBe('');
	});

	it('does not go away after a second download started inside the first one’s goodbye', () => {
		const progress = new Progress();
		progress.start('a', 25);
		progress.finish('PDF downloaded');
		vi.advanceTimersByTime(SECOND);
		progress.start('Getting the pages ready', 25);
		vi.advanceTimersByTime(10 * SECOND);
		expect(progress.isOpen).toBe(true);
	});
});
