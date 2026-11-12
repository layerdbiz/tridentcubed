// The data layer of everything that saves (ADR 0005 and its 2026-11-12 amendment; spec #179; #183): one query for
// the organization's lists and the one save command. Both are public endpoints, so each checks the request's User
// itself: signed out or a Guest gets nothing. The work is `#lib/server/rows.ts`, through the claims helper.
// `fetchProject` (#186) loads the rows of one project as it opens.
import { command, getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { readProject, readRows, saveBatch } from '#lib/server/rows.js';
import { getServer } from '#lib/server/server.js';
import { BATCH } from './rows.schema';

async function toMember() {
	const { locals } = getRequestEvent();
	if (!locals.user || !locals.actor) error(401, 'Sign in first.');
	if (!locals.actor.organizationId) error(403, 'You are waiting for access.');
	const { claims } = await getServer();
	if (!claims) error(503, 'The app is not connected yet.');
	return { actor: locals.actor, claims };
}

/** The organization's lists, as rows: every table of the `organization` scope, with the times the server set. */
export const fetchLists = query(async () => {
	const { actor, claims } = await toMember();
	return readRows(claims, actor, 'organization');
});

/**
 * One project's rows as it opens (#186): the project and every row inside it, or the reason there are none (someone
 * moved it to the Trash).
 */
export const fetchProject = query(v.pipe(v.string(), v.uuid()), async (id) => {
	const { actor, claims } = await toMember();
	return readProject(claims, actor, id);
});

/** The save command: one batch of row changes, applied all or nothing, or refused with a reason. */
export const saveRows = command(BATCH, async (batch) => {
	const { actor, claims } = await toMember();
	return saveBatch(claims, actor, batch);
});
