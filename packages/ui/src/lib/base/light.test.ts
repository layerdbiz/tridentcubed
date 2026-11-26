// When a base component can take the light path, and what its element is given there (Justin, 2026-11-26).
import { describe, expect, it } from 'vite-plus/test';
import { isLightRequest, toLightRootProps, toPlainProps } from './light.ts';

describe('isLightRequest', () => {
	it('is light with only styling props and attributes', () => {
		expect(
			isLightRequest({ tag: 'span', lite: true, class: 'x', title: 'y', top: undefined })
		).toBe(true);
	});

	it('is not light with any layout, base prop or bound value', () => {
		for (const props of [
			{ grid: 'rails' },
			{ rail: 'content' },
			{ gap: '1rem' },
			{ left: () => {} },
			{ debug: true },
			{ observe: true },
			{ scroll: true },
			{ persist: true },
			{ total: 3 },
			{ snippets: { a1: {} } },
			{ tag: 'input' },
			{ tag: 'select' }
		]) {
			expect(isLightRequest(props)).toBe(false);
		}
	});
});

describe('toLightRootProps', () => {
	it("turns the styling props into theme classes, the caller's class last, and keeps the attributes", () => {
		const props = toLightRootProps({
			lite: true,
			primary: true,
			sm: true,
			class: 'mine',
			title: 'Hi',
			label: 'x'
		});

		expect(props.class).toBe('theme-lite-primary sm mine');
		expect(props.title).toBe('Hi');
		expect('label' in props).toBe(false);
		expect('lite' in props).toBe(false);
	});
});

describe('toPlainProps', () => {
	it('reads every prop once into a plain object, attachments too', () => {
		const key = Symbol('attachment');
		const reads: PropertyKey[] = [];
		const props = new Proxy({ a: 1, b: 'x', [key]: 'y' } as Record<PropertyKey, unknown>, {
			get(target, name) {
				reads.push(name);
				return target[name];
			}
		});

		const plain = toPlainProps(props);

		expect(plain).toEqual({ a: 1, b: 'x', [key]: 'y' });
		expect(reads).toEqual(['a', 'b', key]);
	});
});
