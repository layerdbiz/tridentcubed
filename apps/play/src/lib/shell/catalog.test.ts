import { describe, expect, test } from 'vite-plus/test';
import { toEntries, toLabel, toLibrary } from './catalog';

describe('toEntries', () => {
	test('groups the html files of a folder into one entry per topic, Main first', () => {
		const entries = toEntries(
			{
				'/src/prototypes/menus/b.html': '/assets/b.html',
				'/src/prototypes/menus/main.html': '/assets/main.html',
				'/src/prototypes/menus/a.html': '/assets/a.html',
				'/src/prototypes/kit/starter.html': '/assets/starter.html'
			},
			'prototype'
		);

		expect(entries.map((entry) => entry.slug)).toEqual(['kit', 'menus']);
		expect(entries[1]).toMatchObject({
			kind: 'prototype',
			label: 'Menus',
			href: '/prototype/menus'
		});
		expect(entries[1].options.map((option) => option.slug)).toEqual(['main', 'a', 'b']);
		expect(entries[1].options[0]).toEqual({
			slug: 'main',
			label: 'Main',
			url: '/assets/main.html'
		});
	});

	test('reads component folders the same way', () => {
		const [entry] = toEntries(
			{ '/src/components/status-badge/solid.html': '/x.html' },
			'component'
		);

		expect(entry).toMatchObject({
			kind: 'component',
			label: 'Status Badge',
			href: '/component/status-badge'
		});
	});

	test('skips files outside a topic folder', () => {
		expect(toEntries({ '/src/prototypes/loose.html': '/x.html' }, 'prototype')).toEqual([]);
	});

	test('skips names an address cannot carry: only lowercase words joined by hyphens', () => {
		const found = {
			'/src/prototypes/menus/v1.2.html': '/x.html',
			'/src/prototypes/menus/Big Menu.html': '/y.html'
		};
		expect(toEntries(found, 'prototype')).toEqual([]);
	});
});

describe('toLibrary', () => {
	test('lists the play pages that were there before, each opened through the shell', () => {
		const entries = toLibrary([
			'/src/routes/(play)/forms/+page.svelte',
			'/src/routes/(play)/demo/rails-debug/+page.svelte',
			'/src/routes/(mq)/ssr/+page.svelte',
			'/src/routes/(shell)/+page.svelte',
			'/src/routes/(shell)/prototype/[name]/+page.svelte'
		]);

		expect(entries.map((entry) => entry.slug)).toEqual(['demo/rails-debug', 'forms', 'ssr']);
		expect(entries[0]).toMatchObject({
			kind: 'library',
			label: 'Demo: Rails Debug',
			href: '/library/demo/rails-debug',
			options: [{ slug: 'main', label: 'Main', url: '/demo/rails-debug' }]
		});
		expect(entries[2].label).toBe('MQ SSR');
	});
});

describe('toLabel', () => {
	test('reads a slug as words, keeping short names in capitals', () => {
		expect(toLabel('side-menu')).toBe('Side Menu');
		expect(toLabel('crud-vanilla')).toBe('CRUD Vanilla');
	});
});
