import { prerender } from "$app/server";

export interface FaqItem {
	id: string;
	label: string;
	content: string;
	category: string;
}

export const getFaqData = prerender(async () => {
	try {
		const response = await fetch(
			"https://sheetari.oneezy.deno.net/1BT2OPDOA-sEIF-JkyikVrB3StvsfdJNAnP4ih9bHhj4/faq",
		);

		if (!response.ok) {
			console.warn(`Failed to fetch FAQ: ${response.status}`);
			return [];
		}

		const data = await response.json();

		// Map the API data to match the expected component structure
		const validFaqs = data.map((faq: any): FaqItem => ({
			id: faq.id,
			label: faq.question, // API 'question' maps to component 'label'
			content: faq.answer, // API 'answer' maps to component 'content'
			category: faq.category,
		}));

		return validFaqs;
	} catch (error) {
		// Return empty array as fallback to prevent build crashes
		console.warn(`FAQ fetch error during prerender: ${error}`);
		return [];
	}
}, {
	// CRITICAL: Required for no-argument prerender functions due to async SSR limitations
	inputs: () => [undefined],
});
