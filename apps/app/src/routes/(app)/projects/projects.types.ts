export type ProjectsRouteModeType = "edit" | "preview";

export type TabType = "create" | "preview";
export type SectionKindType = "fields" | "cover" | "time-log" | "photos";
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

export type FieldStateValueType = string | string[];

export type DetailsFieldsType = Record<string, FieldStateValueType>;

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
	enabled: boolean;
	placement: SectionPlacementType;
	photos: PhotoItemType[];
}

export interface FieldSectionType extends SectionBaseType {
	type: "fields" | "cover";
	section: string;
	fields: DetailsFieldsType;
}

export interface TimeLogSectionType extends SectionBaseType {
	type: "time-log";
	days: TimeDayType[];
}

export interface PhotosSectionType extends SectionBaseType {
	type: "photos";
	description: string;
	variant: string;
	pageId: string | null;
	required: boolean;
}

export type SectionType =
	| FieldSectionType
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
	placement: SectionPlacementType;
	create: () => T;
}

export type FieldSourceType =
	| "user"
	| "system"
	| "prefilled"
	| "derived"
	| "template"
	| "external";

export type FieldValueType =
	| "string"
	| "number"
	| "boolean"
	| "date"
	| "datetime"
	| "enum"
	| "object"
	| "array"
	| "file"
	| "image"
	| "richtext";

export type FieldInputType =
	| "text"
	| "textarea"
	| "select"
	| "multiselect"
	| "date"
	| "datetime"
	| "number"
	| "email"
	| "tel"
	| "url"
	| "file"
	| "image"
	| "checkbox"
	| "radio"
	| "repeater"
	| "richtext"
	| "hidden";

export type FieldVisibilityType = "visible" | "hidden" | "conditional";
export type OutputPageSectionType = "header" | "main" | "footer";
export type PreviewPageVariantType =
	| "full"
	| "toc"
	| "list"
	| "template"
	| "team"
	| "table"
	| "photo";

export interface FieldDefinitionType {
	id: string;
	visibility: FieldVisibilityType | null;
	section: string;
	label: string;
	path: string;
	source: FieldSourceType | null;
	type: FieldValueType | null;
	input: FieldInputType | null;
	options: string[];
	placeholder: string;
	value: string;
	editable: boolean;
	required: boolean;
	repeatable: boolean;
	validation: string[];
	outputToPages: string[];
	outputToPageSection: OutputPageSectionType[];
	example: string;
	notes: string;
	reference: string[];
}

export interface PageDefinitionType {
	id: string;
	order: number;
	required: boolean;
	page: string;
	type: PreviewPageVariantType | string;
	section: OutputPageSectionType[];
	notes: string;
	reference: string;
}

export interface ProjectDefinitionsType {
	fields: FieldDefinitionType[];
	pages: PageDefinitionType[];
}

export interface FieldGroupDefinitionType {
	section: string;
	fields: FieldDefinitionType[];
}

export interface ProjectSchemaType {
	fieldGroups: FieldGroupDefinitionType[];
	pages: PageDefinitionType[];
	coverFieldPaths: string[];
	customVariantOptions: string[];
	coverPageTitle: string;
	tocPageTitle: string;
	timeLogPageTitle: string;
	disclaimerPageTitle: string;
}

export type PreviewPageKindType =
	| "cover"
	| "toc"
	| "template"
	| "team"
	| "time-log"
	| "photo"
	| "disclaimer";

export interface PreviewPageItemType {
	id: string;
	title: string;
	kind: PreviewPageKindType;
	pageDefinition: PageDefinitionType | null;
	section: TimeLogSectionType | PhotosSectionType | null;
}

export interface PreviewSummaryItemType {
	label: string;
	value: string;
	emphasis?: boolean;
}

export interface PreviewPersonnelItemType {
	name: string;
	role: string;
	isPrimary?: boolean;
}
