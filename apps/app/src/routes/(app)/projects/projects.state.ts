import { persist } from "@layerd/ui";
import { storageKey } from "./projects.constants";
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
	photos: [],
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
	photos: [],
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
	description: "",
	variant,
	files: [],
	panelId,
	pageId,
	required,
	photos: [],
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
	description: "",
	variant: getPagePhotoVariant(page),
	files: [],
	panelId: null,
	pageId: page.id,
	required: page.required,
	photos: [],
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
	description: panel.description,
	variant: getPanelPhotoVariant(panel, page),
	files: [],
	panelId: panel.id,
	pageId: page?.id || null,
	required: panel.required,
	photos: [],
});

export function createFixedSectionTemplates(
	schema: projectTypes.ProjectSchemaType,
): projectTypes.SectionTemplateType[] {
	const fixedPanelTemplates: projectTypes.SectionTemplateType[] = [];

	for (const panel of schema.panels) {
		const renderer = projectSchemas.getPanelRenderer(panel);

		if (renderer === "custom") {
			continue;
		}

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
	const photos = Array.isArray(section.photos)
		? section.photos.map(normalizePhotoItem).filter((photo) => photo.src)
		: [];

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
			enabled: true,
			placement: template?.placement || section.placement || "middle",
			fields: Object.fromEntries(
				Object.entries(section.fields || {}).map(([key, itemValue]) => [
					key,
					Array.isArray(itemValue)
						? itemValue.map((entry) => String(entry || ""))
						: String(itemValue || ""),
				]),
			),
			photos,
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
			photos,
		};
	}

	const templateSection = template?.create();
	const templatePhotoSection =
		templateSection && templateSection.type === "photos"
			? templateSection
			: null;
	const files =
		Array.isArray((section as projectTypes.PhotosSectionType)?.files)
			? (section as projectTypes.PhotosSectionType).files
				.map((item) => String(item || "").trim())
				.filter(Boolean)
			: templatePhotoSection?.files || [];
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
		description: String(
			(section as projectTypes.PhotosSectionType)?.description || "",
		),
		variant: String(
			(section as projectTypes.PhotosSectionType)?.variant || "photos-4",
		),
		panelId:
			typeof (section as projectTypes.PhotosSectionType)?.panelId === "string"
				? String((section as projectTypes.PhotosSectionType).panelId)
				: templatePhotoSection?.panelId || null,
		pageId:
			typeof (section as projectTypes.PhotosSectionType)?.pageId === "string"
				? String((section as projectTypes.PhotosSectionType).pageId)
				: templatePhotoSection?.pageId || null,
		files,
		required,
		photos,
	};
}

export const normalizePanel = normalizeSection;

export function loadState(
	schema: projectTypes.ProjectSchemaType,
): projectTypes.PersistedStateType {
	const defaults = createDefaultState(schema);
	const fixedSectionTemplates = createFixedSectionTemplates(schema);
	const fixedSectionTemplateById = new Map(
		fixedSectionTemplates.map((section) => [section.id, section]),
	);
	const parsed = persist.read<Partial<projectTypes.PersistedStateType>>({
		key: storageKey,
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

		if (legacyCoverSection && typeof legacyCoverSection === "object") {
			const legacyFields =
				(legacyCoverSection as { fields?: projectTypes.DetailsFieldsType })
					.fields || {};
			for (const section of normalizedSections) {
				if (section.type !== "fields") continue;
				for (const path of Object.keys(section.fields)) {
					if (!(path in legacyFields)) continue;
					section.fields[path] = Array.isArray(legacyFields[path])
						? [...legacyFields[path] as string[]]
						: String(legacyFields[path] || "");
				}
			}
		}
		const hasOpenSection = normalizedSections.some((section) => section.open);

		return {
			activeTab: parsed.activeTab === "preview" ? "preview" : "create",
			previewZoom: typeof parsed.previewZoom === "number"
				? parsed.previewZoom
				: 1,
			hasUserZoomed: typeof parsed.hasUserZoomed === "boolean"
				? parsed.hasUserZoomed
				: false,
			sections: hasOpenSection
				? normalizedSections
				: normalizedSections.map((section) => ({ ...section, open: false })),
		};
	} catch {
		return defaults;
	}
}
