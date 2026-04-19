export type SimpleVisibilityType =
	| "visible"
	| "hidden"
	| "conditional"
	| "none";

export type SimpleInputType =
	| "text"
	| "textarea"
	| "select"
	| "select multiple"
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

export type SimpleFieldType =
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

export type SimplePageSectionType =
	| "header"
	| "main"
	| "footer"
	| "top"
	| "right"
	| "bottom"
	| "left"
	| "center";

export type SimplePanelLayoutType =
	| "default"
	| "list"
	| "photo"
	| "timelog"
	| "page";

export interface SimplePanelDefinitionType {
	id: string;
	order: number;
	visibility: SimpleVisibilityType | null;
	icon: string;
	title: string;
	description: string;
	layout: SimplePanelLayoutType;
	required: boolean;
	enabled: boolean;
	readonly: boolean;
	draggable: boolean;
	notes: string;
}

export interface SimpleInputDefinitionType {
	id: string;
	order: number;
	visibility: SimpleVisibilityType | null;
	panel: string;
	label: string;
	path: string;
	input: SimpleInputType | null;
	type: SimpleFieldType | null;
	page: string[];
	section: SimplePageSectionType[];
	options: string[];
	placeholder: string;
	value: string;
	description: string;
	required: boolean;
	readonly: boolean;
	repeatable: boolean;
	notes: string;
	example: string;
}

export interface SimplePageDefinitionType {
	id: string;
	order: number;
	visibility: SimpleVisibilityType | null;
	required: boolean;
	page: string;
	layout: string;
	section: SimplePageSectionType[];
	include: boolean;
	notes: string;
}

export interface SimpleDefinitionsType {
	inputs: SimpleInputDefinitionType[];
	panels: SimplePanelDefinitionType[];
	pages: SimplePageDefinitionType[];
}

export interface SimpleRenderedPanelType {
	panel: SimplePanelDefinitionType;
	inputs: SimpleInputDefinitionType[];
}

export interface SimpleRenderedPageType {
	page: SimplePageDefinitionType;
	inputs: SimpleInputDefinitionType[];
}
