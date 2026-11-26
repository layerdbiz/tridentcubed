// The Organization settings' Edit on the library's inputs (#377): every text field the notched field with its ?, as
// the Project panel's are (#57), while typing keeps saving as it did, the name follows into the projects through
// `nameOrganization`, and the disclaimer's points are still added, changed and deleted.
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vite-plus/test';
import { toState } from '../../../test-state.svelte';
import type { LookState } from './look.state.svelte';
import SettingsPage from './settings-page.svelte';

// The organization as the seed starts it, cut short: two points are enough to tell one from the other.
function organizationOf() {
	return {
		id: 'o1',
		detailsId: 'd1',
		name: 'Trident Cubed',
		logo: '',
		address: '800 Town and Country, Houston, TX 77024',
		phone: '+1 409 543 2725',
		email: 'operations@example.com',
		groupEmail: 'group@example.com',
		website: 'example.com',
		closing: 'Thank you for trusting us.',
		signoff: 'Best Regards,',
		disclaimer: {
			opening: 'This report is prepared on what was seen.',
			points: [
				{ id: 'p1', title: 'Scope Limitation', text: 'Nothing was taken apart.' },
				{ id: 'p2', title: 'No Warranty', text: 'This is not a warranty.' }
			],
			note: 'It reflects the day of the inspection.'
		}
	};
}

// The app's state as far as the Organization screen reads it, on its Edit, with no project open.
function lookOf(isEditable: boolean) {
	const look = toState({
		organization: organizationOf(),
		isOrganizationEditable: isEditable,
		project: undefined,
		tab: 'edit',
		tabProgress: 1,
		places: [],
		sync: { state: 'saved', reason: '' },
		isSaveSheetOpen: false,
		helpOf: (key: string) => `Help for ${key}.`,
		placeOf: () => undefined,
		keepPlace: vi.fn(),
		variant: () => 'A',
		home: vi.fn(),
		flash: vi.fn(),
		confirm: vi.fn(),
		nameOrganization: vi.fn()
	});
	look.nameOrganization = vi.fn((name: string) => {
		look.organization.name = name;
	});
	return look as unknown as LookState & {
		flash: ReturnType<typeof vi.fn>;
		confirm: ReturnType<typeof vi.fn>;
		nameOrganization: ReturnType<typeof vi.fn>;
	};
}

function show(isEditable = true) {
	const look = lookOf(isEditable);
	const view = render(SettingsPage, { props: { look, isWide: false } });
	return { ...view, look };
}

async function openSection(name: string) {
	await fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}\\b`) }));
}

async function showAll(isEditable = true) {
	const view = show(isEditable);
	await openSection('Disclaimer');
	await openSection('Sign-off');
	return view;
}

function fieldOf(name: string | RegExp) {
	return screen.getByRole('textbox', { name }) as HTMLInputElement | HTMLTextAreaElement;
}

// The disclaimer points' Title and Text fields, in order.
function pointFields() {
	return {
		titles: screen.getAllByRole('textbox', { name: /title$/i }) as HTMLInputElement[],
		texts: screen.getAllByRole('textbox', { name: /text$/i }) as HTMLTextAreaElement[]
	};
}

const TEXT_FIELDS = [
	'Name',
	'Phone',
	'Email',
	'Group Email',
	'Website',
	'Opening',
	'Closing Note',
	'Thank-you Line',
	'Sign-off'
];

describe('the Organization settings', () => {
	it('draws every text field on the library’s field, with its ?', async () => {
		await showAll();

		for (const name of TEXT_FIELDS) {
			expect(fieldOf(name).closest('fieldset.field'), name).toBeTruthy();
			expect(screen.getByRole('button', { name: `What goes in ${name}?` })).toBeTruthy();
		}
		const { titles, texts } = pointFields();
		for (const field of [...titles, ...texts]) expect(field.closest('fieldset.field')).toBeTruthy();
		expect(screen.getAllByRole('button', { name: 'What goes in Title?' })).toHaveLength(2);
		expect(screen.getAllByRole('button', { name: 'What goes in Text?' })).toHaveLength(2);
	});

	it('renames the organization as its name is typed, so the projects follow', async () => {
		const { look } = await showAll();

		await fireEvent.input(fieldOf('Name'), { target: { value: 'Trident Cubed LLC' } });

		expect(look.nameOrganization).toHaveBeenLastCalledWith('Trident Cubed LLC');
		expect(look.organization.name).toBe('Trident Cubed LLC');
	});

	it('keeps every other detail and wording as it is typed, and says it is saving', async () => {
		const { look } = await showAll();
		const typed: [string, string][] = [
			['Phone', '+1 713 555 0100'],
			['Email', 'ops@example.com'],
			['Group Email', 'team@example.com'],
			['Website', 'example.org'],
			['Opening', 'A new opening.'],
			['Closing Note', 'A new note.'],
			['Thank-you Line', 'Thanks.'],
			['Sign-off', 'Kind regards,']
		];

		for (const [name, value] of typed) {
			look.flash.mockClear();
			await fireEvent.input(fieldOf(name), { target: { value } });
			expect(look.flash, name).toHaveBeenCalled();
		}

		const { organization } = look;
		expect([
			organization.phone,
			organization.email,
			organization.groupEmail,
			organization.website,
			organization.disclaimer.opening,
			organization.disclaimer.note,
			organization.closing,
			organization.signoff
		]).toEqual(typed.map(([, value]) => value));
	});

	it('changes a disclaimer point’s title and text as they are typed', async () => {
		const { look } = await showAll();

		await fireEvent.input(pointFields().titles[1], { target: { value: 'No Guarantee' } });
		await fireEvent.input(pointFields().texts[1], { target: { value: 'Nothing is promised.' } });

		expect(look.organization.disclaimer.points[1]).toMatchObject({
			id: 'p2',
			title: 'No Guarantee',
			text: 'Nothing is promised.'
		});
		expect(look.organization.disclaimer.points[0].title).toBe('Scope Limitation');
		expect(look.flash).toHaveBeenCalled();
	});

	it('adds an empty point with its own fields, and deletes one once asked', async () => {
		const { look } = await showAll();

		await fireEvent.click(screen.getByRole('button', { name: 'Add Point' }));

		expect(look.organization.disclaimer.points).toHaveLength(3);
		expect(look.organization.disclaimer.points[2]).toMatchObject({ title: '', text: '' });
		expect(pointFields().titles).toHaveLength(3);

		await fireEvent.click(screen.getByRole('button', { name: 'Delete point 1' }));
		expect(look.confirm).toHaveBeenCalledOnce();
		look.confirm.mock.calls[0][0].onyes();

		expect(look.organization.disclaimer.points.map((point) => point.id)).not.toContain('p1');
		expect(look.organization.disclaimer.points).toHaveLength(2);
	});

	it('shows Team every field and lets them change none', async () => {
		await showAll(false);

		for (const name of TEXT_FIELDS) expect(fieldOf(name).matches(':disabled'), name).toBe(true);
		const { titles, texts } = pointFields();
		for (const field of [...titles, ...texts]) expect(field.matches(':disabled')).toBe(true);
		expect(screen.queryByRole('button', { name: 'Add Point' })).toBeNull();
	});
});
