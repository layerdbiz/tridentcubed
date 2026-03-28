import { query } from "$app/server";
import type * as projectTypes from "./projects.types";

const API_BASE = "https://sheetari.deno.dev";
const REPORT_SHEET_ID = "1oLakDXDeEINBs0B3KSkcyM1131YnuHtAKEk6l7ClT8k";
const SECTION_DEFINITIONS_URL =
	`${API_BASE}/${REPORT_SHEET_ID}/sections?range=b1:`;
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
): projectTypes.FieldDefinitionType | null {
	if (!isRecord(value)) return null;

	const id = toIdText(value.id);
	const section = toText(value.section);
	const label = toText(value.label);
	const path = toText(value.path);

	if (!id || !section || !label || !path) {
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
		section,
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
		type: toText(value.type),
		section: toPageSections(value.section),
		notes: toText(value.notes),
		reference: toIdText(value.reference),
	};
}

async function fetchSheetariArray(url: string): Promise<unknown[]> {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.warn(
				`Failed to fetch project definitions from ${url}: ${response.status}`,
			);
			return [];
		}

		const data = await response.json();
		return asArray(data);
	} catch (error) {
		console.warn(`Project definitions fetch error for ${url}:`, error);
		return [];
	}
}

async function getFieldDefinitions(): Promise<
	projectTypes.FieldDefinitionType[]
> {
	const data = await fetchSheetariArray(SECTION_DEFINITIONS_URL);
	return data
		.map(normalizeFieldDefinition)
		.filter((item): item is projectTypes.FieldDefinitionType => item !== null);
}

async function getPageDefinitions(): Promise<
	projectTypes.PageDefinitionType[]
> {
	const data = await fetchSheetariArray(PAGE_DEFINITIONS_URL);
	return data
		.map(normalizePageDefinition)
		.filter((item): item is projectTypes.PageDefinitionType => item !== null);
}

export const fetchFieldDefinitions = query(async () => {
	return getFieldDefinitions();
});

export const fetchPageDefinitions = query(async () => {
	return getPageDefinitions();
});

export const fetchProjectDefinitions = query(async () => {
	const [fields, pages] = await Promise.all([
		getFieldDefinitions(),
		getPageDefinitions(),
	]);

	return {
		fields,
		pages,
	} satisfies projectTypes.ProjectDefinitionsType;
});
