// One email signature for the screen (#354): the signed-in User's own, or for an Admin anyone's on the Team page or a
// shared mailbox's (`?person=<id>`, `?mailbox=<slug>`). The work, who may ask and how its pictures are made are in
// #lib/server/signature.ts. The sign-in guard refuses a signed-out visitor or a Guest before this runs; this checks
// again itself, as a remote function would.
import { json } from '@sveltejs/kit';
import * as v from 'valibot';
import { readSignature } from '#lib/server/signature.js';
import { getServer } from '#lib/server/server.js';
import type { RequestHandler } from './$types';

// Its own Vercel function: sharp loads only here, with time for a cold start and a few pictures made at once.
export const config = { maxDuration: 60, split: true };

const ASK = v.object({
	person: v.optional(v.pipe(v.string(), v.uuid())),
	mailbox: v.optional(v.pipe(v.string(), v.regex(/^[\w-]{1,80}$/)))
});

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.actor?.organizationId) {
		return json({ isAllowed: false, reason: 'Sign in first.' }, { status: 401 });
	}
	const asked = v.safeParse(ASK, {
		person: url.searchParams.get('person') ?? undefined,
		mailbox: url.searchParams.get('mailbox') ?? undefined
	});
	if (!asked.success) {
		return json({ isAllowed: false, reason: 'Say whose signature.' }, { status: 400 });
	}
	const { claims, store } = await getServer();
	if (!claims || !store) {
		const reason = 'Signatures cannot be made yet: storage is not set up.';
		return json({ isAllowed: false, reason }, { status: 503 });
	}
	const answer = await readSignature({ claims, store }, locals.actor, asked.output, {
		origin: url.origin,
		fetch
	});
	return json(answer, { headers: { 'cache-control': 'private, no-store' } });
};
