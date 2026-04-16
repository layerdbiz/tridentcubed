import { persist } from "@layerd/ui";
import {
	getProjectStorageKey,
	projectsRegistryKey,
	storageKey,
} from "./projects.constants";
import * as projectSchemas from "./projects.schema";
import type * as projectTypes from "./projects.types";

let idCounter = 0;

const sectionIcons: Record<string, string> = {
	Organization: "🏢",
	Team: "👥",
	Project: "📁",
	Client: "🤝",
	Facility: "🏭",
	Carrier: "🚢",
	Items: "📦",
	"Time Log": "⏱️",
	Custom: "🧩",
};

function nextId(prefix: string): string {
	idCounter += 1;
	return `${prefix}-${idCounter}`;
}

function createProjectId(): string {
	if (
		typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
	) {
		return crypto.randomUUID();
	}

	return nextId("project");
}

function createTimestamp(): string {
	return new Date().toISOString();
}

function writeStoredValue(key: string, value: unknown): void {
	if (typeof localStorage === "undefined") return;
	localStorage.setItem(key, JSON.stringify(value));
}

function removeStoredValue(key: string): void {
	if (typeof localStorage === "undefined") return;
	localStorage.removeItem(key);
}

export const createTimeEntry = (): projectTypes.TimeEntryType => ({
	id: nextId("entry"),
	time: "",
	text: "",
});

export const createTimeDay = (): projectTypes.TimeDayType => ({
	id: nextId("day"),
	dateISO: "",
	entries: [createTimeEntry()],
});

export const createPhotoGroup = (
	title = "Section 1",
	variant = "photos-4",
): projectTypes.PhotoGroupType => ({
	id: nextId("group"),
	title,
	description: "",
	variant,
	files: [],
	photos: [],
});

function createCoverFields(
	inputs: projectTypes.InputDefinitionType[],
): projectTypes.DetailsFieldsType {
	return Object.fromEntries(
		inputs.map((
			field,
		) => [field.path, projectSchemas.getFieldInitialValue(field)]),
	);
}

function getSectionIcon(section: string): string {
	return sectionIcons[section] || "🧩";
}

function getPanelTitle(
	panel: projectTypes.PanelDefinitionType | undefined,
	fallback: string,
): string {
	return panel?.title || fallback;
}

function getPanelIcon(
	panel: projectTypes.PanelDefinitionType | undefined,
	fallback: string,
): string {
	return panel?.icon || fallback;
}

function getPageSectionId(pageId: string): string {
	return `page-${pageId.toLowerCase()}`;
}

function getPagePhotoVariant(
	page: projectTypes.PageDefinitionType,
): string {
	if (page.page === "Introduction" || page.page === "Cargo Description") {
		return "photos-1";
	}

	return "photos-4";
}

function getPanelSectionId(
	panel: projectTypes.PanelDefinitionType,
	page: projectTypes.PageDefinitionType | undefined,
): string {
	if (page) return getPageSectionId(page.id);
	return `panel-${panel.id.toLowerCase()}`;
}

function getPanelPhotoVariant(
	panel: projectTypes.PanelDefinitionType,
	page: projectTypes.PageDefinitionType | undefined,
): string {
	if (panel.photo) return panel.photo;
	if (page) return getPagePhotoVariant(page);
	return "photos-4";
}

export const createFieldSection = (
	panel: projectTypes.PanelDefinitionType,
	inputGroup: projectTypes.PanelInputGroupDefinitionType | undefined,
): projectTypes.FieldSectionType => ({
	id: `section-${panel.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
	type: "fields",
	section: panel.title,
	title: panel.title,
	icon: getPanelIcon(panel, getSectionIcon(panel.title)),
	open: false,
	locked: true,
	enabled: panel?.enabled ?? true,
	placement: "start",
	fields: createCoverFields(inputGroup?.inputs ?? []),
});

export const createTimeLogSection = (
	schema: projectTypes.ProjectSchemaType,
	panel: projectTypes.PanelDefinitionType | undefined,
): projectTypes.TimeLogSectionType => ({
	id: "section-time-log",
	type: "time-log",
	title: getPanelTitle(panel, schema.timeLogPageTitle),
	icon: getPanelIcon(panel, "⏱️"),
	open: false,
	locked: true,
	enabled: panel?.enabled ?? true,
	placement: "start",
	days: [createTimeDay()],
});

export const createPhotoSection = (
	title: string,
	icon: string,
	variant: string,
	open = false,
	panelId: string | null = null,
	pageId: string | null = null,
	required = false,
): projectTypes.PhotosSectionType => ({
	id: nextId("section"),
	type: "photos",
	title,
	icon,
	open,
	locked: false,
	enabled: true,
	placement: "middle",
	defaultVariant: variant,
	groups: [createPhotoGroup(title, variant)],
	panelId,
	pageId,
	required,
});

export const createPagePhotoSection = (
	page: projectTypes.PageDefinitionType,
): projectTypes.PhotosSectionType => ({
	id: getPageSectionId(page.id),
	type: "photos",
	title: page.page,
	icon: "🖼️",
	open: false,
	locked: true,
	enabled: page.required,
	placement: "middle",
	defaultVariant: getPagePhotoVariant(page),
	groups: page.required
		? [createPhotoGroup(page.page, getPagePhotoVariant(page))]
		: [],
	panelId: null,
	pageId: page.id,
	required: page.required,
});

export const createPanelPhotoSection = (
	panel: projectTypes.PanelDefinitionType,
	page: projectTypes.PageDefinitionType | undefined,
): projectTypes.PhotosSectionType => ({
	id: getPanelSectionId(panel, page),
	type: "photos",
	title: panel.title,
	icon: getPanelIcon(panel, "🖼️"),
	open: false,
	locked: true,
	enabled: panel.enabled,
	placement: "middle",
	defaultVariant: getPanelPhotoVariant(panel, page),
	groups: panel.enabled || panel.required
		? [createPhotoGroup(panel.title, getPanelPhotoVariant(panel, page))]
		: [],
	panelId: panel.id,
	pageId: page?.id || null,
	required: panel.required,
});

export function createFixedSectionTemplates(
	schema: projectTypes.ProjectSchemaType,
): projectTypes.SectionTemplateType[] {
	const fixedPanelTemplates: projectTypes.SectionTemplateType[] = [];

	for (const panel of schema.panels) {
		const renderer = projectSchemas.getPanelRenderer(panel);

		if (renderer === "time-log") {
			fixedPanelTemplates.push({
				id: "section-time-log",
				type: "time-log",
				title: getPanelTitle(panel, schema.timeLogPageTitle),
				icon: getPanelIcon(panel, "⏱️"),
				placement: "start",
				create: () => createTimeLogSection(schema, panel),
			});
			continue;
		}

		if (renderer === "photos") {
			const page = projectSchemas.getPhotoPageForPanel(schema, panel);
			fixedPanelTemplates.push({
				id: getPanelSectionId(panel, page),
				type: "photos",
				title: panel.title,
				icon: getPanelIcon(panel, "🖼️"),
				placement: "middle",
				create: () => createPanelPhotoSection(panel, page),
			});
			continue;
		}

		const inputGroup = projectSchemas.getInputGroup(schema, panel.title);
		if (inputGroup) {
			fixedPanelTemplates.push({
				id: `section-${panel.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
				type: "fields",
				title: panel.title,
				icon: getPanelIcon(panel, getSectionIcon(panel.title)),
				placement: "start",
				create: () => createFieldSection(panel, inputGroup),
			});
			continue;
		}

		fixedPanelTemplates.push({
			id: `section-${panel.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
			type: "fields",
			title: panel.title,
			icon: getPanelIcon(panel, getSectionIcon(panel.title)),
			placement: "start",
			create: () => createFieldSection(panel, inputGroup),
		});
	}
	return fixedPanelTemplates;
}

export const createFixedPanelTemplates = createFixedSectionTemplates;

export function orderSections(
	items: projectTypes.SectionType[],
	fixedSectionTemplates: projectTypes.SectionTemplateType[],
): projectTypes.SectionType[] {
	const fixedSectionIds = new Set(
		fixedSectionTemplates.map((section) => section.id),
	);
	const middleSections = items.filter((section) =>
		!fixedSectionIds.has(section.id)
	);

	return fixedSectionTemplates
		.filter((section) => section.placement === "start")
		.map((section) =>
			items.find((item) => item.id === section.id) ?? section.create()
		)
		.concat(
			fixedSectionTemplates
				.filter((section) => section.placement === "middle")
				.map((section) =>
					items.find((item) => item.id === section.id) ?? section.create()
				),
		)
		.concat(middleSections);
}

export const orderPanels = orderSections;

export function createDefaultState(
	schema: projectTypes.ProjectSchemaType,
): projectTypes.PersistedStateType {
	const fixedSectionTemplates = createFixedSectionTemplates(schema);
	return {
		activeTab: "create",
		previewZoom: 1,
		hasUserZoomed: false,
		sections: orderSections(
			fixedSectionTemplates.map((template) => template.create()),
			fixedSectionTemplates,
		),
	};
}

export function isSectionMovable(section: projectTypes.SectionType): boolean {
	return !section.locked && section.placement === "middle";
}

export const isPanelMovable = isSectionMovable;

export function ensureAtLeastOneDay(
	section: projectTypes.TimeLogSectionType,
): void {
	if (!section.days.length) section.days = [createTimeDay()];
}

export function ensureAtLeastOneEntry(day: projectTypes.TimeDayType): void {
	if (!day.entries.length) day.entries = [createTimeEntry()];
}

export function getNextCustomSectionNumber(
	sections: projectTypes.SectionType[],
): number {
	const currentMax = sections.reduce((max, section) => {
		if (section.placement !== "middle") return max;
		const match = section.title.match(/^Section\s+(\d+)$/i);
		return match ? Math.max(max, Number(match[1])) : max;
	}, 0);

	return currentMax + 1;
}

export const getNextCustomPanelNumber = getNextCustomSectionNumber;

export function normalizeTimeEntry(value: unknown): projectTypes.TimeEntryType {
	return {
		id: typeof (value as projectTypes.TimeEntryType)?.id === "string"
			? (value as projectTypes.TimeEntryType).id
			: nextId("entry"),
		time: String((value as projectTypes.TimeEntryType)?.time || ""),
		text: String((value as projectTypes.TimeEntryType)?.text || ""),
	};
}

export function normalizeTimeDay(value: unknown): projectTypes.TimeDayType {
	const entries = Array.isArray((value as projectTypes.TimeDayType)?.entries)
		? (value as projectTypes.TimeDayType).entries.map(normalizeTimeEntry)
		: [createTimeEntry()];

	return {
		id: typeof (value as projectTypes.TimeDayType)?.id === "string"
			? (value as projectTypes.TimeDayType).id
			: nextId("day"),
		dateISO: String((value as projectTypes.TimeDayType)?.dateISO || ""),
		entries: entries.length ? entries : [createTimeEntry()],
	};
}

export function normalizePhotoItem(value: unknown): projectTypes.PhotoItemType {
	return {
		id: typeof (value as projectTypes.PhotoItemType)?.id === "string"
			? (value as projectTypes.PhotoItemType).id
			: nextId("photo"),
		name: String((value as projectTypes.PhotoItemType)?.name || "Photo"),
		caption: String(
			(value as projectTypes.PhotoItemType)?.caption ||
				(value as projectTypes.PhotoItemType)?.name ||
				"Photo",
		),
		src: String((value as projectTypes.PhotoItemType)?.src || ""),
		width: Math.max(
			0,
			Number((value as projectTypes.PhotoItemType)?.width || 0),
		),
		height: Math.max(
			0,
			Number((value as projectTypes.PhotoItemType)?.height || 0),
		),
	};
}

export function normalizePhotoGroup(
	value: unknown,
): projectTypes.PhotoGroupType {
	const group = value as Partial<projectTypes.PhotoGroupType>;
	const photos = Array.isArray(group.photos)
		? group.photos.map(normalizePhotoItem).filter((photo) => photo.src)
		: [];

	return {
		id: typeof group.id === "string" ? group.id : nextId("group"),
		title: String(group.title || ""),
		description: String(group.description || ""),
		variant: String(group.variant || "photos-4"),
		files: Array.isArray(group.files)
			? group.files.map((item) => String(item || "").trim()).filter(Boolean)
			: [],
		photos,
	};
}

function toPanelPathKey(title: string): string {
	return title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function createLegacyPhotoGroupFromFields(
	section: Partial<projectTypes.FieldSectionType>,
	title: string,
	defaultVariant: string,
): projectTypes.PhotoGroupType {
	const basePath = toPanelPathKey(title);
	const fields = section.fields || {};
	const photos = Array.isArray(fields[`${basePath}.photos`])
		? (fields[`${basePath}.photos`] as string[])
			.map((src, index) =>
				normalizePhotoItem({
					src,
					name: `${title} ${index + 1}`,
					caption: Array.isArray(fields[`${basePath}.captions`])
						? String((fields[`${basePath}.captions`] as string[])[index] || "")
						: "",
				})
			)
			.filter((photo) => photo.src)
		: [];

	return {
		id: nextId("group"),
		title,
		description: String(fields[`${basePath}.description`] || ""),
		variant: String(fields[`${basePath}.variant`] || defaultVariant),
		files: Array.isArray(fields[`${basePath}.files`])
			? (fields[`${basePath}.files`] as string[])
				.map((item) => String(item || "").trim())
				.filter(Boolean)
			: [],
		photos,
	};
}

export function normalizeSection(
	value: unknown,
	index: number,
	fixedSectionTemplateById: Map<string, projectTypes.SectionTemplateType>,
): projectTypes.SectionType {
	const section = value as Partial<projectTypes.SectionType> & {
		fields?: Partial<projectTypes.DetailsFieldsType>;
		days?: projectTypes.TimeDayType[];
		photos?: projectTypes.PhotoItemType[];
		locked?: boolean;
		placement?: projectTypes.SectionPlacementType;
	};
	const template = typeof section.id === "string"
		? fixedSectionTemplateById.get(section.id)
		: undefined;
	const templateSection = template?.create();
	const templatePhotoSection =
		templateSection && templateSection.type === "photos"
			? templateSection
			: null;

	if (
		(section.type === "fields" || section.type === "cover") &&
		templatePhotoSection
	) {
		const legacyGroup = createLegacyPhotoGroupFromFields(
			section as Partial<projectTypes.FieldSectionType>,
			templatePhotoSection.title,
			templatePhotoSection.defaultVariant,
		);

		return {
			id: typeof section.id === "string" ? section.id : nextId("section"),
			type: "photos",
			title: typeof section.title === "string"
				? section.title
				: templatePhotoSection.title,
			icon: typeof section.icon === "string"
				? section.icon
				: templatePhotoSection.icon,
			open: Boolean(section.open),
			locked: true,
			enabled: typeof section.enabled === "boolean"
				? section.enabled
				: templatePhotoSection.enabled,
			placement: templatePhotoSection.placement,
			defaultVariant: templatePhotoSection.defaultVariant,
			groups: [legacyGroup],
			panelId: templatePhotoSection.panelId,
			pageId: templatePhotoSection.pageId,
			required: templatePhotoSection.required,
		};
	}

	if (section.type === "fields" || section.type === "cover") {
		return {
			id: typeof section.id === "string" ? section.id : nextId("section"),
			type: "fields",
			section:
				typeof (section as projectTypes.FieldSectionType).section === "string"
					? String((section as projectTypes.FieldSectionType).section)
					: template?.title || `Section ${index + 1}`,
			title: typeof section.title === "string"
				? section.title
				: template?.title || `Section ${index + 1}`,
			icon: typeof section.icon === "string"
				? section.icon
				: template?.icon || "🧩",
			open: Boolean(section.open),
			locked: template ? true : Boolean(section.locked),
			enabled: typeof section.enabled === "boolean" ? section.enabled : true,
			placement: template?.placement || section.placement || "middle",
			fields: Object.fromEntries(
				Object.entries(section.fields || {}).map(([key, itemValue]) => [
					key,
					Array.isArray(itemValue)
						? itemValue.map((entry) => String(entry || ""))
						: String(itemValue || ""),
				]),
			),
		};
	}

	if (section.type === "time-log") {
		const days = Array.isArray(section.days)
			? section.days.map(normalizeTimeDay)
			: [createTimeDay()];

		return {
			id: typeof section.id === "string" ? section.id : "section-time-log",
			type: "time-log",
			title: typeof section.title === "string"
				? section.title
				: template?.title || "Time Log",
			icon: typeof section.icon === "string"
				? section.icon
				: template?.icon || "⏱️",
			open: Boolean(section.open),
			locked: template ? true : Boolean(section.locked),
			enabled: true,
			placement: template?.placement || section.placement || "middle",
			days: days.length ? days : [createTimeDay()],
		};
	}

	const legacyPhotos = Array.isArray((section as { photos?: unknown[] }).photos)
		? (section as { photos?: unknown[] }).photos
		: [];
	const groups =
		Array.isArray((section as projectTypes.PhotosSectionType)?.groups)
			? (section as projectTypes.PhotosSectionType).groups
				.map(normalizePhotoGroup)
			: legacyPhotos.length ||
					String((section as { description?: string }).description || "")
						.trim() ||
					Array.isArray((section as { files?: string[] }).files)
			? [normalizePhotoGroup({
				id: nextId("group"),
				title: typeof section.title === "string"
					? section.title
					: template?.title || "Section 1",
				description: String(
					(section as { description?: string }).description || "",
				),
				variant: String(
					(section as { variant?: string }).variant ||
						templatePhotoSection?.defaultVariant || "photos-4",
				),
				files: Array.isArray((section as { files?: string[] }).files)
					? (section as { files?: string[] }).files
					: [],
				photos: legacyPhotos,
			})]
			: templatePhotoSection?.groups.map(normalizePhotoGroup) || [];
	const required = templatePhotoSection?.required || Boolean(
		(section as Partial<projectTypes.PhotosSectionType>)?.required,
	);
	const enabled = required
		? true
		: typeof section.enabled === "boolean"
		? section.enabled
		: templatePhotoSection?.enabled ?? true;

	return {
		id: typeof section.id === "string" ? section.id : nextId("section"),
		type: "photos",
		title: typeof section.title === "string"
			? section.title
			: template?.title || `New Section ${index + 1}`,
		icon: typeof section.icon === "string"
			? section.icon
			: template?.icon || "🧩",
		open: Boolean(section.open),
		locked: template ? true : Boolean(section.locked),
		enabled,
		placement: template?.placement || section.placement || "middle",
		defaultVariant: String(
			(section as projectTypes.PhotosSectionType)?.defaultVariant ||
				templatePhotoSection?.defaultVariant ||
				(groups[0]?.variant ?? "photos-4"),
		),
		groups,
		panelId:
			typeof (section as projectTypes.PhotosSectionType)?.panelId === "string"
				? String((section as projectTypes.PhotosSectionType).panelId)
				: templatePhotoSection?.panelId || null,
		pageId:
			typeof (section as projectTypes.PhotosSectionType)?.pageId === "string"
				? String((section as projectTypes.PhotosSectionType).pageId)
				: templatePhotoSection?.pageId || null,
		required,
	};
}

export const normalizePanel = normalizeSection;

export function loadState(
	schema: projectTypes.ProjectSchemaType,
	storageKeyValue = storageKey,
): projectTypes.PersistedStateType {
	const defaults = createDefaultState(schema);
	const fixedSectionTemplates = createFixedSectionTemplates(schema);
	const fixedSectionTemplateById = new Map(
		fixedSectionTemplates.map((section) => [section.id, section]),
	);
	const parsed = persist.read<Partial<projectTypes.PersistedStateType>>({
		key: storageKeyValue,
		fallback: {},
	});

	if (!parsed || typeof parsed !== "object" || !("sections" in parsed)) {
		return defaults;
	}

	try {
		const panelIds = new Set(schema.panels.map((panel) => panel.id));
		const legacyCoverSection = Array.isArray(parsed.sections)
			? parsed.sections.find((section: unknown) =>
				(section as { type?: string }).type === "cover"
			)
			: undefined;
		const parsedSections = Array.isArray(parsed.sections)
			? parsed.sections.filter(
				(section: unknown) =>
					(section as { id?: string; type?: string }).id !==
						"section-table-of-contents" &&
					(section as { type?: string }).type !== "cover" &&
					(section as { id?: string; type?: string }).type !== "toc" &&
					!(
						(section as projectTypes.PhotosSectionType).type === "photos" &&
						Boolean((section as projectTypes.PhotosSectionType).locked) &&
						!((section as projectTypes.PhotosSectionType).panelId &&
							panelIds.has(
								String((section as projectTypes.PhotosSectionType).panelId),
							))
					),
			)
			: defaults.sections;

		const normalizedSections = orderSections(
			parsedSections.map((section, index) =>
				normalizeSection(section, index, fixedSectionTemplateById)
			),
			fixedSectionTemplates,
		);
		const customSection = normalizedSections.find(
			(section): section is projectTypes.PhotosSectionType =>
				section.type === "photos" && section.title === "Custom" &&
				section.locked,
		);
		const migratedSections = customSection
			? normalizedSections.filter((section) => {
				if (section.type !== "photos" || section.locked) return true;

				customSection.groups.push(
					...section.groups.map((group) => ({
						...group,
						title: group.title || section.title,
					})),
				);
				customSection.enabled = true;
				return false;
			})
			: normalizedSections;

		if (legacyCoverSection && typeof legacyCoverSection === "object") {
			const legacyFields =
				(legacyCoverSection as { fields?: projectTypes.DetailsFieldsType })
					.fields || {};
			for (const section of migratedSections) {
				if (section.type !== "fields") continue;
				for (const path of Object.keys(section.fields)) {
					if (!(path in legacyFields)) continue;
					section.fields[path] = Array.isArray(legacyFields[path])
						? [...legacyFields[path] as string[]]
						: String(legacyFields[path] || "");
				}
			}
		}
		const hasOpenSection = migratedSections.some((section) => section.open);

		return {
			activeTab: parsed.activeTab === "preview" ? "preview" : "create",
			previewZoom: typeof parsed.previewZoom === "number"
				? parsed.previewZoom
				: 1,
			hasUserZoomed: typeof parsed.hasUserZoomed === "boolean"
				? parsed.hasUserZoomed
				: false,
			sections: hasOpenSection
				? migratedSections
				: migratedSections.map((section) => ({ ...section, open: false })),
		};
	} catch {
		return defaults;
	}
}

export function loadProjectsRegistry(): projectTypes.ProjectRegistryEntryType[] {
	const parsed = persist.read<projectTypes.ProjectRegistryEntryType[]>({
		key: projectsRegistryKey,
		fallback: [],
	});

	if (!Array.isArray(parsed)) return [];

	return parsed
		.filter((item) => item && typeof item === "object")
		.map((item) => ({
			id: String(item.id || "").trim(),
			createdAt: String(item.createdAt || ""),
			updatedAt: String(item.updatedAt || item.createdAt || ""),
		}))
		.filter((item) => Boolean(item.id));
}

export function saveProjectsRegistry(
	registry: projectTypes.ProjectRegistryEntryType[],
): void {
	writeStoredValue(projectsRegistryKey, registry);
}

export function upsertProjectRegistryEntry(
	entry: projectTypes.ProjectRegistryEntryType,
): projectTypes.ProjectRegistryEntryType[] {
	const registry = loadProjectsRegistry();
	const nextRegistry = registry.some((item) => item.id === entry.id)
		? registry.map((item) => item.id === entry.id ? entry : item)
		: [...registry, entry];

	saveProjectsRegistry(nextRegistry);
	return nextRegistry;
}

export function createProjectRegistryEntry(
	projectId = createProjectId(),
	timestamp = createTimestamp(),
): projectTypes.ProjectRegistryEntryType {
	return {
		id: projectId,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

export function createProjectRecord(
	schema: projectTypes.ProjectSchemaType,
	state?: projectTypes.PersistedStateType,
	projectId?: string,
): projectTypes.ProjectRegistryEntryType {
	const entry = createProjectRegistryEntry(projectId);
	writeStoredValue(
		getProjectStorageKey(entry.id),
		state ?? createDefaultState(schema),
	);
	upsertProjectRegistryEntry(entry);
	return entry;
}

export function deleteProjectRecord(
	projectId: string,
): projectTypes.ProjectRegistryEntryType[] {
	removeStoredValue(getProjectStorageKey(projectId));
	const nextRegistry = loadProjectsRegistry().filter((item) =>
		item.id !== projectId
	);
	saveProjectsRegistry(nextRegistry);
	return nextRegistry;
}

export function touchProjectRecord(projectId: string): void {
	const existingEntry = loadProjectsRegistry().find((item) =>
		item.id === projectId
	);
	const entry = existingEntry
		? { ...existingEntry, updatedAt: createTimestamp() }
		: createProjectRegistryEntry(projectId);

	upsertProjectRegistryEntry(entry);
}

function setFieldValue(
	sections: projectTypes.SectionType[],
	path: string,
	value: projectTypes.FieldStateValueType,
): void {
	for (const section of sections) {
		if (section.type !== "fields" && section.type !== "cover") continue;
		if (!(path in section.fields)) continue;
		section.fields[path] = value;
		return;
	}
}

function createSeedProjectState(
	schema: projectTypes.ProjectSchemaType,
	variant: "blank" | "in-progress" | "complete",
): projectTypes.PersistedStateType {
	const state = createDefaultState(schema);

	if (variant === "blank") {
		return state;
	}

	setFieldValue(
		state.sections,
		"project.title",
		variant === "complete" ? "MV Ocean Survey" : "Draft Cargo Survey",
	);
	setFieldValue(
		state.sections,
		"project.subtitle",
		variant === "complete"
			? "Voyage Condition Assessment"
			: "Initial Inspection",
	);
	setFieldValue(
		state.sections,
		"client.company",
		variant === "complete" ? "Atlas Freight" : "Northwind Logistics",
	);
	setFieldValue(
		state.sections,
		"facility.name",
		variant === "complete" ? "Pier 48 Terminal" : "East Harbor Berth",
	);
	setFieldValue(state.sections, "org.name", "Layerd Marine");
	setFieldValue(
		state.sections,
		"carrier.name",
		variant === "complete" ? "MV Horizon" : "TBD Carrier",
	);
	setFieldValue(
		state.sections,
		"items.title",
		variant === "complete" ? "Steel Coil Shipment" : "Cargo Intake",
	);

	const timeLogSection = state.sections.find(
		(section): section is projectTypes.TimeLogSectionType =>
			section.type === "time-log",
	);
	if (timeLogSection) {
		timeLogSection.days[0].dateISO = "2026-03-28";
		timeLogSection.days[0].entries[0].time = "08:00";
		timeLogSection.days[0].entries[0].text = variant === "complete"
			? "Completed onboard survey walkthrough."
			: "Started receiving intake notes.";
	}

	if (variant === "complete") {
		setFieldValue(state.sections, "team.owner", "Jordan Blake");
		setFieldValue(
			state.sections,
			"items.description",
			"Coils inspected, documented, and staged for discharge review.",
		);
		setFieldValue(state.sections, "project.type", "Condition Survey");
	}

	return state;
}

export function ensureSeedProjects(
	schema: projectTypes.ProjectSchemaType,
): projectTypes.ProjectRegistryEntryType[] {
	const existingRegistry = loadProjectsRegistry();
	if (existingRegistry.length) return existingRegistry;

	const seedVariants: Array<"blank" | "in-progress" | "complete"> = [
		"blank",
		"in-progress",
		"complete",
	];

	return seedVariants.map((variant) =>
		createProjectRecord(schema, createSeedProjectState(schema, variant))
	);
}
