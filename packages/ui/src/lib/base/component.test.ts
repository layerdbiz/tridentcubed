// The base component's light path (Justin, 2026-11-26: every library component is on the base component, an avatar
// in every list row too). A component that asks for no layout and none of the base props is drawn without Root; these
// pin that it is drawn exactly as Root would draw it, and that anything else still goes through Root.
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { createAttachmentKey } from 'svelte/attachments';
import { describe, expect, it } from 'vite-plus/test';
import Component from './component.svelte';
import Rooted from './rooted.svelte';

const words = createRawSnippet(() => ({ render: () => '<b>Words</b>' }));
const own = createRawSnippet((args: () => { props: Record<string, unknown> }) => ({
	render: () =>
		`<span class="${String(args().props.class ?? '')}" style="${String(args().props.style ?? '')}">own</span>`
}));

// The elements alone: Svelte's markers between them differ, the page does not.
function drawn(props: Record<string, unknown>, which: typeof Component | typeof Rooted): string {
	const { container, unmount } = render(which, { props });
	const html = container.innerHTML
		.replace(/<!--[^]*?-->/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	unmount();
	return html;
}

const CASES: Record<string, Record<string, unknown>> = {
	bare: {},
	label: { label: 'Hello' },
	children: { children: words },
	look: { tag: 'span', lite: true, primary: true, sm: true, class: 'gap-1', title: 'Look' },
	appearance: { color: 'accent', appearance: 'outline', invert: true },
	unstyled: { unstyled: true, class: 'plain' },
	style: { style: 'color: red', 'data-x': '1', role: 'note' },
	disabled: { tag: 'button', disabled: true, type: 'button', label: 'Go' },
	link: { tag: 'a', href: '/x', disabled: true, label: 'Link' },
	override: { component: own, class: 'mine', ghost: true }
};

describe('Component', () => {
	for (const [name, props] of Object.entries(CASES)) {
		it(`draws "${name}" exactly as Root does`, () => {
			expect(drawn(props, Component)).toBe(drawn(props, Rooted));
		});
	}

	it('hands an attachment on to the element', () => {
		let seen: Element | undefined;
		const key = createAttachmentKey();
		render(Component, {
			props: { [key]: (element: Element) => void (seen = element), tag: 'span' }
		});

		expect(seen?.tagName).toBe('SPAN');
	});

	it('still lays out through Root when asked for layout', () => {
		const { container } = render(Component, {
			props: { grid: 'rails', rails: 'content', children: words }
		});

		expect(container.innerHTML).toContain('is-rails');
	});
});
