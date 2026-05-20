import { persist } from "./demo.persist";
import type { DemoSeedType } from "./demo.remote";

export interface DemoInputType {
	id: string;
	collection: "inputs";
	_source: "inputs";
	label: string;
	value: string;
	seedValue: string;
	placeholder: string;
	input: string;
	description: string;
	persistPath: string;
	type: "seed-input";
}

export interface DemoModelType {
	source: string;
	fetchedAt: string | null;
	inputs: DemoInputType[];
	currentInput: DemoInputType | null;
	explicitInput: DemoInputType | null;
}

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
	return toText(value).replace(/\s+/g, "_");
}

function createDemoInput(
	id: string,
	label: string,
	seedValue = "",
	placeholder = "",
	input = "text",
	description = "",
): DemoInputType {
	const persistPath = `inputs.${id}`;
	const persistedValue = persist.read(persistPath, seedValue);

	return {
		id,
		collection: "inputs",
		_source: "inputs",
		label,
		value: persistedValue,
		seedValue,
		placeholder,
		input,
		description,
		persistPath,
		type: "seed-input",
	};
}

function normalizeSeedInput(
	value: unknown,
	index: number,
): DemoInputType | null {
	if (!isRecord(value)) return null;

	const id = toIdText(value.id) || `input_${index + 1}`;
	const label = toText(value.label) || `Input ${index + 1}`;

	return createDemoInput(
		id,
		label,
		toText(value.value),
		toText(value.placeholder),
		toText(value.input) || "text",
		toText(value.description),
	);
}

function getFallbackInputs(): DemoInputType[] {
	return [
		createDemoInput(
			"input_1",
			"Client name",
			"Trident Cubed",
			"Type a client name",
			"text",
			"Record-target persistence using the input object metadata.",
		),
		createDemoInput(
			"input_2",
			"Project title",
			"Persistence proof of concept",
			"Type a project title",
			"text",
			"Explicit string-path persistence using inputs.input_2.",
		),
		createDemoInput(
			"input_3",
			"Boolean mode",
			"",
			"Type and refresh to prove generated component scope restore",
			"text",
			"Boolean persist stays inside a generated component scope.",
		),
	];
}

export function createDemoModel(seed: DemoSeedType | null): DemoModelType {
	const normalizedInputs = asArray(seed?.inputs)
		.map((value: unknown, index: number) => normalizeSeedInput(value, index))
		.filter((value): value is DemoInputType => value !== null)
		.slice(0, 3);
	const inputs = normalizedInputs.length
		? normalizedInputs
		: getFallbackInputs();

	return {
		source: toText(seed?.source),
		fetchedAt: toText(seed?.fetchedAt) || null,
		inputs,
		currentInput: inputs[0] ?? null,
		explicitInput: inputs[1] ?? inputs[0] ?? null,
	};
}
