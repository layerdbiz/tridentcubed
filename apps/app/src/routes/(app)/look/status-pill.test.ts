// The status pill on a project's Page (#376): it shows the project's status, and a tap opens the library's menu of
// every status in the order a project moves through them, each with its dot and a tick by the one it is now.
// Picking one hands it to the app's own status change, which saves it and says so.
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { ProjectType } from './look.data';
import type { LookState } from './look.state.svelte';
import StatusPill from './status-pill.svelte';

function show(status: ProjectType['status'] = 'Draft') {
	const project = { id: 'p1', title: 'Barge loadout survey', status } as ProjectType;
	const setStatus = vi.fn();
	const look = { setStatus } as unknown as LookState;
	render(StatusPill, { props: { look, project } });
	return { project, setStatus };
}

async function open() {
	await fireEvent.click(screen.getByRole('button', { name: 'Change Status' }));
	return screen.getByRole('listbox', { name: 'Change Status' });
}

describe('the status pill', () => {
	it("shows the project's status", () => {
		show('Review');
		expect(screen.getByRole('button', { name: 'Change Status' }).textContent).toContain('Review');
	});

	it('opens every status in order, with the one it is now ticked', async () => {
		show('Review');
		const list = await open();
		const options = within(list).getAllByRole('option');
		expect(options.map((option) => option.textContent?.trim())).toEqual([
			'Draft',
			'In Progress',
			'Review',
			'Ready',
			'Sent',
			'Revision',
			'Complete',
			'Archived'
		]);
		expect(options.filter((option) => option.getAttribute('aria-selected') === 'true')).toEqual([
			within(list).getByRole('option', { name: 'Review' })
		]);
	});

	it('gives each status its dot', async () => {
		show();
		const list = await open();
		const dot = within(list).getByRole('option', { name: 'Ready' }).querySelector('.rounded-full');
		expect(dot?.className).toContain('bg-teal-500');
	});

	it('changes the status to the one picked, and closes', async () => {
		const { project, setStatus } = show('Draft');
		await open();
		await fireEvent.click(screen.getByRole('option', { name: 'In Progress' }));
		expect(setStatus).toHaveBeenCalledWith(project, 'In Progress');
		expect(screen.queryByRole('listbox')).toBeNull();
	});
});
