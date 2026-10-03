import { flushSync } from 'svelte';
import { describe, expect, it } from 'vite-plus/test';
import { ThemeManager } from './theme.svelte.ts';

describe('ThemeManager', () => {
	it('drives derived state and effects as the theme changes', () => {
		const seen: string[] = [];

		const cleanup = $effect.root(() => {
			const manager = new ThemeManager('dracula, retro');
			const label = $derived(manager.current.toUpperCase());

			$effect(() => {
				seen.push(label);
			});
			flushSync();

			manager.setTheme('retro');
			flushSync();

			// Unknown themes are ignored, so no effect runs
			manager.setTheme('unknown');
			flushSync();

			// Cycles from the last theme back to the first
			manager.next();
			flushSync();
		});
		cleanup();

		expect(seen).toEqual(['DEFAULT', 'RETRO', 'DEFAULT']);
		expect(document.documentElement.getAttribute('data-theme')).toBe('default');
	});
});
