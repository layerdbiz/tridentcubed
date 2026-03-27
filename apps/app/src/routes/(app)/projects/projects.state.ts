import { storageKey } from "./projects.constants";
import type {
	CoverSection,
	DetailsFields,
	PersistedState,
	PhotoItem,
	PhotosSection,
	Section,
	SectionPlacement,
	SectionTemplate,
	TimeDay,
	TimeEntry,
	TimeLogSection,
} from "./projects.types";
import { getStorageItem, nextId } from "./projects.utils";

export const createTimeEntry = (): TimeEntry => ({
	id: nextId("entry"),
	time: "",
	text: "",
});

export const createTimeDay = (): TimeDay => ({
	id: nextId("day"),
	dateISO: "",
	entries: [createTimeEntry()],
});

export const createCoverSection = (): CoverSection => ({
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

export const createTimeLogSection = (): TimeLogSection => ({
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

export const createOutroSection = (): PhotosSection => ({
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
): PhotosSection => ({
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

export const createInitialMiddleSections = (): PhotosSection[] => [
	createPhotoSection("Section 1", "🧩"),
	createPhotoSection("Section 2", "🧩"),
	createPhotoSection("Section 3", "🧩"),
];

export const fixedSectionTemplates: SectionTemplate[] = [
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

export function orderSections(items: Section[]): Section[] {
	const middleSections = items.filter((section) =>
		!fixedSectionIds.has(section.id)
	);

	return fixedSectionTemplates
		.filter((section) => section.placement === "start")
		.map((section) =>
			items.find((item) => item.id === section.id) ?? section.create()
		)
		.concat(middleSections)
		.concat(
			fixedSectionTemplates
				.filter((section) => section.placement === "end")
				.map((section) =>
					items.find((item) => item.id === section.id) ?? section.create()
				),
		);
}

export function createDefaultState(): PersistedState {
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

export function isSectionMovable(section: Section): boolean {
	return !section.locked && section.placement === "middle";
}

export function ensureAtLeastOneDay(section: TimeLogSection): void {
	if (!section.days.length) section.days = [createTimeDay()];
}

export function ensureAtLeastOneEntry(day: TimeDay): void {
	if (!day.entries.length) day.entries = [createTimeEntry()];
}

export function getNextCustomSectionNumber(sections: Section[]): number {
	const currentMax = sections.reduce((max, section) => {
		if (section.placement !== "middle") return max;
		const match = section.title.match(/^Section\s+(\d+)$/i);
		return match ? Math.max(max, Number(match[1])) : max;
	}, 0);

	return currentMax + 1;
}

export function normalizeTimeEntry(value: unknown): TimeEntry {
	return {
		id: typeof (value as TimeEntry)?.id === "string"
			? (value as TimeEntry).id
			: nextId("entry"),
		time: String((value as TimeEntry)?.time || ""),
		text: String((value as TimeEntry)?.text || ""),
	};
}

export function normalizeTimeDay(value: unknown): TimeDay {
	const entries = Array.isArray((value as TimeDay)?.entries)
		? (value as TimeDay).entries.map(normalizeTimeEntry)
		: [createTimeEntry()];

	return {
		id: typeof (value as TimeDay)?.id === "string"
			? (value as TimeDay).id
			: nextId("day"),
		dateISO: String((value as TimeDay)?.dateISO || ""),
		entries: entries.length ? entries : [createTimeEntry()],
	};
}

export function normalizePhotoItem(value: unknown): PhotoItem {
	return {
		id: typeof (value as PhotoItem)?.id === "string"
			? (value as PhotoItem).id
			: nextId("photo"),
		name: String((value as PhotoItem)?.name || "Photo"),
		caption: String(
			(value as PhotoItem)?.caption || (value as PhotoItem)?.name || "Photo",
		),
		src: String((value as PhotoItem)?.src || ""),
		width: Math.max(0, Number((value as PhotoItem)?.width || 0)),
		height: Math.max(0, Number((value as PhotoItem)?.height || 0)),
	};
}

export function normalizeSection(value: unknown, index: number): Section {
	const section = value as Partial<Section> & {
		fields?: Partial<DetailsFields>;
		days?: TimeDay[];
		photos?: PhotoItem[];
		locked?: boolean;
		placement?: SectionPlacement;
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
			title: typeof section.title === "string"
				? section.title
				: template?.title || "Cover Page",
			icon: typeof section.icon === "string"
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
			title: typeof section.title === "string"
				? section.title
				: template?.title || "Time Log",
			icon: typeof section.icon === "string"
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
		title: typeof section.title === "string"
			? section.title
			: template?.title || `New Section ${index + 1}`,
		icon: typeof section.icon === "string"
			? section.icon
			: template?.icon || "🧩",
		open: Boolean(section.open),
		locked: template ? true : Boolean(section.locked),
		placement: template?.placement || section.placement || "middle",
		description: String((section as PhotosSection)?.description || ""),
		photos,
	};
}

export function loadState(): PersistedState {
	const defaults = createDefaultState();
	const parsed = getStorageItem<Partial<PersistedState>>(storageKey, {});

	if (!parsed || typeof parsed !== "object" || !("sections" in parsed)) {
		return defaults;
	}

	try {
		const parsedSections = Array.isArray(parsed.sections)
			? parsed.sections.filter(
				(section) =>
					(section as { id?: string; type?: string }).id !==
						"section-table-of-contents" &&
					(section as { id?: string; type?: string }).type !== "toc",
			)
			: defaults.sections;
		const normalizedSections = orderSections(
			parsedSections.map(normalizeSection),
		);
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
