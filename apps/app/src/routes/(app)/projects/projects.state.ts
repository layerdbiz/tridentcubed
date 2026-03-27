import { storageKey } from "./projects.constants";
import type * as projectTypes from "./projects.types";

let idCounter = 0;

function nextId(prefix: string): string {
	idCounter += 1;
	return `${prefix}-${idCounter}`;
}

function getStorageItem<T>(key: string, fallback: T): T {
	if (typeof localStorage === "undefined") return fallback;

	try {
		const raw = localStorage.getItem(key);
		if (raw === null) return fallback;
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
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

export const createCoverSection = (): projectTypes.CoverSectionType => ({
	id: "section-cover-page",
	type: "cover",
	title: "Cover Page",
	icon: "📄",
	open: false,
	locked: true,
	placement: "start",
	fields: {
		reportTitle: "Survey Report",
		facilityName: "",
		startDate: "",
		endDate: "",
		clientName: "",
		preparedBy: "Justin O'Neill",
		documentId: "DOC-001",
	},
	photos: [],
});

export const createTimeLogSection = (): projectTypes.TimeLogSectionType => ({
	id: "section-time-log",
	type: "time-log",
	title: "Time Log",
	icon: "⏱️",
	open: false,
	locked: true,
	placement: "start",
	days: [createTimeDay()],
	photos: [],
});

export const createOutroSection = (): projectTypes.PhotosSectionType => ({
	id: "section-outro",
	type: "photos",
	title: "Outro",
	icon: "🏁",
	open: false,
	locked: true,
	placement: "end",
	description: "",
	photos: [],
});

export const createPhotoSection = (
	title: string,
	icon: string,
	open = false,
): projectTypes.PhotosSectionType => ({
	id: nextId("section"),
	type: "photos",
	title,
	icon,
	open,
	locked: false,
	placement: "middle",
	description: "",
	photos: [],
});

export const createInitialMiddleSections = (): projectTypes.PhotosSectionType[] => [
	createPhotoSection("Section 1", "🧩"),
	createPhotoSection("Section 2", "🧩"),
	createPhotoSection("Section 3", "🧩"),
];

export const fixedSectionTemplates: projectTypes.SectionTemplateType[] = [
	{
		id: "section-cover-page",
		type: "cover",
		title: "Cover Page",
		icon: "📄",
		placement: "start",
		create: createCoverSection,
	},
	{
		id: "section-time-log",
		type: "time-log",
		title: "Time Log",
		icon: "⏱️",
		placement: "start",
		create: createTimeLogSection,
	},
	{
		id: "section-outro",
		type: "photos",
		title: "Outro",
		icon: "🏁",
		placement: "end",
		create: createOutroSection,
	},
];

export const fixedSectionIds = new Set(
	fixedSectionTemplates.map((section) => section.id),
);

export const fixedSectionTemplateById = new Map(
	fixedSectionTemplates.map((section) => [section.id, section]),
);

export function orderSections(items: projectTypes.SectionType[]): projectTypes.SectionType[] {
	const middleSections = items.filter((section) => !fixedSectionIds.has(section.id));

	return fixedSectionTemplates
		.filter((section) => section.placement === "start")
		.map((section) => items.find((item) => item.id === section.id) ?? section.create())
		.concat(middleSections)
		.concat(
			fixedSectionTemplates
				.filter((section) => section.placement === "end")
				.map((section) => items.find((item) => item.id === section.id) ?? section.create()),
		);
}

export function createDefaultState(): projectTypes.PersistedStateType {
	return {
		activeTab: "create",
		previewZoom: 1,
		hasUserZoomed: false,
		sections: orderSections([
			fixedSectionTemplates[0].create(),
			fixedSectionTemplates[1].create(),
			...createInitialMiddleSections(),
			fixedSectionTemplates[2].create(),
		]),
	};
}

export function isSectionMovable(section: projectTypes.SectionType): boolean {
	return !section.locked && section.placement === "middle";
}

export function ensureAtLeastOneDay(section: projectTypes.TimeLogSectionType): void {
	if (!section.days.length) section.days = [createTimeDay()];
}

export function ensureAtLeastOneEntry(day: projectTypes.TimeDayType): void {
	if (!day.entries.length) day.entries = [createTimeEntry()];
}

export function getNextCustomSectionNumber(sections: projectTypes.SectionType[]): number {
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
		width: Math.max(0, Number((value as projectTypes.PhotoItemType)?.width || 0)),
		height: Math.max(0, Number((value as projectTypes.PhotoItemType)?.height || 0)),
	};
}

export function normalizeSection(value: unknown, index: number): projectTypes.SectionType {
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

	if (section.type === "cover") {
		return {
			id: typeof section.id === "string" ? section.id : "section-cover-page",
			type: "cover",
			title:
				typeof section.title === "string"
					? section.title
					: template?.title || "Cover Page",
			icon:
				typeof section.icon === "string"
					? section.icon
					: template?.icon || "📄",
			open: Boolean(section.open),
			locked: template ? true : Boolean(section.locked),
			placement: template?.placement || section.placement || "middle",
			fields: {
				reportTitle: String(section.fields?.reportTitle || "Survey Report"),
				facilityName: String(section.fields?.facilityName || ""),
				startDate: String(section.fields?.startDate || ""),
				endDate: String(section.fields?.endDate || ""),
				clientName: String(section.fields?.clientName || ""),
				preparedBy: String(section.fields?.preparedBy || "Justin O'Neill"),
				documentId: String(section.fields?.documentId || "DOC-001"),
			},
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
			title:
				typeof section.title === "string"
					? section.title
					: template?.title || "Time Log",
			icon:
				typeof section.icon === "string"
					? section.icon
					: template?.icon || "⏱️",
			open: Boolean(section.open),
			locked: template ? true : Boolean(section.locked),
			placement: template?.placement || section.placement || "middle",
			days: days.length ? days : [createTimeDay()],
			photos,
		};
	}

	return {
		id: typeof section.id === "string" ? section.id : nextId("section"),
		type: "photos",
		title:
			typeof section.title === "string"
				? section.title
				: template?.title || `New Section ${index + 1}`,
		icon:
			typeof section.icon === "string"
				? section.icon
				: template?.icon || "🧩",
		open: Boolean(section.open),
		locked: template ? true : Boolean(section.locked),
		placement: template?.placement || section.placement || "middle",
		description: String((section as projectTypes.PhotosSectionType)?.description || ""),
		photos,
	};
}

export function loadState(): projectTypes.PersistedStateType {
	const defaults = createDefaultState();
	const parsed = getStorageItem<Partial<projectTypes.PersistedStateType>>(storageKey, {});

	if (!parsed || typeof parsed !== "object" || !("sections" in parsed)) {
		return defaults;
	}

	try {
		const parsedSections = Array.isArray(parsed.sections)
			? parsed.sections.filter(
					(section: unknown) =>
						(section as { id?: string; type?: string }).id !==
							"section-table-of-contents" &&
						(section as { id?: string; type?: string }).type !== "toc",
			  )
			: defaults.sections;

		const normalizedSections = orderSections(parsedSections.map(normalizeSection));
		const hasOpenSection = normalizedSections.some((section) => section.open);

		return {
			activeTab: parsed.activeTab === "preview" ? "preview" : "create",
			previewZoom:
				typeof parsed.previewZoom === "number" ? parsed.previewZoom : 1,
			hasUserZoomed:
				typeof parsed.hasUserZoomed === "boolean"
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
