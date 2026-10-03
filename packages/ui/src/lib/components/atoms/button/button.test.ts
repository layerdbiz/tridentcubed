import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vite-plus/test';
import Button from './button.svelte';

describe('Button', () => {
	it('renders its label inside a button element', () => {
		render(Button, { props: { label: 'Save report' } });

		const button = screen.getByRole('button', { name: 'Save report' });
		expect(button.getAttribute('type')).toBe('button');
	});

	it('renders a link when given an href', () => {
		render(Button, { props: { label: 'Open', href: '/projects' } });

		expect(screen.getByRole('link', { name: 'Open' }).getAttribute('href')).toBe('/projects');
	});
});
