// The commit this deployment was built from (#396). An open app built earlier asks it to learn whether a newer version
// is out and which: a request always reaches the newest deployment. Never kept by a cache.
import { json } from '@sveltejs/kit';
import { BUILD_COMMIT } from '#lib/update/changes.constants.js';

export function GET() {
	return json({ commit: BUILD_COMMIT }, { headers: { 'cache-control': 'no-store' } });
}
