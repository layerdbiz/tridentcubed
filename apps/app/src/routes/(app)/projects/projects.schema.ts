import type * as projectTypes from "./projects.types";

const excludedSections = new Set(["Time Log", "Custom"]);

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
	const formFields = definitions.fields.filter((field) => {
		if (!field.id || !field.section || !field.path) return false;
		if (field.visibility === "hidden") return false;
		return !excludedSections.has(field.section);
	});

	const fieldGroups = Array.from(
		formFields.reduce((groups, field) => {
			const fields = groups.get(field.section) ?? [];
			fields.push(field);
			groups.set(field.section, fields);
			return groups;
		}, new Map<string, projectTypes.FieldDefinitionType[]>()),
	).map(([section, fields]) => ({ section, fields }));

	const customVariantOptions =
		definitions.fields.find((field) => field.path === "custom.entries.variant")
			?.options ?? ["photos-1", "photos-2", "photos-4", "photos-6", "photos-8"];

	const pageByName = new Map(pages.map((page) => [page.page, page]));

	return {
		fieldGroups,
		pages,
		coverFieldPaths: formFields.map((field) => field.path),
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
	field: projectTypes.FieldDefinitionType,
): projectTypes.FieldStateValueType {
	if (field.input === "multiselect") {
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
