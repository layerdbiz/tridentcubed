import { query } from "$app/server";
import type * as simpleTypes from "./simple.types";

const API_BASE = "https://sheetari.oneezy.deno.net";
const SIMPLE_SHEET_ID = "168y62pKEigKGX2ZQTCv6_STAdGN8chLRBV26OczVFhE";
const PANEL_DEFINITIONS_URL = `${API_BASE}/${SIMPLE_SHEET_ID}/panels`;
const INPUT_DEFINITIONS_URL = `${API_BASE}/${SIMPLE_SHEET_ID}/inputs`;
const PAGE_DEFINITIONS_URL = `${API_BASE}/${SIMPLE_SHEET_ID}/pages`;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function asArray<T>(value: unknown): T[] {
	return Array.isArray(value) ? (value as T[]) : [];
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

function toVisibility(value: unknown): simpleTypes.SimpleVisibilityType | null {
	const text = toText(value);
	if (!text) return null;

	if (
		text === "visible" ||
		text === "hidden" ||
		text === "conditional" ||
		text === "none"
	) {
		return text;
	}

	return null;
}

function toSections(value: unknown): simpleTypes.SimplePageSectionType[] {
	return toList(value).filter(
		(item): item is simpleTypes.SimplePageSectionType => {
			return (
				item === "header" ||
				item === "main" ||
				item === "footer" ||
				item === "top" ||
				item === "right" ||
				item === "bottom" ||
				item === "left" ||
				item === "center"
			);
		},
	);
}

function toInputType(value: unknown): simpleTypes.SimpleInputType | null {
	const text = toText(value);
	if (!text) return null;

	return text as simpleTypes.SimpleInputType;
}

function toFieldType(value: unknown): simpleTypes.SimpleFieldType | null {
	const text = toText(value);
	if (!text) return null;

	return text as simpleTypes.SimpleFieldType;
}

function toPanelLayout(value: unknown): simpleTypes.SimplePanelLayoutType {
	const text = toText(value).toLowerCase();

	if (text === "list") return "list";
	if (text === "photo") return "photo";
	if (text === "timelog") return "timelog";
	if (text === "page") return "page";

	return "default";
}

function normalizePanelDefinition(
	value: unknown,
): simpleTypes.SimplePanelDefinitionType | null {
	if (!isRecord(value)) return null;

	const id = toIdText(value.id);
	const title = toText(value.title);

	if (!id || !title) return null;

	return {
		id,
		order: toNumber(value.order, Number.MAX_SAFE_INTEGER),
		visibility: toVisibility(value.visibility),
		icon: toText(value.icon),
		title,
		description: toText(value.description),
		layout: toPanelLayout(value.layout),
		required: toBoolean(value.required, false),
		enabled: toBoolean(value.enabled, true),
		readonly: toBoolean(value.readonly, false),
		draggable: toBoolean(value.draggable, false),
		notes: toText(value.notes),
	};
}

function normalizeInputDefinition(
	value: unknown,
): simpleTypes.SimpleInputDefinitionType | null {
	if (!isRecord(value)) return null;

	const id = toIdText(value.id);
	const panel = toText(value.panel);
	const label = toText(value.label);
	const path = toText(value.path);

	if (!id || !panel || !label) return null;

	return {
		id,
		order: toNumber(value.order, Number.MAX_SAFE_INTEGER),
		visibility: toVisibility(value.visibility),
		panel,
		label,
		path: path || id,
		input: toInputType(value.input),
		type: toFieldType(value.type),
		page: toList(value.page || value.pages || value.outputToPages),
		section: toSections(value.section || value.outputToPageSection),
		options: toList(value.options),
		placeholder: toText(value.placeholder),
		value: toText(value.value),
		description: toText(value.description),
		required: toBoolean(value.required, false),
		readonly: toBoolean(value.readonly, false),
		repeatable: toBoolean(value.repeatable, false),
		notes: toText(value.notes),
		example: toText(value.example),
	};
}

function normalizePageDefinition(
	value: unknown,
): simpleTypes.SimplePageDefinitionType | null {
	if (!isRecord(value)) return null;

	const id = toIdText(value.id);
	const page = toText(value.page);

	if (!id || !page) return null;

	return {
		id,
		order: toNumber(value.order, Number.MAX_SAFE_INTEGER),
		visibility: toVisibility(value.visibility),
		required: toBoolean(value.required, false),
		page,
		layout: toText(value.layout || value.variant) || "page-a",
		section: toSections(value.section),
		include: toBoolean(value.include, toBoolean(value.show, false)),
		notes: toText(value.notes),
	};
}

async function fetchSheetariArray(urls: string | string[]): Promise<unknown[]> {
	const urlList = Array.isArray(urls) ? urls : [urls];

	for (const url of urlList) {
		try {
			const response = await fetch(url);
			if (!response.ok) {
				console.warn(
					`Failed to fetch simple route definitions from ${url}: ${response.status}`,
				);
				continue;
			}

			const data = await response.json();
			return asArray(data);
		} catch (error) {
			console.warn(`Simple route definitions fetch error for ${url}:`, error);
		}
	}

	return [];
}

async function getSimpleDefinitions(): Promise<
	simpleTypes.SimpleDefinitionsType
> {
	const [panelsData, inputsData, pagesData] = await Promise
		.all([
			fetchSheetariArray(PANEL_DEFINITIONS_URL),
			fetchSheetariArray(INPUT_DEFINITIONS_URL),
			fetchSheetariArray(PAGE_DEFINITIONS_URL),
		]);

	return {
		panels: panelsData
			.map(normalizePanelDefinition)
			.filter((item): item is simpleTypes.SimplePanelDefinitionType =>
				item !== null
			),
		inputs: inputsData
			.map(normalizeInputDefinition)
			.filter((item): item is simpleTypes.SimpleInputDefinitionType =>
				item !== null
			),
		pages: pagesData
			.map(normalizePageDefinition)
			.filter((item): item is simpleTypes.SimplePageDefinitionType =>
				item !== null
			),
	};
}

export const fetchSimpleDefinitions = query(async () => {
	return getSimpleDefinitions();
});
