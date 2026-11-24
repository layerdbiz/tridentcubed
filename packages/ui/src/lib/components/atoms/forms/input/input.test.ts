import { fireEvent, render, screen } from '@testing-library/svelte';
// jsdom keeps a popover hidden (it has no top layer), so the open help is found with hidden: true.
import { describe, expect, it, vi } from 'vite-plus/test';
import Input from './input.svelte';

function fieldsetOf(element: HTMLElement): HTMLFieldSetElement {
	return element.closest('fieldset') as HTMLFieldSetElement;
}

describe('Input', () => {
	it('puts a ? after its label that opens its Help text', async () => {
		render(Input, { props: { label: 'Title', value: 'A title', help: "The report's name." } });

		const help = screen.getByRole('button', { name: 'What goes in Title?' });
		expect(help.closest('legend')?.textContent).toContain('Title');
		await fireEvent.click(help);
		expect(screen.getByRole('dialog', { name: 'Title', hidden: true }).textContent).toContain(
			"The report's name."
		);
	});

	it('has no ? without Help text', () => {
		render(Input, { props: { label: 'Title' } });

		expect(screen.queryByRole('button', { name: 'What goes in Title?' })).toBeNull();
	});

	it("shows the app's value, marked, while its own is empty", () => {
		render(Input, { props: { label: 'Job Number', value: '', generated: '1' } });

		const input = screen.getByRole('textbox') as HTMLInputElement;
		expect(input.value).toBe('1');
		expect(fieldsetOf(input).classList.contains('field-generated')).toBe(true);
		expect(fieldsetOf(input).classList.contains('field-filled')).toBe(true);
		expect(screen.getByTitle('Made by the app')).toBeTruthy();
		expect(screen.queryByRole('button', { name: "Bring back the app's Job Number" })).toBeNull();
	});

	it('offers a reset once typed over, which brings the app value back', async () => {
		const onreset = vi.fn();
		render(Input, { props: { label: 'Job Number', value: '2', generated: '1', onreset } });

		const input = screen.getByRole('textbox') as HTMLInputElement;
		expect(input.value).toBe('2');
		expect(fieldsetOf(input).classList.contains('field-typed')).toBe(true);

		const reset = screen.getByRole('button', { name: "Bring back the app's Job Number" });
		expect(await fireEvent.mouseDown(reset)).toBe(false);
		await fireEvent.click(reset);
		expect(onreset).toHaveBeenCalledOnce();
		expect(input.value).toBe('1');
		expect(fieldsetOf(input).classList.contains('field-generated')).toBe(true);
	});

	it('keeps an emptied value empty while typing, and the app value returns on leaving', async () => {
		render(Input, { props: { label: 'Job Number', value: '2', generated: '1' } });

		const input = screen.getByRole('textbox') as HTMLInputElement;
		input.focus();
		await fireEvent.input(input, { target: { value: '' } });
		expect(input.value).toBe('');
		await fireEvent.blur(input);
		expect(input.value).toBe('1');
	});
});
