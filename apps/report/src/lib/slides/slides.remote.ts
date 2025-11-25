import { prerender } from "$app/server";
import * as v from "valibot";

// Sheetari API URL for slides
const SLIDES_URL =
	"https://sheetari.deno.dev/1I9-LggRPtxWwfGMWAMT6zum03o_VsnruW7hofE1wGg0/slides";

// Type definitions for slide data
export interface SlideData {
	id: string;
	parent: string | null;
	photo: string | null;
	chapter: string;
	section: string;
	view: string;
	title: string;
	subtitle: string | null;
	src: string | null;
	slug: string;
}

// Navigation structure for chapters
export interface ChapterNavigation {
	chapter: string;
	sections: {
		section: string;
		slug: string;
		title: string;
	}[];
}

/**
 * Fetch all slides data
 */
export const getSlidesData = prerender(async () => {
	console.log("🔥 Fetching slides data during prerender...");

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
				photo: slide.photo || null,
				chapter: slide.chapter || "",
				section: slide.section || "",
				view: slide.view || "default",
				title: slide.title || "",
				subtitle: slide.subtitle || null,
				src: slide.src || null,
				slug: slide.slug || "",
			}));

		console.log("✅ Slides prerendered:", validSlides.length, "slides");
		return validSlides;
	} catch (error) {
		console.error("❌ Error fetching slides:", error);
		return [];
	}
}, {
	inputs: () => [undefined],
});

/**
 * Get navigation structure organized by chapters
 */
export const getChapterNavigationData = prerender(async () => {
	console.log("🔥 Building chapter navigation during prerender...");

	try {
		const slides = await getSlidesData();
		const chapters = new Map<string, ChapterNavigation>();

		// Organize slides by chapter
		slides.forEach((slide) => {
			if (!chapters.has(slide.chapter)) {
				chapters.set(slide.chapter, {
					chapter: slide.chapter,
					sections: [],
				});
			}

			const chapter = chapters.get(slide.chapter)!;
			chapter.sections.push({
				section: slide.section,
				slug: slide.slug,
				title: slide.title,
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
}, {
	inputs: () => [undefined],
});

/**
 * Get a single slide by slug
 */
export const getSlideBySlugData = prerender(
	v.string(),
	async (slug: string) => {
		const slides = await getSlidesData();
		return slides.find((slide) => slide.slug === slug) || null;
	},
	{
		inputs: async () => {
			const slides = await getSlidesData();
			return slides.map((slide) => slide.slug);
		},
	},
);
