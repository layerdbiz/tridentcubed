import { prerender } from "$app/server";

interface IconData {
	icon: string;
	category: string;
}

export const getIcons = prerender(async () => {
	try {
		const response = await fetch(
			"https://sheetari.deno.dev/1F6j_yQLz6ozaa9HzeOp_6leCZCaIIZNCK1LbZCdxnBE/+icons",
		);

		if (!response.ok) {
			console.warn(`Failed to fetch icons: ${response.status}`);
			return [];
		}

		const data: IconData[] = await response.json();

		// Return the full objects with icon and category properties
		const validIcons = data.filter((entry) =>
			entry.icon && typeof entry.icon === "string" &&
			entry.category && typeof entry.category === "string"
		);

		return validIcons;
	} catch (error) {
		console.warn(`Icons fetch error during prerender: ${error}`);
		return [];
	}
}, {
	// This is crucial for no-argument prerender functions
	inputs: () => [undefined],
});
