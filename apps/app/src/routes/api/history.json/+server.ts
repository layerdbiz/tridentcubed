// What's New's history (#399): the branch's updates in batches, written once when the app is built, so the file is
// the same for everyone and the newest version always answers it. Open to anyone (guard.ts): the repository is
// public, and an open app asks without its cookies to reach the newest version (releases.state.svelte.ts).
import { json } from '@sveltejs/kit';
import { readHistory } from '#lib/releases/history.server.js';

export const prerender = true;

export function GET() {
	return json(readHistory());
}
