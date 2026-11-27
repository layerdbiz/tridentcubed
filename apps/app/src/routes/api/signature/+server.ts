// Email signatures for the screen (#354). GET: one signature, the signed-in User's own, or for an Admin anyone's on
// the Team page or a shared mailbox's (`?person=<id>`, `?mailbox=<slug>`), with a person's photos and banners to pick
// from. POST with JSON: keeps a photo or banner picked (`{ person?, photo?, banner? }`). POST with a picture
// (`?kind=photo|banner&person=<id>`): keeps an uploaded photo or banner. Each answers the signature as it is now. The
// work, who may ask and how its pictures are made are in #lib/server/signature.ts. The sign-in guard refuses a
// signed-out visitor or a Guest before this runs; this checks again itself, as a remote function would.
import { json } from '@sveltejs/kit';
import * as v from 'valibot';
import { getServer } from '#lib/server/server.js';
import {
	pickSignature,
	readSignature,
	uploadSignature,
	UPLOAD_TYPES
} from '#lib/server/signature.js';
import { MAX_UPLOAD_BYTES } from '#lib/signature/signature.constants.js';
import type { RequestHandler } from './$types';

// Its own Vercel function: sharp loads only here, with time for a cold start and a few pictures made at once.
export const config = { maxDuration: 60, split: true };

const PERSON = v.optional(v.pipe(v.string(), v.uuid()));
// What a choice names: `drive:<id>`, `upload:<file>` or a website address.
const SOURCE = v.pipe(v.string(), v.maxLength(500));

const ASK = v.object({
	person: PERSON,
	mailbox: v.optional(v.pipe(v.string(), v.regex(/^[\w-]{1,80}$/)))
});

const PICK = v.object({
	person: PERSON,
	photo: v.optional(v.nullable(v.pipe(SOURCE, v.minLength(1)))),
	banner: v.optional(v.nullable(SOURCE))
});

const UPLOAD = v.object({ person: PERSON, kind: v.picklist(['photo', 'banner']) });

const NO_STORE = { 'cache-control': 'private, no-store' };

function refuse(reason: string, status: number) {
	return json({ isAllowed: false, reason }, { status, headers: NO_STORE });
}

// The server's parts, or why signatures cannot be made here.
async function readParts(locals: App.Locals) {
	if (!locals.actor?.organizationId) return refuse('Sign in first.', 401);
	const { claims, store } = await getServer();
	if (!claims || !store) {
		return refuse('Signatures cannot be made yet: storage is not set up.', 503);
	}
	return { actor: locals.actor, server: { claims, store } };
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const parts = await readParts(locals);
	if (parts instanceof Response) return parts;
	const asked = v.safeParse(ASK, {
		person: url.searchParams.get('person') ?? undefined,
		mailbox: url.searchParams.get('mailbox') ?? undefined
	});
	if (!asked.success) return refuse('Say whose signature.', 400);
	const answer = await readSignature(parts.server, parts.actor, asked.output, {
		origin: url.origin,
		fetch
	});
	return json(answer, { headers: NO_STORE });
};

export const POST: RequestHandler = async ({ url, request, locals }) => {
	const parts = await readParts(locals);
	if (parts instanceof Response) return parts;
	const asking = { origin: url.origin, fetch };
	const type = request.headers.get('content-type')?.split(';')[0].trim() ?? '';

	if (type === 'application/json') {
		const picked = v.safeParse(PICK, await request.json().catch(() => undefined));
		if (!picked.success) return refuse('Say which photo or banner.', 400);
		const answer = await pickSignature(parts.server, parts.actor, picked.output, asking);
		return json(answer, { headers: NO_STORE });
	}

	const asked = v.safeParse(UPLOAD, {
		person: url.searchParams.get('person') ?? undefined,
		kind: url.searchParams.get('kind') ?? undefined
	});
	if (!asked.success) return refuse('Say whether it is a photo or a banner.', 400);
	if (!UPLOAD_TYPES[type]) return refuse('Send a JPEG, PNG or WebP picture.', 415);
	if (Number(request.headers.get('content-length') ?? 0) > MAX_UPLOAD_BYTES) {
		return refuse('That picture is too big. Pick a smaller one.', 413);
	}
	const bytes = new Uint8Array(await request.arrayBuffer());
	const answer = await uploadSignature(
		parts.server,
		parts.actor,
		{ ...asked.output, type, bytes },
		asking
	);
	return json(answer, { headers: NO_STORE });
};
