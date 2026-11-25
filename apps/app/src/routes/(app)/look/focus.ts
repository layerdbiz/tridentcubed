// Finding, among the inputs a panel draws, the one an entry of the empty-inputs list names (#305), to put the focus on
// it. tally.ts lists a section's inputs by label in the order the panel draws them, so an input is found by its
// section (the part drawn with `data-section`, else the panel itself), its label and which of that section's inputs
// with this label it is. An input's name is the label it is named by (the library's inputs, whose label sits on their
// border, #57), else the label drawn for it, else the name read out for it (a picker's button); an input with none of
// these, or one read out in more words ("Quantity of item 2"), says it with `data-input`.
import type { EmptyType } from './tally';

const CONTROLS = 'input, textarea, select, button';

// The words of the elements an input names as its label (`aria-labelledby`), looked for in the part it is in.
function labelledOf(control: HTMLElement, part: HTMLElement) {
	const ids = control.getAttribute('aria-labelledby')?.split(/\s+/).filter(Boolean) ?? [];
	const words = ids
		.map((id) => part.querySelector(`[id="${id.replace(/["\\]/g, '\\$&')}"]`)?.textContent ?? '')
		.join(' ')
		.trim();
	return words || undefined;
}

function nameOf(control: HTMLElement, part: HTMLElement, labels: Map<string, string>) {
	return (
		control.dataset.input ??
		labelledOf(control, part) ??
		(control.id ? labels.get(control.id) : undefined) ??
		control.getAttribute('aria-label') ??
		''
	).trim();
}

/** The input `empty` names in a panel drawn under `root`, if the panel draws it. */
export function inputIn(root: HTMLElement, empty: EmptyType): HTMLElement | undefined {
	const parts = [...root.querySelectorAll<HTMLElement>('[data-section]')];
	const part = parts.find((item) => item.dataset.section === empty.section) ?? root;
	const labels = new Map<string, string>();
	for (const label of part.querySelectorAll('label[for]'))
		labels.set(label.getAttribute('for') ?? '', label.textContent ?? '');
	const named = [...part.querySelectorAll<HTMLElement>(CONTROLS)].filter((control) => {
		// Only this part's own: never an input of a section drawn inside it.
		const owner = control.closest('[data-section]');
		const isOwn = part === root ? !owner || !root.contains(owner) : owner === part;
		return isOwn && nameOf(control, part, labels) === empty.label;
	});
	return named[empty.nth];
}

// Where a reached input comes to rest, down from the top of the list it scrolls in: in the upper third, above the
// toast that listed it, which stays at the bottom of the screen (on a phone it covers the middle).
const REST = 0.3;

// The nearest part around an element that scrolls up and down: the panels' column, or the page.
function scrollerOf(element: HTMLElement) {
	for (let part = element.parentElement; part; part = part.parentElement) {
		const { overflowY } = getComputedStyle(part);
		if (/auto|scroll/.test(overflowY) && part.scrollHeight > part.clientHeight) return part;
	}
	return document.scrollingElement as HTMLElement | null;
}

/** Puts the focus on an input, or the part it is in, and scrolls it to the upper third of the screen. */
export function focusInput(control: HTMLElement) {
	control.focus({ preventScroll: true });
	const scroller = scrollerOf(control);
	if (!scroller) return;
	const isPage = scroller === document.scrollingElement;
	const top = isPage ? 0 : scroller.getBoundingClientRect().top;
	const height = isPage ? window.innerHeight : scroller.clientHeight;
	const at = control.getBoundingClientRect().top - top;
	scroller.scrollBy({ top: at - height * REST, behavior: 'smooth' });
}
