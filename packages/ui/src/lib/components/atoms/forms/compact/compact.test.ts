import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import Compact from './compact.svelte';

// A list's heading row, whose words name the fields under them.
function heading(...words: [id: string, text: string][]): void {
	for (const [id, text] of words) {
		const span = document.createElement('span');
		span.id = id;
		span.textContent = text;
		document.body.append(span);
	}
}

// Props with a bound value: a getter and a setter, as a `bind:value` hands a component.
function bound(props: Record<string, unknown>, start: string) {
	const box = { value: start };
	Object.defineProperty(props, 'value', {
		enumerable: true,
		configurable: true,
		get: () => box.value,
		set: (text: string) => {
			box.value = text;
		}
	});
	return { props, box };
}

describe('Compact', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('is named by its list’s heading row, with no label of its own', () => {
		heading(['items-quantity', 'Quantity'], ['item-3', 'of item 3']);
		render(Compact, { props: { labelledby: 'items-quantity item-3', value: '4' } });

		const input = screen.getByRole('textbox', { name: 'Quantity of item 3' }) as HTMLInputElement;
		expect(input.value).toBe('4');
		expect(input.closest('fieldset')).toBeNull();
		expect(document.querySelector('legend, label')).toBeNull();
	});

	it('is named by its own words when no heading names it', () => {
		render(Compact, { props: { label: 'Activity', value: '' } });

		expect(screen.getByRole('textbox', { name: 'Activity' })).toBeTruthy();
	});

	it('gives what is typed to its owner', async () => {
		const { props, box } = bound({ label: 'Description' }, 'Crates');
		render(Compact, { props });

		await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'Accessory crates' } });
		expect(box.value).toBe('Accessory crates');
	});

	it('hands the input its attributes and events: a paste, a change, a mark for the app', async () => {
		const onpaste = vi.fn();
		const onchange = vi.fn();
		render(Compact, {
			props: {
				label: 'Time',
				value: '',
				inputmode: 'numeric',
				maxlength: 5,
				placeholder: '07:30',
				class: 'w-20!',
				'data-input': 'Time',
				onpaste,
				onchange
			}
		});

		const input = screen.getByRole('textbox', { name: 'Time' }) as HTMLInputElement;
		expect(input.inputMode).toBe('numeric');
		expect(input.maxLength).toBe(5);
		expect(input.placeholder).toBe('07:30');
		expect(input.dataset.input).toBe('Time');
		expect(input.classList.contains('field-compact')).toBe(true);
		expect(input.classList.contains('w-20!')).toBe(true);
		await fireEvent.paste(input);
		await fireEvent.change(input, { target: { value: '730' } });
		expect(onpaste).toHaveBeenCalledOnce();
		expect(onchange).toHaveBeenCalledOnce();
	});

	// Built on the base component (Justin, 2026-11-26), its look is set from outside, and it is still one input.
	it('wears the notched box look, and the look it is given from outside, on its one input', () => {
		const { container } = render(Compact, {
			props: { label: 'Qty', value: '', lite: true, neutral: true, class: 'w-20!' }
		});

		const input = screen.getByRole('textbox', { name: 'Qty' });
		expect(container.children).toHaveLength(1);
		expect(input.className).toContain('field-compact');
		expect(input.className).toContain('theme-lite-neutral');
		expect(input.className).toContain('w-20!');
	});
});
