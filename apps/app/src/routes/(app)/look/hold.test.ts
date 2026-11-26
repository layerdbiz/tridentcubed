// @vitest-environment jsdom
// No text is selected while something is dragged, but a field being typed in keeps its caret (#404). A finger's
// touch takes the pointer too, so these run on every tap on a phone, the tap from one field into the next included.
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { freeText, holdText } from './hold';

afterEach(() => {
	freeText();
	vi.restoreAllMocks();
	document.body.innerHTML = '';
});

describe('a drag', () => {
	it('takes away the words selected on the page, and selecting, until it lets go', () => {
		document.body.innerHTML = '<p>Discharge started</p>';
		const range = document.createRange();
		range.selectNodeContents(document.querySelector('p')!);
		getSelection()!.addRange(range);

		holdText();
		expect(getSelection()!.rangeCount).toBe(0);
		expect(document.documentElement.classList.contains('select-none')).toBe(true);

		freeText();
		expect(document.documentElement.classList.contains('select-none')).toBe(false);
	});
});

describe('a tap while a field is being typed in', () => {
	// Taking the caret from the field closes an Android phone's keyboard under the finger: the page slides down and
	// the tap lands on whatever slid under it, a day's header or the Time Log's own (Duncan, 2026-11-26).
	it.each([
		['a time', '<input inputmode="numeric" />'],
		['words', '<textarea></textarea>'],
		['a written note', '<div contenteditable="true"></div>']
	])('leaves the caret in a field for %s', (_, html) => {
		document.body.innerHTML = html;
		(document.body.firstElementChild as HTMLElement).focus();
		const clear = vi.spyOn(Selection.prototype, 'removeAllRanges');

		holdText();

		expect(clear).not.toHaveBeenCalled();
	});

	it('still stops words being selected while it is held', () => {
		document.body.innerHTML = '<input />';
		document.querySelector('input')!.focus();

		holdText();

		expect(document.documentElement.classList.contains('select-none')).toBe(true);
	});
});
