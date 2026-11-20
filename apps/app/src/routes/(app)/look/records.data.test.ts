import { describe, expect, it } from 'vite-plus/test';
import { createPanels, groupOf, type ProjectType } from './look.data';
import { LookState } from './look.state.svelte';
import { customerOf, locationOf, projectPhotosOf } from './records.data';

// Each test names a customer of its own: an edited customer is also kept in the pack every LookState reads.
describe('locationOf', () => {
	it("is the customer's own location, and follows an edit to it", () => {
		const look = new LookState();
		look.setCustomer('Gulf Projects', { city: 'Houston, TX' });

		expect(locationOf(customerOf(look, 'Gulf Projects'))).toBe('Houston, TX');

		look.setCustomer('Gulf Projects', { city: 'Katy, TX' });

		expect(locationOf(customerOf(look, 'Gulf Projects'))).toBe('Katy, TX');
	});

	it('is the address as typed when no location is picked', () => {
		const look = new LookState();
		look.setCustomer('Bay Forwarding', { city: '', address: '1 Main St, Houston, TX 77002' });

		expect(locationOf(customerOf(look, 'Bay Forwarding'))).toBe('1 Main St, Houston, TX 77002');
	});

	it('is nothing for a customer with neither, and for no customer at all', () => {
		const look = new LookState();
		look.setCustomer('Coast Cargo', { city: ' ' });

		expect(locationOf(customerOf(look, 'Coast Cargo'))).toBe('');
		expect(locationOf(customerOf(look, ''))).toBe('');
	});
});

// The photos the sliders on a project's page and card show (#250; Justin, 2026-11-20: "it's only showing 10
// photos, but I know for a fact that I have uploaded 31").
describe('projectPhotosOf', () => {
	const project = { id: 'p1', title: 'MSC Susanna', team: [], stops: [] } as unknown as ProjectType;

	// A project whose photo panels, all switched on, each hold stages of `sizes` photos, numbered in order across
	// the project.
	function open(sizes: number[]) {
		const look = new LookState();
		const panels = createPanels(project);
		let number = 0;
		for (const panel of panels.filter((item) => item.kind === 'photos')) {
			panel.isEnabled = true;
			panel.groups = sizes.map((size) => ({
				...groupOf('Stage'),
				photos: Array.from({ length: size }, () => {
					number += 1;
					return { id: `photo-${number}`, src: `/files/${number}`, description: '' };
				})
			}));
		}
		look.workspaces[project.id] = panels;
		return { look, panels, total: number };
	}

	it('is every photo, however many, in the order the panels and stages hold them', () => {
		const { look, total } = open([6, 6, 6, 6, 6, 6]);

		const photos = projectPhotosOf(look, project);

		expect(total).toBeGreaterThan(36);
		expect(photos).toHaveLength(total);
		expect(photos.map((photo) => photo.id)).toEqual(
			Array.from({ length: total }, (_, index) => `photo-${index + 1}`)
		);
	});

	it('leaves out the photos of a switched-off panel', () => {
		const { look, panels, total } = open([6, 6]);
		const off = panels.find((panel) => panel.kind === 'photos')!;
		off.isEnabled = false;

		expect(projectPhotosOf(look, project)).toHaveLength(total - 12);
	});

	it('is nothing for a project that has not opened yet', () => {
		expect(projectPhotosOf(new LookState(), project)).toEqual([]);
	});
});
