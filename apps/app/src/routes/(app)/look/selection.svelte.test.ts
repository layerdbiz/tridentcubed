// Selecting several photos (#402; Justin on #287, 2026-11-24). Holding a photo still starts a selection, or a Ctrl-click
// (Cmd on a Mac) or a Shift-click on a computer; while selecting, a tap adds a photo and a second tap takes it off;
// Shift takes every photo from the last one picked. A selection stays within one panel: a photo of another panel
// starts a new one there. What is checked is what a person sees selected, in the order the photos sit.
import { describe, expect, it } from 'vite-plus/test';
import type { GroupType, PanelType } from './look.data';
import { Selection } from './selection.svelte';

function groupOf(id: string, photos: string[]): GroupType {
	return {
		id,
		title: id,
		description: '',
		layout: 4,
		isEnabled: true,
		photos: photos.map((photo) => ({ id: photo, src: `/files/${photo}`, description: '' }))
	};
}

function panelOf(id: string, groups: GroupType[]) {
	return { id, kind: 'photos', groups } as unknown as PanelType;
}

const OPERATIONS = panelOf('operations', [
	groupOf('loading', ['a', 'b', 'c']),
	groupOf('lashing', ['d', 'e'])
]);
const DAMAGES = panelOf('damages', [groupOf('dent', ['f', 'g'])]);
const PANELS = [OPERATIONS, DAMAGES];

const TAP = { shiftKey: false, ctrlKey: false, metaKey: false };

function picked(selection: Selection) {
	return selection.photosIn(PANELS).map((photo) => photo.id);
}

describe('a selection of photos', () => {
	it('is nothing until a photo is held, and then holds that photo in its panel', () => {
		const selection = new Selection();
		expect(selection.isOn).toBe(false);
		selection.hold(OPERATIONS.id, 'b');
		expect(selection.isOn).toBe(true);
		expect(selection.isIn('operations')).toBe(true);
		expect(selection.isIn('damages')).toBe(false);
		expect(picked(selection)).toEqual(['b']);
	});

	it('opens no photo on a plain tap while nothing is selected', () => {
		const selection = new Selection();
		expect(selection.tap(OPERATIONS, 'a', TAP)).toBe(false);
		expect(selection.isOn).toBe(false);
	});

	it('takes taps once it is on: a tap adds, a second takes off, and the last one off ends it', () => {
		const selection = new Selection();
		selection.hold(OPERATIONS.id, 'b');
		expect(selection.tap(OPERATIONS, 'e', TAP)).toBe(true);
		expect(selection.tap(OPERATIONS, 'a', TAP)).toBe(true);
		// Picked b, e, a: shown in the order they sit.
		expect(picked(selection)).toEqual(['a', 'b', 'e']);
		selection.tap(OPERATIONS, 'b', TAP);
		expect(picked(selection)).toEqual(['a', 'e']);
		selection.tap(OPERATIONS, 'a', TAP);
		selection.tap(OPERATIONS, 'e', TAP);
		expect(selection.isOn).toBe(false);
	});

	it('starts with a Ctrl-click or a Cmd-click on a computer', () => {
		const ctrl = new Selection();
		expect(ctrl.tap(OPERATIONS, 'c', { ...TAP, ctrlKey: true })).toBe(true);
		expect(picked(ctrl)).toEqual(['c']);
		const cmd = new Selection();
		expect(cmd.tap(OPERATIONS, 'd', { ...TAP, metaKey: true })).toBe(true);
		expect(picked(cmd)).toEqual(['d']);
	});

	it('takes every photo of the panel from the last one picked with a Shift-click, across its groups', () => {
		const selection = new Selection();
		selection.tap(OPERATIONS, 'b', { ...TAP, ctrlKey: true });
		expect(selection.tap(OPERATIONS, 'd', { ...TAP, shiftKey: true })).toBe(true);
		expect(picked(selection)).toEqual(['b', 'c', 'd']);
		// Backwards from d, the last picked, it adds what it reaches and keeps the rest.
		selection.tap(OPERATIONS, 'a', { ...TAP, shiftKey: true });
		expect(picked(selection)).toEqual(['a', 'b', 'c', 'd']);
	});

	it('starts with a Shift-click alone, on that one photo', () => {
		const selection = new Selection();
		selection.tap(OPERATIONS, 'c', { ...TAP, shiftKey: true });
		expect(picked(selection)).toEqual(['c']);
	});

	it('stays within one panel: a photo of another panel starts a new selection there', () => {
		const selection = new Selection();
		selection.hold(OPERATIONS.id, 'a');
		selection.tap(OPERATIONS, 'b', TAP);
		// A plain tap on another panel's photo is not a pick: it is a tap elsewhere, which ends the selection there.
		expect(selection.tap(DAMAGES, 'f', TAP)).toBe(false);
		selection.tap(DAMAGES, 'f', { ...TAP, ctrlKey: true });
		expect(selection.isIn('damages')).toBe(true);
		expect(picked(selection)).toEqual(['f']);
		selection.hold(OPERATIONS.id, 'e');
		expect(picked(selection)).toEqual(['e']);
	});

	it('takes a hold while selecting as a slow tap: it adds the photo, and takes off one already selected', () => {
		const selection = new Selection();
		selection.hold(OPERATIONS.id, 'a');
		selection.hold(OPERATIONS.id, 'd');
		expect(selection.ids).toEqual(['a', 'd']);
		selection.hold(OPERATIONS.id, 'd');
		expect(selection.ids).toEqual(['a']);
	});

	it('counts a Shift-click from the last photo still picked, not one just taken off', () => {
		const selection = new Selection();
		selection.hold(OPERATIONS.id, 'b');
		selection.tap(OPERATIONS, 'e', TAP);
		selection.tap(OPERATIONS, 'e', TAP);
		selection.tap(OPERATIONS, 'c', { ...TAP, shiftKey: true });
		expect(picked(selection)).toEqual(['b', 'c']);
	});

	it('ends with nothing selected and no sheet open, leaving open the panel the photos were dragged to', () => {
		const selection = new Selection();
		selection.hold(OPERATIONS.id, 'a');
		selection.sheet = 'move';
		selection.alsoOpen = 'damages';
		selection.end();
		expect(selection.isOn).toBe(false);
		expect(selection.panelId).toBe('');
		expect(selection.sheet).toBe('');
		expect(selection.alsoOpen).toBe('damages');
		expect(picked(selection)).toEqual([]);
	});

	it('leaves out photos no longer there, so a photo deleted elsewhere is not counted', () => {
		const selection = new Selection();
		selection.hold(OPERATIONS.id, 'a');
		selection.tap(OPERATIONS, 'gone', TAP);
		expect(selection.ids).toEqual(['a', 'gone']);
		expect(picked(selection)).toEqual(['a']);
	});
});
