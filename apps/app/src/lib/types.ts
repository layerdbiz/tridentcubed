export type Tab = "create" | "preview";
export type SectionType = "cover" | "time-log" | "photos";
export type SectionPlacement = "start" | "middle" | "end";
export type SectionStatus = "todo" | "in-progress" | "complete";
export type PhotoOrientation = "portrait" | "landscape" | "square";

export interface PhotoItem {
	id: string;
	name: string;
	caption: string;
	src: string;
	width: number;
	height: number;
}

export interface DetailsFields {
	reportTitle: string;
	facilityName: string;
	startDate: string;
	endDate: string;
	clientName: string;
	preparedBy: string;
	documentId: string;
}

export interface TimeEntry {
	id: string;
	time: string;
	text: string;
}

export interface TimeDay {
	id: string;
	dateISO: string;
	entries: TimeEntry[];
}

export interface SectionBase {
	id: string;
	title: string;
	icon: string;
	open: boolean;
	locked: boolean;
	placement: SectionPlacement;
	photos: PhotoItem[];
}

export interface CoverSection extends SectionBase {
	type: "cover";
	fields: DetailsFields;
}

export interface TimeLogSection extends SectionBase {
	type: "time-log";
	days: TimeDay[];
}

export interface PhotosSection extends SectionBase {
	type: "photos";
	description: string;
}

export type Section = CoverSection | TimeLogSection | PhotosSection;

export interface PersistedState {
	activeTab: Tab;
	previewZoom: number;
	hasUserZoomed: boolean;
	sections: Section[];
}

export interface SectionMetrics {
	done: number;
	total: number;
	percent: number;
}

export interface TouchReorderOptions {
	itemId: string;
	scopeId?: string;
	activate: () => void;
	hover: (targetId: string) => void;
	clearHover: () => void;
	commit: (targetId: string) => void;
	finish: () => void;
	resolveTarget: (
		clientX: number,
		clientY: number,
		scopeId?: string,
	) => string | undefined;
}

export interface ActiveTouchReorder {
	options: TouchReorderOptions;
	startX: number;
	startY: number;
	active: boolean;
	currentTargetId: string;
	timerId: ReturnType<typeof setTimeout> | null;
}

export interface SectionTemplate<T extends Section = Section> {
	id: string;
	type: T["type"];
	title: string;
	icon: string;
	placement: Exclude<SectionPlacement, "middle">;
	create: () => T;
}
