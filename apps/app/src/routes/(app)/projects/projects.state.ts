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
	group: projectTypes.FieldGroupDefinitionType,
): projectTypes.DetailsFieldsType {
	return Object.fromEntries(
		group.fields.map((
			field,
		) => [field.path, projectSchemas.getFieldInitialValue(field)]),
	);
}

function getSectionIcon(section: string): string {
	return sectionIcons[section] || "🧩";
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

export const createFieldSection = (
	group: projectTypes.FieldGroupDefinitionType,
): projectTypes.FieldSectionType => ({
	id: `section-${group.section.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
	type: "fields",
	section: group.section,
	title: group.section,
	icon: getSectionIcon(group.section),
	open: false,
	locked: true,
	enabled: true,
	placement: "start",
	fields: createCoverFields(group),
	photos: [],
});

export const createTimeLogSection = (
	schema: projectTypes.ProjectSchemaType,
): projectTypes.TimeLogSectionType => ({
	id: "section-time-log",
	type: "time-log",
	title: schema.timeLogPageTitle,
	icon: "⏱️",
	open: false,
	locked: true,
	enabled: true,
	placement: "start",
	days: [createTimeDay()],
	photos: [],
});

export const createPhotoSection = (
	title: string,
	icon: string,
	variant: string,
	open = false,
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
	pageId: page.id,
	required: page.required,
	photos: [],
});

export function createFixedSectionTemplates(
	schema: projectTypes.ProjectSchemaType,
): projectTypes.SectionTemplateType[] {
	return [
		...schema.fieldGroups.map((group) => ({
			id: `section-${group.section.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
			type: "fields" as const,
			title: group.section,
			icon: getSectionIcon(group.section),
			placement: "start" as const,
			create: () => createFieldSection(group),
		})),
		{
			id: "section-time-log",
			type: "time-log",
			title: schema.timeLogPageTitle,
			icon: "⏱️",
			placement: "start",
			create: () => createTimeLogSection(schema),
		},
		...schema.pages.filter((page) => page.type === "photo").map((page) => ({
			id: getPageSectionId(page.id),
			type: "photos" as const,
			title: page.page,
			icon: "🖼️",
			placement: "middle" as const,
			create: () => createPagePhotoSection(page),
		})),
	];
}

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
		pageId:
			typeof (section as projectTypes.PhotosSectionType)?.pageId === "string"
				? String((section as projectTypes.PhotosSectionType).pageId)
				: templatePhotoSection?.pageId || null,
		required,
		photos,
	};
}

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
					(section as { id?: string; type?: string }).type !== "toc",
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
