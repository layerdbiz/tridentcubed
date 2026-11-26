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
	'unstyled disabled': {
		tag: 'button',
		unstyled: true,
		disabled: true,
		type: 'button',
		label: 'Go'
	},
	link: { tag: 'a', href: '/x', disabled: true, label: 'Link' },
	override: { component: own, class: 'mine', ghost: true },
	position: { position: 'center', size: 'lg', label: 'Middle' },
	'ghost invert': { ghost: true, invert: true, accent: true, xs: true },
	'glass gradient': { glass: true, gradient: true, class: 'x' },
	'size shorthand': { xxl: true, xxs: true, neutral: true },
	attributes: {
		tag: 'span',
		'aria-label': 'Count',
		title: '3 projects',
		style: 'min-width: 16px;',
		id: 'n'
	}
};

// Every colour in every appearance, as props and as shorthands: the light path builds its classes in one pass now
// (#381), and must still give exactly what Root gives.
for (const color of ['base', 'neutral', 'primary', 'secondary', 'accent', 'danger']) {
	for (const appearance of ['heavy', 'lite', 'outline', 'ghost', 'glass', 'gradient']) {
		CASES[`${color} ${appearance}`] = { color, appearance, label: 'x' };
		CASES[`${color} ${appearance} shorthands`] = {
			[color]: true,
			[appearance]: true,
			class: 'mine',
			label: 'x'
		};
	}
}

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

	// #402: an unstyled button told it is disabled is disabled, as a styled one is; it lost the attribute before.
	it('keeps a button disabled when it is unstyled', () => {
		const { container } = render(Component, {
			props: { tag: 'button', unstyled: true, disabled: true, type: 'button', label: 'Go' }
		});

		expect(container.querySelector('button')?.disabled).toBe(true);
	});

	it('still lays out through Root when asked for layout', () => {
		const { container } = render(Component, {
			props: { grid: 'rails', rails: 'content', children: words }
		});

		expect(container.innerHTML).toContain('is-rails');
	});
});
