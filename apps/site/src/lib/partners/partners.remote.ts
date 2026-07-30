import { prerender } from "$app/server";

export interface PartnerProps {
	id: string;
	name: string;
	img: string;
	url?: string;
}

export const getPartnersData = prerender(async () => {
	try {
		const response = await fetch(
			"https://sheetari.oneezy.deno.net/1BT2OPDOA-sEIF-JkyikVrB3StvsfdJNAnP4ih9bHhj4/partners",
		);

		if (!response.ok) {
			console.warn(`Failed to fetch partners: ${response.status}`);
			return [];
		}

		const data = await response.json();

		// Validate data is an array
		if (!Array.isArray(data)) {
			return [];
		}

		// Map the API data to match the expected component structure
		const validPartners = data
			.filter((partner: any) =>
				partner && partner.id && partner.name && partner.src
			)
			.map((partner: any): PartnerProps => ({
				id: String(partner.id),
				name: partner.name, // API 'name' maps to component 'name'
				img: partner.src, // API 'src' maps to component 'img'
				url: partner.url || undefined, // API 'url' maps to component 'url' (optional)
			}));

		return validPartners;
	} catch (error) {
		// Return empty array as fallback
		console.warn(`Partners fetch error during prerender: ${error}`);
		return [];
	}
}, {
	// CRITICAL: Required for no-argument prerender functions due to async SSR limitations
	inputs: () => [undefined],
});
