import { describe, expect, test } from 'vite-plus/test';
import type { EntryType } from './catalog';
import { toFound, toTree } from './tree';

function entry(path: string[], options: string[] = ['main']): EntryType {
	const slug = path.join('/');
	return {
		kind: 'prototype',
		slug,
		label: slug,
		path,
		href: `/prototype/${slug}`,
		options: options.map((option) => ({
			slug: option,
			label: option.toUpperCase(),
			url: `/${option}.html`
		}))
	};
}

describe('toTree', () => {
	test('follows the folders, each topic opening its page and listing its files', () => {
		const tree = toTree([
			entry(['menus'], ['main', 'grid']),
			entry(['report', 'cover']),
			entry(['kit'])
		]);

		expect(tree.map((node) => node.label)).toEqual(['Kit', 'Menus', 'Report']);
		expect(tree[1]).toMatchObject({
			href: '/prototype/menus',
			files: [
				{ label: 'MAIN', href: '/prototype/menus#v=main' },
				{ label: 'GRID', href: '/prototype/menus#v=grid' }
			]
		});
		expect(tree[2].href).toBeUndefined();
		expect(tree[2].children).toMatchObject([{ label: 'Cover', href: '/prototype/report/cover' }]);
		expect(tree[0].files).toEqual([]);
	});

	test('a page with pages under it is a folder that opens too', () => {
		const tree = toTree([entry(['demo', 'rails']), entry(['demo'])]);
		expect(tree).toMatchObject([
			{ label: 'Demo', href: '/prototype/demo', children: [{ label: 'Rails' }] }
		]);
	});
});

describe('toFound', () => {
	const tree = toTree([
		entry(['menus'], ['main', 'grid']),
		entry(['report', 'cover']),
		entry(['kit'])
	]);

	test('keeps the folders on the way to what matches', () => {
		expect(toFound(tree, 'cov')).toMatchObject([
			{ label: 'Report', children: [{ label: 'Cover' }] }
		]);
		expect(toFound(tree, 'grid')).toMatchObject([{ label: 'Menus', files: [{ label: 'GRID' }] }]);
	});

	test('a matching folder keeps everything in it; no words keep everything', () => {
		expect(toFound(tree, 'menu')[0].files).toHaveLength(2);
		expect(toFound(tree, '  ')).toBe(tree);
	});
});
