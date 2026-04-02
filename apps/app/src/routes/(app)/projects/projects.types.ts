export type ProjectsRouteModeType = "edit" | "preview";

export type TabType = "create" | "preview";
export type PanelKindType = "fields" | "cover" | "time-log" | "photos";
export type SectionKindType = PanelKindType;
export type PanelPlacementType = "start" | "middle" | "end";
export type SectionPlacementType = PanelPlacementType;
export type PanelStatusType = "todo" | "in-progress" | "complete";
export type SectionStatusType = PanelStatusType;
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

export interface PanelBaseType {
	id: string;
	title: string;
	icon: string;
	open: boolean;
	locked: boolean;
	enabled: boolean;
	placement: PanelPlacementType;
	photos: PhotoItemType[];
}

export type SectionBaseType = PanelBaseType;

export interface FieldPanelType extends PanelBaseType {
	type: "fields" | "cover";
	section: string;
	fields: DetailsFieldsType;
}

export type FieldSectionType = FieldPanelType;

export interface TimeLogPanelType extends PanelBaseType {
	type: "time-log";
	days: TimeDayType[];
}

export type TimeLogSectionType = TimeLogPanelType;

export interface PhotosPanelType extends PanelBaseType {
	type: "photos";
	description: string;
	variant: string;
	files: string[];
	panelId: string | null;
	pageId: string | null;
	required: boolean;
}

export type PhotosSectionType = PhotosPanelType;

export type PanelType =
	| FieldPanelType
	| TimeLogPanelType
	| PhotosPanelType;

export type SectionType = PanelType;

export interface PersistedStateType {
	activeTab: TabType;
	previewZoom: number;
	hasUserZoomed: boolean;
	sections: PanelType[];
}

export interface PanelMetricsType {
	done: number;
	total: number;
	percent: number;
}

export type SectionMetricsType = PanelMetricsType;

export interface PanelTemplateType<T extends PanelType = PanelType> {
	id: string;
	type: T["type"];
	title: string;
	icon: string;
	placement: PanelPlacementType;
	create: () => T;
}

export type SectionTemplateType<T extends SectionType = SectionType> =
	PanelTemplateType<T>;

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
export type PanelRendererType = "fields" | "time-log" | "photos" | "custom";
export type OutputPageSectionType = "header" | "main" | "footer";
export type PreviewPageVariantType =
	| "full"
	| "toc"
	| "list"
	| "template"
	| "team"
	| "table"
	| "photo";

export interface InputDefinitionType {
	id: string;
	visibility: FieldVisibilityType | null;
	panel: string;
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

export type FieldDefinitionType = InputDefinitionType;

export interface PanelDefinitionType {
	id: string;
	order: number;
	visibility: FieldVisibilityType | null;
	icon: string;
	title: string;
	type: PanelRendererType | null;
	description: string;
	required: boolean;
	readonly: boolean;
	enabled: boolean;
	draggable: boolean;
	notes: string;
	reference: string[];
	photo: string;
	iconClass: string;
	iconUrl: string;
}

export interface PageDefinitionType {
	id: string;
	order: number;
	required: boolean;
	page: string;
	variant: PreviewPageVariantType | string;
	section: OutputPageSectionType[];
	notes: string;
	reference: string;
}

export interface ProjectDefinitionsType {
	inputs: InputDefinitionType[];
	panels: PanelDefinitionType[];
	pages: PageDefinitionType[];
}

export interface PanelInputGroupDefinitionType {
	panel: string;
	inputs: InputDefinitionType[];
}

export interface FieldGroupDefinitionType {
	section: string;
	fields: InputDefinitionType[];
}

export interface ProjectSchemaType {
	panels: PanelDefinitionType[];
	inputGroups: PanelInputGroupDefinitionType[];
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

export type ProjectDataPrimitiveType = string | number | boolean | null;

export interface ProjectDataArrayType extends Array<ProjectDataNodeType> {}

export interface ProjectDataRecordType {
	[key: string]: ProjectDataNodeType;
}

export type ProjectDataNodeType =
	| ProjectDataPrimitiveType
	| ProjectDataRecordType
	| ProjectDataArrayType;

export interface ProjectRuntimePanelStateType {
	id: string;
	type: SectionKindType;
	enabled: boolean;
	locked: boolean;
	placement: SectionPlacementType;
	title: string;
	icon: string;
}

export interface ProjectRuntimeMetaType {
	panels: Record<string, ProjectRuntimePanelStateType>;
}

export type ProjectDataType = ProjectDataRecordType;
