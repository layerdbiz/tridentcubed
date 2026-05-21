import {
	createProjectSchema,
	getFieldInitialValue,
	getPanelDefinitionById,
	getPanelRenderer,
	getPhotoPanelFields,
} from "./projects.schema";
import { getDemoProjectSeedByTitle } from "./projects.seed";
import * as projectUtils from "./projects.utils";
import type * as projectTypes from "./projects.types";

function isRecord(value: unknown): value is projectTypes.ProjectDataRecordType {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneNode(
	value: projectTypes.ProjectDataNodeType | projectTypes.FieldStateValueType,
): projectTypes.ProjectDataNodeType {
	if (Array.isArray(value)) {
		return value.map((item) => String(item ?? ""));
	}

	if (isRecord(value)) {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, cloneNode(item)]),
		);
	}

	if (
		typeof value === "number" || typeof value === "boolean" || value === null
	) {
		return value;
	}

	return String(value ?? "");
}

function setPathValue(
	record: projectTypes.ProjectDataRecordType,
	path: string,
	value: projectTypes.ProjectDataNodeType,
): void {
	const segments = path.split(".").filter(Boolean);
	if (!segments.length) return;

	let current: projectTypes.ProjectDataRecordType = record;

	for (const segment of segments.slice(0, -1)) {
		const next = current[segment];
		if (!isRecord(next)) {
			current[segment] = {};
		}

		current = current[segment] as projectTypes.ProjectDataRecordType;
	}

	current[segments[segments.length - 1]] = cloneNode(value);
}

function hasPathValue(
	record: projectTypes.ProjectDataRecordType,
	path: string,
): boolean {
	const segments = path.split(".").filter(Boolean);
	if (!segments.length) return false;

	let current: projectTypes.ProjectDataNodeType = record;

	for (const segment of segments) {
		if (!isRecord(current) || !(segment in current)) {
			return false;
		}

		current = current[segment];
	}

	return true;
}

export function createProjectRuntimeMeta(
	sections: projectTypes.SectionType[],
): projectTypes.ProjectRuntimeMetaType {
	return {
		panels: Object.fromEntries(
			sections.map((section) => [
				section.type === "fields" || section.type === "cover"
					? section.section
					: section.title,
				{
					id: section.id,
					type: section.type,
					enabled: section.enabled,
					locked: section.locked,
					placement: section.placement,
					title: section.title,
					icon: section.icon,
				},
			]),
		),
	};
}

function applyFieldSections(
	record: projectTypes.ProjectDataRecordType,
	sections: projectTypes.SectionType[],
): void {
	for (const section of sections) {
		if (section.type !== "fields" && section.type !== "cover") continue;

		for (const [path, value] of Object.entries(section.fields)) {
			setPathValue(record, path, cloneNode(value));
		}
	}
}

function applyDefinitionDefaults(
	record: projectTypes.ProjectDataRecordType,
	definitions: projectTypes.ProjectDefinitionsType,
	derivedPanels: Set<string>,
): void {
	for (const input of definitions.inputs) {
		if (!input.path || derivedPanels.has(input.panel)) continue;
		if (hasPathValue(record, input.path)) continue;

		setPathValue(record, input.path, cloneNode(getFieldInitialValue(input)));
	}
}

function applyTimeLogSection(
	record: projectTypes.ProjectDataRecordType,
	sections: projectTypes.SectionType[],
): void {
	const timeLogSection = sections.find(
		(section): section is projectTypes.TimeLogSectionType =>
			section.type === "time-log",
	);
	if (!timeLogSection) return;

	setPathValue(
		record,
		"timelog.dates",
		timeLogSection.days.map((day) => ({
			date: day.dateISO,
			entries: day.entries.map((entry) => ({
				time: entry.time,
				description: entry.text,
			})),
		})),
	);
}

function toRelativePath(path: string | null, prefix: string): string | null {
	if (!path) return null;
	if (path === prefix) return "";
	if (!path.startsWith(`${prefix}.`)) return null;
	return path.slice(prefix.length + 1);
}

function applyPhotoSections(
	record: projectTypes.ProjectDataRecordType,
	schema: projectTypes.ProjectSchemaType,
	sections: projectTypes.SectionType[],
): void {
	const photoSections = sections.filter(
		(section): section is projectTypes.PhotosSectionType =>
			section.type === "photos" && Boolean(section.panelId),
	);

	for (const section of photoSections) {
		const panel = section.panelId
			? getPanelDefinitionById(schema, section.panelId)
			: undefined;
		if (!panel || getPanelRenderer(panel) !== "photos") continue;

		const fields = getPhotoPanelFields(schema, panel);
		if (!fields?.groupPath) continue;

		setPathValue(
			record,
			fields.groupPath,
			(section.enabled || section.required ? section.groups : []).map(
				(group) => {
					const groupRecord: projectTypes.ProjectDataRecordType = {};
					const titlePath = toRelativePath(fields.titlePath, fields.groupPath);
					const descriptionPath = toRelativePath(
						fields.descriptionPath,
						fields.groupPath,
					);
					const variantPath = toRelativePath(
						fields.variantPath,
						fields.groupPath,
					);
					const filesPath = toRelativePath(fields.filesPath, fields.groupPath);
					const photoRepeaterPath = toRelativePath(
						fields.photoRepeaterPath,
						fields.groupPath,
					);

					if (titlePath) setPathValue(groupRecord, titlePath, group.title);
					if (descriptionPath) {
						setPathValue(groupRecord, descriptionPath, group.description);
					}
					if (variantPath) {
						setPathValue(groupRecord, variantPath, group.variant);
					}
					if (filesPath) setPathValue(groupRecord, filesPath, group.files);
					if (photoRepeaterPath) {
						setPathValue(
							groupRecord,
							photoRepeaterPath,
							group.photos.map((photo) => ({
								photo: photo.src,
								description: photo.caption,
							})),
						);
					}

					return groupRecord;
				},
			),
		);
	}
}

export function createProjectData(
	definitions: projectTypes.ProjectDefinitionsType,
	sections: projectTypes.SectionType[],
): projectTypes.ProjectDataType {
	const record: projectTypes.ProjectDataRecordType = {};
	const schema = createProjectSchema(definitions);
	const derivedPanels = new Set(
		schema.panels
			.filter((panel) => {
				const renderer = getPanelRenderer(panel);
				return renderer === "time-log" || renderer === "photos";
			})
			.map((panel) => panel.title),
	);

	applyFieldSections(record, sections);
	applyDefinitionDefaults(record, definitions, derivedPanels);
	applyTimeLogSection(record, sections);
	applyPhotoSections(record, schema, sections);

	return record;
}

export function getProjectDataAtPath(
	data: projectTypes.ProjectDataRecordType,
	path: string,
): projectTypes.ProjectDataNodeType | undefined {
	const segments = path.split(".").filter(Boolean);
	if (!segments.length) return undefined;

	let current: projectTypes.ProjectDataNodeType = data;

	for (const segment of segments) {
		if (!isRecord(current) || !(segment in current)) return undefined;
		current = current[segment];
	}

	return current;
}

export function getProjectDataFieldValue(
	data: projectTypes.ProjectDataRecordType,
	path: string,
): projectTypes.FieldStateValueType | undefined {
	const value = getProjectDataAtPath(data, path);
	if (Array.isArray(value)) {
		return value.filter((item): item is string => typeof item === "string");
	}

	return typeof value === "string" ? value : undefined;
}

export function getProjectDataString(
	data: projectTypes.ProjectDataRecordType,
	path: string,
): string {
	const value = getProjectDataAtPath(data, path);
	if (Array.isArray(value)) {
		return value.filter((item): item is string => typeof item === "string")
			.join(", ");
	}

	return typeof value === "string" ? value : "";
}

export function getProjectDataList(
	data: projectTypes.ProjectDataRecordType,
	path: string,
): string[] {
	const value = getProjectDataAtPath(data, path);
	if (Array.isArray(value)) {
		return value.filter((item): item is string => typeof item === "string").map(
			(item) => item.trim(),
		).filter(Boolean);
	}

	const text = typeof value === "string" ? value.trim() : "";
	return text ? [text] : [];
}

export function createProjectListRow(
	definitions: projectTypes.ProjectDefinitionsType,
	state: projectTypes.PersistedStateType,
	registryEntry: projectTypes.ProjectRegistryEntryType,
): projectTypes.ProjectListRowType {
	const projectData = createProjectData(definitions, state.sections);
	const progress = projectUtils.getOverallPanelMetrics(state.sections);
	const title = getProjectDataString(projectData, "project.title") ||
		"Untitled Project";
	const owner = getProjectDataString(projectData, "team.owner").trim();
	const assigned = getProjectDataList(projectData, "team.assigned").filter(
		(name) => name !== owner,
	);
	const demoSeed = getDemoProjectSeedByTitle(title);
	const progressPercent = demoSeed?.progressPercent ?? progress.percent;
	const status = demoSeed?.status ??
		(progress.percent >= 100
			? "Complete"
			: progress.percent > 0
			? "In Progress"
			: "Draft");

	return {
		id: registryEntry.id,
		title,
		client: getProjectDataString(projectData, "client.company") || "—",
		facility: getProjectDataString(projectData, "facility.name") || "—",
		teamMembers: [owner, ...assigned].filter(Boolean),
		updatedAt: registryEntry.updatedAt,
		status,
		progress: `${progressPercent}%`,
		progressPercent,
	};
}
