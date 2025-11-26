import { getSlidesData, getChapterNavigationData } from '$lib/slides/slides.remote';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	// Fetch slides and chapter navigation data
	const [slides, chapters] = await Promise.all([
		getSlidesData(),
		getChapterNavigationData()
	]);

	return {
		slides,
		chapters
	};
};
