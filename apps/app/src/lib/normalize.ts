import type {
	DetailsFields,
	PersistedState,
	PhotoItem,
	PhotosSection,
	Section,
	SectionPlacement,
	TimeDay,
	TimeEntry,
} from "./types";
import { storageKey } from "./constants";
import { getStorageItem } from "./utils/storage";
import {
	createDefaultState,
	createTimeDay,
	createTimeEntry,
	fixedSectionTemplateById,
	orderSections,
} from "./sections";
import { nextId } from "./utils/id";

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
