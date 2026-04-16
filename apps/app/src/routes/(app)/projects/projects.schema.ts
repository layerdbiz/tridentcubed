import type * as projectTypes from "./projects.types";

const excludedSections = new Set(["Time Log"]);

function toKey(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function toTitle(
	definition: projectTypes.PageDefinitionType | undefined,
	fallback: string,
): string {
	return definition?.page || fallback;
}

export function createProjectSchema(
	definitions: projectTypes.ProjectDefinitionsType,
): projectTypes.ProjectSchemaType {
	const pages = [...definitions.pages].sort((a, b) => a.order - b.order);
	const panels = [...definitions.panels]
		.filter((panel) => panel.visibility !== "hidden")
		.sort((left, right) => left.order - right.order);
	const visiblePanelTitles = new Set(panels.map((panel) => panel.title));
	const formInputs = definitions.inputs.filter((input) => {
		if (!input.id || !input.panel || !input.path) return false;
		if (input.visibility === "hidden") return false;
		if (!visiblePanelTitles.has(input.panel)) return false;
		return !excludedSections.has(input.panel);
	});
	const inputsByPanel = formInputs.reduce((groups, input) => {
		const inputs = groups.get(input.panel) ?? [];
		inputs.push(input);
		groups.set(input.panel, inputs);
		return groups;
	}, new Map<string, projectTypes.InputDefinitionType[]>());
	const inputGroups = panels
		.map((panel) => ({
			panel: panel.title,
			inputs: inputsByPanel.get(panel.title) ?? [],
		}))
		.filter((group) => group.inputs.length > 0);

	const fieldGroups = inputGroups.map((group) => ({
		section: group.panel,
		fields: group.inputs,
	}));

	const customVariantOptions =
		definitions.inputs.find((input) => input.path === "custom.entries.variant")
			?.options ?? ["photos-1", "photos-2", "photos-4", "photos-6", "photos-8"];

	const pageByName = new Map(pages.map((page) => [page.page, page]));

	return {
		panels,
		inputGroups,
		fieldGroups,
		pages,
		coverFieldPaths: formInputs.map((input) => input.path),
		customVariantOptions,
		coverPageTitle: toTitle(pageByName.get("Cover"), "Cover"),
		tocPageTitle: toTitle(
			pageByName.get("Table of Contents"),
			"Table of Contents",
		),
		timeLogPageTitle: toTitle(pageByName.get("Time Log"), "Time Log"),
		disclaimerPageTitle: toTitle(pageByName.get("Disclaimer"), "Disclaimer"),
	};
}

export function getFieldInitialValue(
	field: projectTypes.InputDefinitionType,
): projectTypes.FieldStateValueType {
	if (field.input === "multiselect" || field.repeatable) {
		return field.value
			.split(",")
			.map((value) => value.trim())
			.filter(Boolean);
	}

	return field.value;
}

export function getFieldStringValue(
	fields: projectTypes.DetailsFieldsType,
	path: string,
): string {
	const value = fields[path];
	if (Array.isArray(value)) return value.join(", ");
	return typeof value === "string" ? value : "";
}

export function getFieldGroup(
	schema: projectTypes.ProjectSchemaType,
	section: string,
): projectTypes.FieldGroupDefinitionType | undefined {
	return schema.fieldGroups.find((group) => group.section === section);
}

export function getInputGroup(
	schema: projectTypes.ProjectSchemaType,
	panel: string,
): projectTypes.PanelInputGroupDefinitionType | undefined {
	return schema.inputGroups.find((group) => group.panel === panel);
}

export function getPanelDefinition(
	schema: projectTypes.ProjectSchemaType,
	title: string,
): projectTypes.PanelDefinitionType | undefined {
	const titleKey = toKey(title);
	return schema.panels.find((panel) => toKey(panel.title) === titleKey);
}

export function getPanelDefinitionById(
	schema: projectTypes.ProjectSchemaType,
	id: string,
): projectTypes.PanelDefinitionType | undefined {
	return schema.panels.find((panel) => panel.id === id);
}

export function getPanelRenderer(
	panel: projectTypes.PanelDefinitionType,
): projectTypes.PanelRendererType {
	if (panel.type) return panel.type;

	const titleKey = toKey(panel.title);
	if (titleKey === "timelog") return "time-log";
	if (
		panel.icon === "🖼️" ||
		panel.reference.some((item) => toKey(item) === "panel009")
	) {
		return "photos";
	}

	return "fields";
}

function sortByPathDepth(
	left: projectTypes.InputDefinitionType,
	right: projectTypes.InputDefinitionType,
): number {
	const leftDepth = left.path.split(".").length;
	const rightDepth = right.path.split(".").length;
	if (leftDepth !== rightDepth) return leftDepth - rightDepth;
	return left.path.localeCompare(right.path);
}

function findNestedField(
	inputs: projectTypes.InputDefinitionType[],
	prefix: string,
	segment: string,
): projectTypes.InputDefinitionType | undefined {
	return inputs.find((input) => input.path === `${prefix}.${segment}`) ??
		inputs.find((input) =>
			input.path.startsWith(`${prefix}.`) && input.path.endsWith(`.${segment}`)
		);
}

export function getPhotoPanelFields(
	schema: projectTypes.ProjectSchemaType,
	panel: string | projectTypes.PanelDefinitionType,
): projectTypes.PhotoPanelFieldsType | null {
	const panelTitle = typeof panel === "string" ? panel : panel.title;
	const inputGroup = getInputGroup(schema, panelTitle);
	if (!inputGroup) return null;

	const repeaters = inputGroup.inputs
		.filter((input) => input.input === "repeater")
		.sort(sortByPathDepth);
	const groupRepeater = repeaters[0];
	if (!groupRepeater?.path) return null;

	const groupPath = groupRepeater.path;
	const groupInputs = inputGroup.inputs.filter((input) =>
		input.path.startsWith(`${groupPath}.`)
	);
	const photoRepeater =
		repeaters.find((input) =>
			input.path !== groupPath && input.path.startsWith(`${groupPath}.`)
		) ?? null;
	const photoPath = photoRepeater
		? groupInputs.find((input) =>
			input.input === "image" && input.path.startsWith(`${photoRepeater.path}.`)
		)
		: null;
	const captionPath = photoPath
		? groupInputs.find((input) =>
			input.reference.includes(photoPath.id) ||
			input.path === `${photoRepeater?.path}.description` ||
			input.path === `${photoRepeater?.path}.caption`
		)
		: null;
	const variantField = groupInputs.find((input) =>
		input.input === "select" &&
		input.options.some((option) => option.startsWith("photos-"))
	) ?? null;

	return {
		groupPath,
		titlePath: findNestedField(groupInputs, groupPath, "title")?.path ?? null,
		descriptionPath:
			findNestedField(groupInputs, groupPath, "description")?.path ?? null,
		variantPath: variantField?.path ?? null,
		filesPath: groupInputs.find((input) => input.input === "file")?.path ??
			null,
		photoRepeaterPath: photoRepeater?.path ?? null,
		photoPath: photoPath?.path ?? null,
		captionPath: captionPath?.path ?? null,
		variantOptions: variantField?.options.length
			? variantField.options
			: schema.customVariantOptions,
	};
}

function matchesPageTitle(value: string, pageTitle: string): boolean {
	return toKey(value) === toKey(pageTitle);
}

function getExplicitPanelPageReferences(
	panel: projectTypes.PanelDefinitionType,
): string[] {
	return panel.reference.filter((item) =>
		item.toUpperCase().startsWith("PAGE-")
	);
}

export function getInputsForOutputPage(
	schema: projectTypes.ProjectSchemaType,
	page: projectTypes.PageDefinitionType,
): projectTypes.InputDefinitionType[] {
	return schema.inputGroups.flatMap((group) =>
		group.inputs.filter((input) =>
			input.outputToPages.some((item) => matchesPageTitle(item, page.page))
		)
	);
}

export function getPanelsForOutputPage(
	schema: projectTypes.ProjectSchemaType,
	page: projectTypes.PageDefinitionType,
): projectTypes.PanelDefinitionType[] {
	const panels = new Map<string, projectTypes.PanelDefinitionType>();

	for (const input of getInputsForOutputPage(schema, page)) {
		const panel = getPanelDefinition(schema, input.panel);
		if (panel) panels.set(panel.id, panel);
	}

	for (const panel of schema.panels) {
		if (!getExplicitPanelPageReferences(panel).includes(page.id)) continue;
		panels.set(panel.id, panel);
	}

	return Array.from(panels.values());
}

export function getPrimaryPanelForPage(
	schema: projectTypes.ProjectSchemaType,
	page: projectTypes.PageDefinitionType,
): projectTypes.PanelDefinitionType | undefined {
	return getPanelsForOutputPage(schema, page)[0];
}

export function isDerivedPhotoPage(
	schema: projectTypes.ProjectSchemaType,
	page: projectTypes.PageDefinitionType,
): boolean {
	if (page.variant !== "photo") return false;
	if (!getInputsForOutputPage(schema, page).length) return false;

	const panel = getPanelForPhotoPage(schema, page);
	if (!panel) return true;

	return getPanelRenderer(panel) !== "photos";
}

export function getPhotoPageForPanel(
	schema: projectTypes.ProjectSchemaType,
	panel: projectTypes.PanelDefinitionType,
): projectTypes.PageDefinitionType | undefined {
	const explicitPageId = getExplicitPanelPageReferences(panel)[0];
	if (explicitPageId) {
		return schema.pages.find((page) => page.id === explicitPageId);
	}

	return schema.pages.find((page) =>
		page.variant === "photo" &&
		getInputsForOutputPage(schema, page).some((input) =>
			matchesPageTitle(input.panel, panel.title)
		)
	);
}

export function getPanelForPhotoPage(
	schema: projectTypes.ProjectSchemaType,
	page: projectTypes.PageDefinitionType,
): projectTypes.PanelDefinitionType | undefined {
	if (page.variant !== "photo") return undefined;

	const explicitPanel = schema.panels.find((panel) =>
		getExplicitPanelPageReferences(panel).includes(page.id)
	);
	if (explicitPanel) return explicitPanel;

	return getPrimaryPanelForPage(schema, page);
}

export function getSectionFieldStringValue(
	sections: projectTypes.SectionType[],
	path: string,
): string {
	for (const section of sections) {
		if (
			(section.type === "fields" || section.type === "cover") &&
			path in section.fields
		) {
			return getFieldStringValue(section.fields, path);
		}
	}

	return "";
}

export const getPanelFieldStringValue = getSectionFieldStringValue;
