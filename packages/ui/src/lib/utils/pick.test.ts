// The keys that move along a row of tabs or a pick-one group (#382).
import { describe, expect, it } from 'vite-plus/test';
import { toPickedIndex } from './pick.ts';

describe('toPickedIndex', () => {
	it('moves to the next and the previous option with Right and Left, round the ends', () => {
		expect(toPickedIndex('ArrowRight', 0, 3, 'tab')).toBe(1);
		expect(toPickedIndex('ArrowRight', 2, 3, 'tab')).toBe(0);
		expect(toPickedIndex('ArrowLeft', 1, 3, 'radio')).toBe(0);
		expect(toPickedIndex('ArrowLeft', 0, 3, 'radio')).toBe(2);
	});

	it('goes to the first and the last with Home and End', () => {
		expect(toPickedIndex('Home', 2, 3, 'tab')).toBe(0);
		expect(toPickedIndex('End', 0, 3, 'radio')).toBe(2);
	});

	it('moves a radio group with Up and Down too, but leaves Up and Down to the page in a row of tabs', () => {
		expect(toPickedIndex('ArrowDown', 0, 3, 'radio')).toBe(1);
		expect(toPickedIndex('ArrowUp', 0, 3, 'radio')).toBe(2);
		expect(toPickedIndex('ArrowDown', 0, 3, 'tab')).toBeUndefined();
		expect(toPickedIndex('ArrowUp', 1, 3, 'tab')).toBeUndefined();
	});

	it('moves nowhere for any other key, or in an empty row', () => {
		expect(toPickedIndex('a', 0, 3, 'tab')).toBeUndefined();
		expect(toPickedIndex('Enter', 0, 3, 'radio')).toBeUndefined();
		expect(toPickedIndex('ArrowRight', 0, 0, 'tab')).toBeUndefined();
	});
});
