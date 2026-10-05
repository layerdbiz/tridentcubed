// Derived lookups over the definition rows. Computed once at module load; nothing here
// is fetched, so the pages import this module directly (no remote function).
import { inputs, type InputIdType, type InputRowType } from './inputs';
import { pages, type PageIdType, type PageRowType } from './pages';
import { panels, type PanelIdType } from './panels';
import type { ProjectDefinitionsType } from './types';

/** The three catalogues together, in the shape `createProjectSchema` reads. */
export const definitions = { inputs, panels, pages } satisfies ProjectDefinitionsType;

function groupInputsByPanel(): ReadonlyMap<PanelIdType, readonly InputRowType[]> {
	const groups = new Map<PanelIdType, InputRowType[]>();
	for (const input of inputs) {
		const group = groups.get(input.panel) ?? [];
		group.push(input);
		groups.set(input.panel, group);
	}
	return groups;
}

/** Inputs of each panel, in sheet order. Panels without inputs have no entry. */
export const inputsByPanel: ReadonlyMap<PanelIdType, readonly InputRowType[]> =
	groupInputsByPanel();

/** Report pages by id. */
export const pagesById: ReadonlyMap<PageIdType, PageRowType> = new Map(
	pages.map((page) => [page.id, page])
);

/** Inputs by id. */
export const inputsById: ReadonlyMap<InputIdType, InputRowType> = new Map(
	inputs.map((input) => [input.id, input])
);
