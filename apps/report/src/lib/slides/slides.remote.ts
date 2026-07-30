import { query } from "$app/server";
import * as v from "valibot";

// Sheetari API base URL
const SHEETARI_BASE_URL =
	"https://sheetari.oneezy.deno.net/1I9-LggRPtxWwfGMWAMT6zum03o_VsnruW7hofE1wGg0";

// Master slides sheet
const SLIDES_URL = `${SHEETARI_BASE_URL}/slides`;

// Type definitions for slide data
export interface SlideData {
	id: string;
	parent: string | null;
	order: string | null;
	photo: string | null;
	src: string | null;
	type: string;
	name: string;
	description: string | null;
	bullets: string | null;
	tags: string | null;
	data: string | null;
	view: string | null;
	status: string | null;
	priority: string | null;
	url: string | null;
	featured: string | null;
	show: string | null;
	slug: string;
	// Dynamically loaded data from other sheets
	sheetData?: any[];
}

/**
 * Fetch data from a specific Sheetari sheet tab
 */
async function fetchSheetData(sheetName: string): Promise<any[]> {
	try {
		const response = await fetch(`${SHEETARI_BASE_URL}/${sheetName}`);

		if (!response.ok) {
			console.error(`❌ Failed to fetch ${sheetName}: ${response.status}`);
			return [];
		}

		const data = await response.json();

		if (!Array.isArray(data)) {
			console.error(`❌ ${sheetName} returned non-array data`);
			return [];
		}

		console.log(`✅ Fetched ${sheetName}:`, data.length, "rows");
		return data;
	} catch (error) {
		console.error(`❌ Error fetching ${sheetName}:`, error);
		return [];
	}
}

// Navigation structure for chapters
export interface ChapterNavigation {
	type: string;
	sections: {
		slug: string;
		name: string;
	}[];
}

/**
 * Fetch all slides data
 */
export const getSlidesData = query(async () => {
	console.log("🔥 Fetching slides data...");

	try {
		const response = await fetch(SLIDES_URL);

		if (!response.ok) {
			throw new Error(`Failed to fetch slides: ${response.status}`);
		}

		const data = await response.json();

		// Validate data is an array
		if (!Array.isArray(data)) {
			console.error("❌ API returned non-array data:", data);
			return [];
		}

		// Filter out invalid entries and ensure proper typing
		const validSlides = data
			.filter((slide: any) => slide && slide.id && slide.slug)
			.map((slide: any): SlideData => ({
				id: String(slide.id),
				parent: slide.parent || null,
				order: slide.order || null,
				photo: slide.photo || null,
				src: slide.src || null,
				type: slide.type || "",
				name: slide.name || "",
				description: slide.description || null,
				bullets: slide.bullets || null,
				tags: slide.tags || null,
				data: slide.data || null,
				view: slide.view || null,
				status: slide.status || null,
				priority: slide.priority || null,
				url: slide.url || null,
				featured: slide.featured || null,
				show: slide.show || null,
				slug: slide.slug || "",
			}));

		// Load additional sheet data where needed
		const slidesWithData = await Promise.all(
			validSlides.map(async (slide) => {
				if (slide.data) {
					// Fetch data from the sheet specified in the data field
					const sheetData = await fetchSheetData(slide.data);
					return { ...slide, sheetData };
				}
				return slide;
			}),
		);

		console.log("✅ Slides fetched:", slidesWithData.length, "slides");
		return slidesWithData;
	} catch (error) {
		console.error("❌ Error fetching slides:", error);
		return [];
	}
});

/**
 * Get navigation structure organized by chapters
 */
export const getChapterNavigationData = query(async () => {
	console.log("🔥 Building chapter navigation...");

	try {
		const slides = await getSlidesData();
		const chapters = new Map<string, ChapterNavigation>();

		// Organize slides by type (chapter equivalent)
		slides.forEach((slide) => {
			if (!chapters.has(slide.type)) {
				chapters.set(slide.type, {
					type: slide.type,
					sections: [],
				});
			}

			const chapter = chapters.get(slide.type)!;
			chapter.sections.push({
				slug: slide.slug,
				name: slide.name,
			});
		});

		const navigationData = Array.from(chapters.values());
		console.log(
			"✅ Chapter navigation built:",
			navigationData.length,
			"chapters",
		);
		return navigationData;
	} catch (error) {
		console.error("❌ Error building navigation:", error);
		return [];
	}
});

/**
 * Get a single slide by slug
 */
export const getSlideBySlugData = query(
	v.string(),
	async (slug: string) => {
		const slides = await getSlidesData();
		return slides.find((slide) => slide.slug === slug) || null;
	},
);
