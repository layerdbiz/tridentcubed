export type ProjectsRouteModeType = "edit" | "preview";

export type TabType = "create" | "preview";
export type SectionKindType = "cover" | "time-log" | "photos";
export type SectionPlacementType = "start" | "middle" | "end";
export type SectionStatusType = "todo" | "in-progress" | "complete";
export type PhotoOrientationType = "portrait" | "landscape" | "square";

export interface PhotoItemType {
	id: string;
	name: string;
	caption: string;
	src: string;
	width: number;
	height: number;
}

export interface DetailsFieldsType {
	reportTitle: string;
	facilityName: string;
	startDate: string;
	endDate: string;
	clientName: string;
	preparedBy: string;
	documentId: string;
}

export interface TimeEntryType {
	id: string;
	time: string;
	text: string;
}

export interface TimeDayType {
	id: string;
	dateISO: string;
	entries: TimeEntryType[];
}

export interface SectionBaseType {
	id: string;
	title: string;
	icon: string;
	open: boolean;
	locked: boolean;
	placement: SectionPlacementType;
	photos: PhotoItemType[];
}

export interface CoverSectionType extends SectionBaseType {
	type: "cover";
	fields: DetailsFieldsType;
}

export interface TimeLogSectionType extends SectionBaseType {
	type: "time-log";
	days: TimeDayType[];
}

export interface PhotosSectionType extends SectionBaseType {
	type: "photos";
	description: string;
}

export type SectionType =
	| CoverSectionType
	| TimeLogSectionType
	| PhotosSectionType;

export interface PersistedStateType {
	activeTab: TabType;
	previewZoom: number;
	hasUserZoomed: boolean;
	sections: SectionType[];
}

export interface SectionMetricsType {
	done: number;
	total: number;
	percent: number;
}

export interface SectionTemplateType<T extends SectionType = SectionType> {
	id: string;
	type: T["type"];
	title: string;
	icon: string;
	placement: Exclude<SectionPlacementType, "middle">;
	create: () => T;
}
