// The Operations panel's stages (#215; Justin, 2026-11-18). A project made before them has an Inspection panel
// (key `inspection`) holding whatever photo groups its people added. The first time such a project opens for
// editing, that panel becomes the Operations panel: it keeps every group and what is in it, takes the new title
// unless someone had given it their own, and gets each starting stage it has no group named for. Its key changes
// with it, which is what makes this happen once: a stage renamed or removed afterwards is never added again.
import { groupOf, PANEL_NAMES, STAGES, type PanelType } from './look.data';

const OLD_KEY = 'inspection';
const OLD_NAME = 'Inspection';

function toKey(title: string) {
	return title.trim().toLowerCase();
}

/** Makes a project's old Inspection panel its Operations panel, in place, and says whether it was one. */
export function upgradeOperations(panel: PanelType) {
	if (panel.key !== OLD_KEY) return false;
	panel.key = 'operations';
	if (panel.name === OLD_NAME) panel.name = PANEL_NAMES.operations;
	const titles = new Set(panel.groups.map((group) => toKey(group.title)));
	// Beside groups the project already has, a starting stage comes switched off, so the report stays as its people
	// left it until they switch one on. An empty panel gets them switched on, as a new project does.
	const isEnabled = panel.groups.length === 0;
	for (const title of STAGES)
		if (!titles.has(toKey(title))) panel.groups.push(groupOf(title, isEnabled));
	return true;
}
