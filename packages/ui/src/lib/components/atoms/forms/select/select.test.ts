import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vite-plus/test';
import Select from './select.svelte';

describe('Select', () => {
	it('puts a ? after its label', () => {
		render(Select, {
			props: {
				label: 'Project Type',
				options: [{ label: 'Cargo', value: 'Cargo' }],
				value: 'Cargo',
				help: 'The kind of survey.'
			}
		});

		expect(screen.getByRole('button', { name: 'What goes in Project Type?' })).toBeTruthy();
	});
});
