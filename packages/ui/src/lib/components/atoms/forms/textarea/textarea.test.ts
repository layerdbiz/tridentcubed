import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vite-plus/test';
import Textarea from './textarea.svelte';

describe('Textarea', () => {
	it('is named by its label, which sits apart from it on the border', () => {
		render(Textarea, { props: { label: 'Description', value: '' } });

		expect(screen.getByRole('textbox', { name: 'Description' })).toBeTruthy();
	});

	it("shows the app's sentence and its ?, and a reset once reworded", async () => {
		render(Textarea, {
			props: {
				label: 'Description',
				value: 'Typed words.',
				generated: 'The worked-out sentence.',
				help: "The report's opening sentence."
			}
		});

		const area = screen.getByRole('textbox') as HTMLTextAreaElement;
		expect(area.value).toBe('Typed words.');
		expect(screen.getByRole('button', { name: 'What goes in Description?' })).toBeTruthy();

		await fireEvent.click(screen.getByRole('button', { name: "Bring back the app's Description" }));
		expect(area.value).toBe('The worked-out sentence.');
		expect(area.closest('fieldset')?.classList.contains('field-generated')).toBe(true);
	});

	// The box is as tall as the textarea in it, which grows with its words: a height copied onto the box by script
	// lagged behind and let the words run out of it (#394).
	it('leaves its box to grow with the textarea, with no height set by script', () => {
		render(Textarea, { props: { label: 'Description', value: 'One line.\nTwo lines.' } });

		const box = screen.getByRole('textbox').closest('fieldset') as HTMLFieldSetElement;
		expect(box.style.getPropertyValue('--input-height')).toBe('');
		expect(box.style.height).toBe('');
	});
});
