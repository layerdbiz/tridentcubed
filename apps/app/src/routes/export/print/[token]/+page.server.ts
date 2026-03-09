import { error } from "@sveltejs/kit";

import { getExportSession } from "$lib/server/export-session-store";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ params }) => {
	const session = getExportSession(params.token);

	if (!session) {
		error(404, "Export session not found.");
	}

	return {
		filename: session.filename,
		markup: session.markup,
	};
};
