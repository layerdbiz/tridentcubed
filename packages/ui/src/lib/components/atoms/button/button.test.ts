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

	// The app's red buttons (#384, Justin's picks): danger is a colour like the others, as a prop or a shorthand, and
	// never reaches the element as an attribute.
	it('takes the danger colour as color="danger" or the danger shorthand', () => {
		render(Button, { props: { label: 'Delete', color: 'danger', appearance: 'lite' } });
		render(Button, { props: { label: 'Remove', danger: true, ghost: true } });

		const del = screen.getByRole('button', { name: 'Delete' });
		const remove = screen.getByRole('button', { name: 'Remove' });
		expect(del.className).toContain('theme-lite-danger');
		expect(remove.className).toContain('theme-ghost-danger');
		expect(remove.hasAttribute('danger')).toBe(false);
	});

	it('draws a danger button heavy when no appearance is given', () => {
		render(Button, { props: { label: 'Delete', danger: true } });

		expect(screen.getByRole('button', { name: 'Delete' }).className).toContain(
			'theme-heavy-danger'
		);
	});

	// A full-width button keeps its variant's own alignment (an icon and words sit at the start) unless align says
	// otherwise; align="center" centres them, as the app's Google and Microsoft buttons are.
	it('centres a full-width button only when align="center" is given', () => {
		render(Button, {
			props: { label: 'Google', icon: 'icon-[mdi--google]', width: 'full', align: 'center' }
		});
		render(Button, { props: { label: 'Email', icon: 'icon-[mdi--email]', width: 'full' } });

		expect(screen.getByRole('button', { name: 'Google' }).className).toContain('btn-align-center');
		expect(screen.getByRole('button', { name: 'Email' }).className).not.toContain('btn-align-');
	});

	// A form's submit button tells the server which one was pressed (the app's sign-in: Continue with Google or
	// Microsoft), so its name and value reach the element.
	it('gives a submit button its name and value', () => {
		render(Button, {
			props: { label: 'Google', type: 'submit', name: 'provider', value: 'google' }
		});

		const google = screen.getByRole('button', { name: 'Google' });
		expect(google.getAttribute('type')).toBe('submit');
		expect(google.getAttribute('name')).toBe('provider');
		expect(google.getAttribute('value')).toBe('google');
	});

	it('is disabled when told', () => {
		render(Button, { props: { label: 'Continue', disabled: true } });

		expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(
			true
		);
	});
});
