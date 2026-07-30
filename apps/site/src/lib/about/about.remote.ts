import { prerender } from "$app/server";

// ✅ Export interface for TypeScript support in components
export interface AboutSection {
	id: string;
	title: string;
	description: string;
	image: string;
	subsections: {
		title: string;
		content: string;
	}[];
}

export const getAboutData = prerender(async () => {
	try {
		// Sheetari URL structure: https://sheetari.oneezy.deno.net/{sheetId}/{sheetName}
		const response = await fetch(
			"https://sheetari.oneezy.deno.net/1BT2OPDOA-sEIF-JkyikVrB3StvsfdJNAnP4ih9bHhj4/about",
		);

		if (!response.ok) {
			console.warn(`Failed to fetch about data: ${response.status}`);
			return [];
		}

		const data = await response.json();

		// Validate data is an array
		if (!Array.isArray(data)) {
			return [];
		}

		// Map and filter the API data to match component expectations
		const validSections = data
			.filter((item: any) => item && item.id && item.title) // Filter out invalid entries
			.map((item: any): AboutSection => ({
				id: String(item.id), // Ensure string type
				title: item.title, // Main section title
				description: item.description || "", // Main section description
				image: item.image || "/photos/team.webp", // Section image
				subsections: [
					// Parse subsections from the sheet data using correct column names
					...(item.subtitle1 && item.section1
						? [{
							title: item.subtitle1,
							content: item.section1,
						}]
						: []),
					...(item.subtitle2 && item.section2
						? [{
							title: item.subtitle2,
							content: item.section2,
						}]
						: []),
				],
			}));

		return validSections;
	} catch (error) {
		// Return empty array as fallback to prevent crashes
		console.warn(`About fetch error during prerender: ${error}`);
		return [];
	}
}, {
	// CRITICAL: Required for no-argument prerender functions due to async SSR limitations
	inputs: () => [undefined],
});
