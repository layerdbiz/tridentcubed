import { getRequestEvent, query } from "$app/server";
import * as v from "valibot";

type GlobeRecord = Record<string, unknown>;
type GlobeCollection = GlobeRecord[];

const emptyGeoJson = {
	type: "FeatureCollection",
	features: [],
};

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
		"https://sheetari.deno.dev/1_BNtsJr9TaSYRPFAKcAd9pa_TUQyYBfqEZiDvDvkPTw";

	const responses = await Promise.all(
		sheets.map((sheet) => fetchSheetariSheet(baseUrl, sheet)),
	);

	// Return a function that maps sheet name to its data
	return (sheet) => responses[sheets.indexOf(sheet)] ?? [];
});

// Query functions that use the batched data fetcher
export const getGlobeLocations = query(async () => {
	return getSheetariData("locations");
});

export const getGlobePorts = query(async () => {
	return getSheetariData("ports");
});

export const getGlobePolygons = query(async () => {
	try {
		const event = getRequestEvent();
		const response = await event.fetch("/data/countries.geojson");

		if (!response.ok) {
			console.error(
				`Failed to fetch globe polygons: ${response.status}`,
			);
			return emptyGeoJson;
		}

		const data = await response.json();

		if (!data || !Array.isArray(data.features)) {
			console.error("Globe polygons returned invalid GeoJSON.");
			return emptyGeoJson;
		}

		return data;
	} catch (error) {
		console.error("Failed to fetch globe polygons", error);
		return emptyGeoJson;
	}
});
