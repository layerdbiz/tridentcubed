import { prerender } from "$app/server";

// ✅ Export interface for TypeScript support in components
export interface TestimonialData {
	id: string;
	title: string;
	subtitle: string;
	description: string;
	name?: string;
	company?: string;
}

export const getTestimonialsData = prerender(async () => {
	try {
		// Sheetari URL structure: https://sheetari.oneezy.deno.net/{sheetId}/{sheetName}
		const response = await fetch(
			"https://sheetari.oneezy.deno.net/1BT2OPDOA-sEIF-JkyikVrB3StvsfdJNAnP4ih9bHhj4/testimonials",
		);

		if (!response.ok) {
			console.warn(`Failed to fetch testimonials data: ${response.status}`);
			return [];
		}

		const data = await response.json();

		// Validate data is an array
		if (!Array.isArray(data)) {
			return [];
		}

		// Map and filter the API data to match component expectations
		const validTestimonials = data
			.filter((item: any) =>
				item && item.id && (item.title || item.name) && item.description
			) // Filter out invalid entries
			.map((item: any): TestimonialData => ({
				id: String(item.id), // Ensure string type
				title: item.title || item.name || "Anonymous", // Map API fields to component props
				subtitle: item.subtitle || item.company || "Customer",
				description: item.description || item.quote || "Great service!",
				name: item.name,
				company: item.company,
			}));

		return validTestimonials;
	} catch (error) {
		// Return empty array as fallback to prevent crashes
		console.warn(`Testimonials fetch error during prerender: ${error}`);
		return [];
	}
}, {
	// CRITICAL: Required for no-argument prerender functions due to async SSR limitations
	inputs: () => [undefined],
});
