import { prerender } from "$app/server";

// ✅ Export interface for TypeScript support in components
export interface ServiceData {
	id: string;
	title: string;
	description: string;
	image?: string;
	label?: string;
}

export const getServicesData = prerender(async () => {
	try {
		// Sheetari URL structure: https://sheetari.oneezy.deno.net/{sheetId}/{sheetName}
		const response = await fetch(
			"https://sheetari.oneezy.deno.net/1BT2OPDOA-sEIF-JkyikVrB3StvsfdJNAnP4ih9bHhj4/services",
		);

		if (!response.ok) {
			console.warn(`Failed to fetch services data: ${response.status}`);
			return [];
		}

		const data = await response.json();

		// Validate data is an array
		if (!Array.isArray(data)) {
			return [];
		}

		// Map and filter the API data to match component expectations
		const validServices = data
			.filter((item: any) => item && item.id && item.title) // Filter out invalid entries
			.map((item: any): ServiceData => ({
				id: String(item.id), // Ensure string type
				title: item.title, // Map API fields to component props
				description: item.description || "Service description",
				image: item.image || "/photos/houston-night.webp", // Fallback image
				label: item.label || "Service", // Fallback label
			}));

		return validServices;
	} catch (error) {
		// Return empty array as fallback to prevent crashes
		console.warn(`Services fetch error during prerender: ${error}`);
		return [];
	}
}, {
	// CRITICAL: Required for no-argument prerender functions due to async SSR limitations
	inputs: () => [undefined],
});
