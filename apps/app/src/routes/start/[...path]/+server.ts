// The starting files (spec #179 "Files"; #183): the pictures the starting rows point at (customer icons and logos;
// #185 adds the team's photos), shipped with the app in `src/lib/start` and named by a stable address, `/start/...`,
// that rows keep. The address sends the browser on to the file as the build named it. Signed-in Users only, like
// every address of the app but the login page.
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const FILES = import.meta.glob<string>('/src/lib/start/**/*.{png,jpg,jpeg,ico,webp,svg}', {
	eager: true,
	query: '?url',
	import: 'default'
});

export const GET: RequestHandler = ({ params }) => {
	const url = FILES[`/src/lib/start/${params.path}`];
	if (!url) error(404, 'No such file.');
	return new Response(null, {
		status: 302,
		headers: { location: url, 'cache-control': 'private, max-age=3600' }
	});
};
