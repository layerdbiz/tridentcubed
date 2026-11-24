import { describe, expect, it } from 'vite-plus/test';
import { toGeneratedClass, toGeneratedState } from './field.svelte.ts';

describe('toGeneratedState', () => {
	it("shows the app's value while the input's own is empty", () => {
		expect(toGeneratedState('', 'NMT-2026-10-27-J01')).toEqual({
			shown: 'NMT-2026-10-27-J01',
			isGenerated: true,
			isTyped: false
		});
		expect(toGeneratedState(undefined, '1').shown).toBe('1');
		expect(toGeneratedState('   ', '1').isGenerated).toBe(true);
	});

	it('shows what was typed over it', () => {
		expect(toGeneratedState('2', '1')).toEqual({ shown: '2', isGenerated: false, isTyped: true });
	});

	it("counts a value equal to the app's as the app's", () => {
		expect(toGeneratedState('1', '1')).toEqual({ shown: '1', isGenerated: true, isTyped: false });
	});

	it('leaves an input without a Generated value alone', () => {
		expect(toGeneratedState('Title', undefined)).toEqual({
			shown: 'Title',
			isGenerated: false,
			isTyped: false
		});
		expect(toGeneratedState(null).shown).toBe('');
	});

	it('names the fieldset class for each state', () => {
		expect(toGeneratedClass(toGeneratedState('', 'a'))).toBe('field-generated');
		expect(toGeneratedClass(toGeneratedState('b', 'a'))).toBe('field-typed');
		expect(toGeneratedClass(toGeneratedState('b'))).toBe('');
	});
});
