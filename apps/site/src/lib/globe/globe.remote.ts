import { query } from "$app/server";
import type { Location, Port } from "@layerd/ui";
import * as v from "valibot";

type GlobeRecord = Record<string, unknown>;
type GlobeCollection = GlobeRecord[];

function isCoordinateValue(value: unknown): value is string | number {
	return typeof value === "string" || typeof value === "number";
}

function getTextValue(value: unknown) {
	if (typeof value === "string") return value.trim();
	if (typeof value === "number") return String(value);
	return "";
}

function getOptionalTextValue(value: unknown) {
	const text = getTextValue(value);
	return text || undefined;
}

function toLocation(record: GlobeRecord): Location | null {
	const location = getTextValue(record.location);
	const { lat, lng } = record;

	if (!location || !isCoordinateValue(lat) || !isCoordinateValue(lng)) {
		return null;
	}

	return {
		...(typeof record.id === "string" || typeof record.id === "number"
			? { id: record.id }
			: {}),
		location,
		lat,
		lng,
		...(getOptionalTextValue(record.flag)
			? { flag: getOptionalTextValue(record.flag) }
			: {}),
		...(getOptionalTextValue(record.continent)
			? { continent: getOptionalTextValue(record.continent) }
			: {}),
		...(getOptionalTextValue(record.phone)
			? { phone: getOptionalTextValue(record.phone) }
			: {}),
		...(getOptionalTextValue(record.email)
			? { email: getOptionalTextValue(record.email) }
			: {}),
	};
}

function toPort(record: GlobeRecord, index: number): Port | null {
	const location = getTextValue(record.location);
	const port = getTextValue(record.port);
	const city = getTextValue(record.city);
	const country = getTextValue(record.country);
	const { lat, lng } = record;

	if (
		!location ||
		!port ||
		!city ||
		!country ||
		!isCoordinateValue(lat) ||
		!isCoordinateValue(lng)
	) {
		return null;
	}

	return {
		id: getTextValue(record.id) || `port-${index}`,
		location,
		port,
		city,
		country,
		lat,
		lng,
		...(getOptionalTextValue(record.admin_division)
			? { admin_division: getOptionalTextValue(record.admin_division) }
			: {}),
	};
}

async function fetchSheetariSheet(
	baseUrl: string,
	sheet: string,
): Promise<GlobeCollection> {
	try {
		const response = await fetch(`${baseUrl}/${sheet}`);

		if (!response.ok) {
			console.error(
				`Failed to fetch globe sheet \"${sheet}\": ${response.status}`,
			);
			return [];
		}

		const data = await response.json();

		if (!Array.isArray(data)) {
			console.error(`Globe sheet \"${sheet}\" returned non-array data.`);
			return [];
		}

		return data.filter(
			(item): item is GlobeRecord => typeof item === "object" && item !== null,
		);
	} catch (error) {
		console.error(`Failed to fetch globe sheet \"${sheet}\"`, error);
		return [];
	}
}

// Batch fetch multiple sheets from the same Sheetari spreadsheet
const getSheetariData = query.batch(v.string(), async (sheets) => {
	const baseUrl =
		"https://sheetari.oneezy.deno.net/1_BNtsJr9TaSYRPFAKcAd9pa_TUQyYBfqEZiDvDvkPTw";

	const responses = await Promise.all(
		sheets.map((sheet) => fetchSheetariSheet(baseUrl, sheet)),
	);

	// Return a function that maps sheet name to its data
	return (sheet) => responses[sheets.indexOf(sheet)] ?? [];
});

// Query functions that use the batched data fetcher
export const getGlobeLocations = query(async () => {
	const rows = await getSheetariData("locations");
	return rows.map(toLocation).filter((row): row is Location => Boolean(row));
});

export const getGlobePorts = query(async () => {
	const rows = await getSheetariData("ports");
	return rows
		.map((row, index) => toPort(row, index))
		.filter((row): row is Port => Boolean(row));
});
