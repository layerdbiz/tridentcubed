import { redirect } from "@sveltejs/kit";
import { getSlidesData } from "$lib/slides/slides.remote";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	// Fetch all slides
	const allSlides = await getSlidesData();

	// Redirect to first slide if slides exist
	if (allSlides && allSlides.length > 0) {
		redirect(307, `/${allSlides[0].slug}`);
	}

	// If no slides found, return empty data (page will show error message)
	return {};
};
