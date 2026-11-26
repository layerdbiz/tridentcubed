import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { createTranslator, hasTranslator } from './translator';

function withTranslator(api: unknown) {
	vi.stubGlobal('Translator', api);
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe('whether the browser translates by itself', () => {
	it('is not when the browser has no translator, as on a phone or in Safari', async () => {
		expect(await hasTranslator()).toBe(false);
	});

	it('is when the browser can, or can once it fetches its Spanish to English pack', async () => {
		withTranslator({ availability: async () => 'downloadable' });
		expect(await hasTranslator()).toBe(true);

		withTranslator({ availability: async () => 'unavailable' });
		expect(await hasTranslator()).toBe(false);
	});

	it('is not when the browser never answers', async () => {
		vi.useFakeTimers();
		withTranslator({ availability: () => new Promise(() => {}) });
		const answer = hasTranslator();
		await vi.advanceTimersByTimeAsync(3000);

		expect(await answer).toBe(false);
	});
});

describe('the browser’s translator', () => {
	it('puts Spanish into English and says how much of its pack has come', async () => {
		const shares: number[] = [];
		withTranslator({
			async create(options: { monitor: (monitor: EventTarget) => void }) {
				const monitor = new EventTarget();
				options.monitor(monitor);
				monitor.dispatchEvent(Object.assign(new Event('downloadprogress'), { loaded: 0.5 }));
				return { translate: async (text: string) => (text === 'Hola' ? 'Hello' : text) };
			}
		});
		const translate = await createTranslator((share) => shares.push(share));

		expect(await translate('Hola')).toBe('Hello');
		expect(shares).toEqual([0.5]);
	});
});
