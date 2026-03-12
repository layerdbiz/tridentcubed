import { error } from "@sveltejs/kit";

import {
	deleteExportSession,
	getExportSession,
} from "$lib/server/export-session-store";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ params }) => {
	const session = getExportSession(params.token);

	if (!session) {
		throw error(404, "Export session not found.");
	}

	deleteExportSession(params.token);

	return {
		token: params.token,
		markup: session.markup,
		filename: session.filename,
	};
};
