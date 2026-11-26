// A Toast (glossary, #293): a short message, or the work under way with what is happening, a percent and a bar; a
// failure keeps it open with the reason, Try Again and Close.
import { fireEvent, render, screen } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import Toast from './toast.svelte';
import { Progress } from './toast.svelte.ts';

// jsdom has no Web Animations, which the toast's slide in plays on: each one finishes as soon as it starts.
beforeAll(() => {
	if ('animate' in Element.prototype) return;
	Object.defineProperty(Element.prototype, 'animate', {
		configurable: true,
		value() {
			return {
				cancel() {},
				currentTime: 0,
				playState: 'finished',
				set onfinish(done: (() => void) | null) {
					done?.();
				}
			} as unknown as Animation;
		}
	});
});

describe('Toast', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows nothing until its work starts', () => {
		render(Toast, { props: { progress: new Progress(), label: 'Download PDF' } });
		expect(screen.queryByRole('status')).toBeNull();
	});

	it('shows what is happening, a percent and a bar named for the work', () => {
		const progress = new Progress();
		render(Toast, { props: { progress, label: 'Download PDF' } });

		progress.start('Getting the pages ready', 25);
		progress.reach(20, 25, 'Preparing page 4 of 5');
		flushSync();

		const toast = screen.getByRole('status');
		expect(toast.textContent).toContain('Preparing page 4 of 5');
		expect(toast.textContent).toContain('20%');
		const bar = screen.getByRole('progressbar', { name: 'Download PDF' });
		expect(bar.getAttribute('aria-valuenow')).toBe('20');
	});

	it('stays open on a failure with the reason, Try Again and Close', async () => {
		const progress = new Progress();
		const again = vi.fn();
		render(Toast, { props: { progress, label: 'Download PDF' } });
		progress.start('Printing 24 pages', 85);
		progress.fail('No connection. Check your signal and try again.', again);
		flushSync();

		expect(screen.getByRole('status').textContent).toContain(
			'No connection. Check your signal and try again.'
		);
		expect(screen.queryByRole('progressbar')).toBeNull();

		await fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
		expect(again).toHaveBeenCalledOnce();

		await fireEvent.click(screen.getByRole('button', { name: 'Close' }));
		expect(progress.isOpen).toBe(false);
	});

	it('shows a short message while it has one', () => {
		render(Toast, { props: { text: '3 photos added' } });
		expect(screen.getByRole('status').textContent).toBe('3 photos added');
	});

	it('shows nothing for an empty message', () => {
		render(Toast, { props: { text: '' } });
		expect(screen.queryByRole('status')).toBeNull();
	});

	// #305: what keeps a percent under 100%, each entry opening its input.
	it('lists things under its message, each one a tap that does what it says', async () => {
		const open = vi.fn();
		render(Toast, {
			props: {
				text: '2 empty inputs in the Project panel',
				items: [
					{ label: 'Team Lead, Project panel', onclick: () => open('lead') },
					{ label: 'Team Assigned, Project panel', onclick: () => open('assigned') }
				]
			}
		});

		expect(screen.getByRole('status').textContent).toContain('2 empty inputs in the Project panel');
		await fireEvent.click(screen.getByRole('button', { name: 'Team Assigned, Project panel' }));
		expect(open).toHaveBeenCalledWith('assigned');
	});

	it('stays with its list until it is closed: it does not go by itself', async () => {
		const close = vi.fn();
		render(Toast, {
			props: {
				text: '1 empty input in the Items panel',
				items: [{ label: 'Quantity, Items panel', onclick: () => undefined }],
				onclose: close
			}
		});

		vi.advanceTimersByTime(60_000);
		expect(screen.getByRole('status')).not.toBeNull();
		await fireEvent.click(screen.getByRole('button', { name: 'Close' }));
		expect(close).toHaveBeenCalledOnce();
	});

	it('shows nothing once its list is empty', () => {
		render(Toast, { props: { text: 'Nothing left', items: [], onclose: () => undefined } });
		expect(screen.queryByRole('status')).toBeNull();
	});

	it("takes its look from outside on its box, the theme's secondary until it is given one", () => {
		const plain = render(Toast, { props: { text: '3 photos added' } });
		expect(screen.getByRole('status').className).toContain('bg-secondary');
		plain.unmount();

		render(Toast, { props: { text: '3 photos added', color: 'accent', appearance: 'heavy' } });
		const toast = screen.getByRole('status');
		expect(toast.className).toContain('theme-heavy-accent');
		expect(toast.className).not.toContain('bg-secondary');
	});

	it('hands its Close and Try Again any Button prop', async () => {
		const progress = new Progress();
		render(Toast, {
			props: {
				progress,
				label: 'Download PDF',
				closeButton: { class: 'my-close' },
				retryButton: { label: 'Again' }
			}
		});
		progress.start('Getting the pages ready', 25);
		progress.fail('The server is busy', () => {});
		flushSync();

		const close = screen.getByRole('button', { name: 'Close' });
		expect(close.className).toContain('my-close');
		expect(close.className).not.toContain('text-current/70');
		expect(screen.getByRole('button', { name: 'Again' })).not.toBeNull();
	});

	it('shows an icon before its message, the library Icon', () => {
		render(Toast, {
			props: { text: 'New version, tap to update', icon: 'icon-[mdi--arrow-up-circle-outline]' }
		});
		const toast = screen.getByRole('status');
		const icon = toast.querySelector('.icon-\\[mdi--arrow-up-circle-outline\\]');

		expect(icon).not.toBeNull();
		expect(icon?.getAttribute('aria-hidden')).toBe('true');
		expect(toast.textContent?.trim()).toBe('New version, tap to update');
		expect(toast.className).toContain('items-center');
	});

	it('is a tap when given one: the whole toast is a button that runs it, and takes taps', async () => {
		const onclick = vi.fn();
		render(Toast, { props: { text: 'New version, tap to update', onclick } });
		const button = screen.getByRole('button', { name: 'New version, tap to update' });

		expect(button.className).toContain('pointer-events-auto');
		expect(button.className).toContain('bg-secondary');
		await fireEvent.click(button);
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('does nothing on a tap while it is disabled, and lets taps through to the page', async () => {
		const onclick = vi.fn();
		render(Toast, { props: { text: 'Will update once saved', onclick, disabled: true } });
		const button = screen.getByRole('button', { name: 'Will update once saved' });

		expect(button.hasAttribute('disabled')).toBe(true);
		expect(button.className).not.toContain('pointer-events-auto');
		await fireEvent.click(button);
		expect(onclick).not.toHaveBeenCalled();
	});

	it('keeps a tap toast in a status region that stays while it is hidden, so it is heard as it shows', async () => {
		const shown = render(Toast, { props: { text: '', onclick: () => undefined } });
		const region = screen.getByRole('status');

		expect(region.getAttribute('aria-live')).toBe('polite');
		expect(region.childElementCount).toBe(0);
		expect(screen.queryByRole('button')).toBeNull();

		await shown.rerender({ text: 'New version, tap to update', onclick: () => undefined });

		expect(screen.getByRole('status')).toBe(region);
		expect(region.querySelector('button')?.textContent?.trim()).toBe('New version, tap to update');
	});
});
