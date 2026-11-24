// Converting a picture a device sent untouched (#294; ADR 0004): a HEIC Chrome cannot read on Windows or Android, a
// TIFF, or a photo whose own copy fell short (#292). The upload helper asks once the bytes are in storage, and gives
// the row the file's address only when this answers done. The work, who may ask (the member who sent it) and what is
// kept are in #lib/server/convert.ts. The sign-in guard refuses a signed-out visitor or a Guest before this runs; this checks
// again itself, as a remote function would.
import { json } from '@sveltejs/kit';
import * as v from 'valibot';
import { CONVERT_REQUEST } from '#lib/files/files.schema.js';
import { convertFile } from '#lib/server/convert.js';
import { getServer } from '#lib/server/server.js';
import type { RequestHandler } from './$types';

// Its own Vercel function: sharp and libheif load only here, with time for a cold start and a full-size photo.
export const config = { maxDuration: 300, split: true };

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.actor?.organizationId) {
		return json({ isDone: false, reason: 'Sign in first.' }, { status: 401 });
	}
	const asked = v.safeParse(CONVERT_REQUEST, await request.json().catch(() => null));
	if (!asked.success) {
		return json({ isDone: false, reason: 'Say which file to convert.' }, { status: 400 });
	}
	const { claims, store } = await getServer();
	if (!claims || !store) {
		const reason = 'Files cannot be kept yet: storage is not set up.';
		return json({ isDone: false, reason }, { status: 503 });
	}
	return json(await convertFile(claims, locals.actor, store, asked.output.id));
};
