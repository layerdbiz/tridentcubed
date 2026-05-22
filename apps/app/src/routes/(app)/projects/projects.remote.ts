import { query } from "$app/server";
import type * as projectTypes from "./projects.types";

const API_BASE = "https://sheetari.deno.dev";
const REPORT_SHEET_ID = "1oLakDXDeEINBs0B3KSkcyM1131YnuHtAKEk6l7ClT8k";
const INPUT_DEFINITIONS_URL =
	`${API_BASE}/${REPORT_SHEET_ID}/inputs?range=b1:u`;
const PANEL_DEFINITIONS_URL = `${API_BASE}/${REPORT_SHEET_ID}/panels`;
const PAGE_DEFINITIONS_URL = `${API_BASE}/${REPORT_SHEET_ID}/pages`;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function asArray<T>(value: unknown): T[] {
	return Array.isArray(value) ? value as T[] : [];
}

function toText(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function toIdText(value: unknown): string {
	return toText(value).replace(/\s+/g, "");
}

function toList(value: unknown): string[] {
	return toText(value)
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function toBoolean(value: unknown, fallback = false): boolean {
	if (typeof value === "boolean") return value;

	const text = toText(value).toLowerCase();
	if (text === "true") return true;
	if (text === "false") return false;

	return fallback;
}

function toNumber(value: unknown, fallback = 0): number {
	const numericValue = Number(toText(value));
	return Number.isFinite(numericValue) ? numericValue : fallback;
}

function toPageSections(value: unknown): projectTypes.OutputPageSectionType[] {
	return toList(value).filter(
		(item): item is projectTypes.OutputPageSectionType => {
			return item === "header" || item === "main" || item === "footer";
		},
	);
}

function normalizeFieldDefinition(
	value: unknown,
): projectTypes.InputDefinitionType | null {
	if (!isRecord(value)) return null;

	const id = toIdText(value.id);
	const panel = toText(value.panel || value.section);
	const label = toText(value.label);
	const path = toText(value.path);

	if (!id || !panel || !label || !path) {
		return null;
	}

	const visibility = toText(value.visibility);
	const source = toText(value.source);
	const type = toText(value.type);
	const input = toText(value.input);

	return {
		id,
		visibility: visibility
			? visibility as projectTypes.FieldVisibilityType
			: null,
		panel,
		label,
		path,
		source: source ? source as projectTypes.FieldSourceType : null,
		type: type ? type as projectTypes.FieldValueType : null,
		input: input ? input as projectTypes.FieldInputType : null,
		options: toList(value.options),
		placeholder: toText(value.placeholder),
		value: toText(value.value),
		editable: toBoolean(value.editable, true),
		required: toBoolean(value.required, false),
		repeatable: toBoolean(value.repeatable, false),
		validation: toList(value.validation),
		outputToPages: toList(value.outputToPages),
		outputToPageSection: toPageSections(value.outputToPageSection),
		example: toText(value.example),
		notes: toText(value.notes),
		reference: toList(value.reference),
	};
}

function normalizePanelDefinition(
	value: unknown,
): projectTypes.PanelDefinitionType | null {
	if (!isRecord(value)) return null;

	const id = toIdText(value.id);
	const title = toText(value.title);

	if (!id || !title) return null;

	const visibility = toText(value.visibility);
	const type = toText(value.type);

	return {
		id,
		order: toNumber(value.order),
		visibility: visibility
			? visibility as projectTypes.FieldVisibilityType
			: null,
		icon: toText(value.icon),
		title,
		type: type ? type as projectTypes.PanelRendererType : null,
		description: toText(value.description),
		required: toBoolean(value.required, false),
		readonly: toBoolean(value.readonly, false),
		enabled: toBoolean(value.enabled, true),
		draggable: toBoolean(value.draggable, true),
		notes: toText(value.notes),
		reference: toList(value.reference),
		photo: toText(value.photo),
		iconClass: toText(value.iconClass),
		iconUrl: toText(value.iconUrl),
	};
}

function normalizePageDefinition(
	value: unknown,
): projectTypes.PageDefinitionType | null {
	if (!isRecord(value)) return null;

	const id = toIdText(value.id);
	const page = toText(value.page);
	if (!id || !page) return null;

	return {
		id,
		order: toNumber(value.order),
		required: toBoolean(value.required, false),
		page,
		variant: toText(value.variant || value.type),
		section: toPageSections(value.section),
		notes: toText(value.notes),
		reference: toIdText(value.reference),
	};
}

async function fetchSheetariArray(url: string): Promise<unknown[]> {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			return [];
		}

		const data = await response.json();
		return asArray(data);
	} catch {
		return [];
	}
}

async function getFieldDefinitions(): Promise<
	projectTypes.InputDefinitionType[]
> {
	const data = await fetchSheetariArray(INPUT_DEFINITIONS_URL);
	return data
		.map(normalizeFieldDefinition)
		.filter((item): item is projectTypes.InputDefinitionType => item !== null);
}

async function getPanelDefinitions(): Promise<
	projectTypes.PanelDefinitionType[]
> {
	const data = await fetchSheetariArray(PANEL_DEFINITIONS_URL);
	return data
		.map(normalizePanelDefinition)
		.filter((item): item is projectTypes.PanelDefinitionType => item !== null);
}

async function getPageDefinitions(): Promise<
	projectTypes.PageDefinitionType[]
> {
	const data = await fetchSheetariArray(PAGE_DEFINITIONS_URL);
	return data
		.map(normalizePageDefinition)
		.filter((item): item is projectTypes.PageDefinitionType => item !== null);
}

export const fetchInputDefinitions = query(async () => {
	return getFieldDefinitions();
});

export const fetchFieldDefinitions = fetchInputDefinitions;

export const fetchPanelDefinitions = query(async () => {
	return getPanelDefinitions();
});

export const fetchPageDefinitions = query(async () => {
	return getPageDefinitions();
});

export const fetchProjectDefinitions = query(async () => {
	const [inputs, panels, pages] = await Promise.all([
		getFieldDefinitions(),
		getPanelDefinitions(),
		getPageDefinitions(),
	]);

	return {
		inputs,
		panels,
		pages,
	} satisfies projectTypes.ProjectDefinitionsType;
});
