import { query } from "$app/server";

const API_BASE = "https://sheetari.deno.dev";
const DEMO_SHEET_ID = "168y62pKEigKGX2ZQTCv6_STAdGN8chLRBV26OczVFhE";
const DEMO_INPUTS_URL = `${API_BASE}/${DEMO_SHEET_ID}/inputs`;

export interface DemoSeedType {
	inputs: unknown[];
	source: string;
	fetchedAt: string;
}

function asArray<T>(value: unknown): T[] {
	return Array.isArray(value) ? (value as T[]) : [];
}

async function fetchDemoInputs(): Promise<unknown[]> {
	const response = await fetch(DEMO_INPUTS_URL);
	if (!response.ok) {
		throw new Error(`Failed to fetch demo inputs: ${response.status}`);
	}

	const data = await response.json();
	return asArray(data);
}

async function fetchDemoData(): Promise<DemoSeedType> {
	const inputs = await fetchDemoInputs();

	return {
		inputs,
		source: DEMO_INPUTS_URL,
		fetchedAt: new Date().toISOString(),
	};
}

export const getDemoData = query(async (): Promise<DemoSeedType> => {
	return fetchDemoData();
});
