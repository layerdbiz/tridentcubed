import type {
	CoverSection,
	PersistedState,
	PhotosSection,
	Section,
	SectionTemplate,
	TimeDay,
	TimeEntry,
	TimeLogSection,
} from "./types";
import { nextId } from "./utils/id";

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
