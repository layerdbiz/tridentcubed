// @vitest-environment jsdom
// Finding the input an entry of the empty-inputs list names (#305) among the inputs a panel draws: by its section, its
// label and which of that section's inputs with the label it is, as tally.ts lists them.
import { describe, expect, it } from 'vite-plus/test';
import { inputIn } from './focus';

function draw(html: string) {
	const root = document.createElement('fieldset');
	root.innerHTML = html;
	return root;
}

describe('the input an entry opens', () => {
	it('is the one its label names, in its own section', () => {
		const root = draw(`
			<div data-section="project"><label for="a">Title</label><input id="a" /></div>
			<div data-section="customer"><label for="b">Reference Number</label><input id="b" /></div>
		`);
		expect(inputIn(root, { section: 'customer', label: 'Reference Number', nth: 0 })?.id).toBe('b');
	});

	it('is a picker named for its label', () => {
		const root = draw(`
			<div data-section="team">
				<p>Team Lead <button aria-label="What goes in Team Lead?">?</button></p>
				<button aria-label="Team Lead" id="lead"></button>
				<button aria-label="Team Assigned" id="assigned"></button>
			</div>
		`);
		expect(inputIn(root, { section: 'team', label: 'Team Assigned', nth: 0 })?.id).toBe('assigned');
		expect(inputIn(root, { section: 'team', label: 'Team Lead', nth: 0 })?.id).toBe('lead');
	});

	it('is a library input, named by the label on its border', () => {
		const root = draw(`
			<fieldset class="field"><legend><span id="l">Title</span></legend><label for="t"><input id="t" aria-labelledby="l" /></label></fieldset>
		`);
		expect(inputIn(root, { section: 'project', label: 'Title', nth: 0 })?.id).toBe('t');
	});

	it('takes a label over a longer name read out for it: a panel’s Title', () => {
		const root = draw(`<label for="t">Title</label><input id="t" aria-label="Panel title" />`);
		expect(inputIn(root, { section: 'panel', label: 'Title', nth: 0 })?.id).toBe('t');
	});

	it('is the second of two with the same label when it is the second row', () => {
		const root = draw(`
			<input data-input="Quantity" aria-label="Quantity of item 1" id="q1" />
			<input data-input="Description" aria-label="Description of item 1" id="d1" />
			<input data-input="Quantity" aria-label="Quantity of item 2" id="q2" />
		`);
		expect(inputIn(root, { section: 'items', label: 'Quantity', nth: 1 })?.id).toBe('q2');
	});

	it('is in the panel itself when its section is not drawn as a part of its own, never in a part inside it', () => {
		const root = draw(`
			<div data-section="stage-1"><label for="s">Title</label><input id="s" /></div>
			<label for="p">Title</label><input id="p" />
			<div data-section="stage-2"><input type="file" data-input="Photos" id="upload" /></div>
			<button data-input="Photos" id="add">Add stage</button>
		`);
		expect(inputIn(root, { section: 'panel', label: 'Title', nth: 0 })?.id).toBe('p');
		expect(inputIn(root, { section: 'panel', label: 'Photos', nth: 0 })?.id).toBe('add');
		expect(inputIn(root, { section: 'stage-2', label: 'Photos', nth: 0 })?.id).toBe('upload');
	});

	it('is nothing when the panel draws no such input', () => {
		const root = draw(`<label for="a">Title</label><input id="a" />`);
		expect(inputIn(root, { section: 'project', label: 'Subtitle', nth: 0 })).toBeUndefined();
	});
});
