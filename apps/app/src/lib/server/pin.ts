// The version cookie on every page (#401). Vercel keeps a browser on the deployment that served its page (Skew
// Protection, by a cookie SvelteKit's Vercel adapter sets on a page load), so the page's files and remote functions
// come from the version the page is. The adapter sets it only when Vercel counts the request as a page load, and
// never on a "not modified" answer: a page the service worker asked for, or one the browser had kept, left the
// browser on an older deployment, and the new version's files then came back "not found". So every page sets it, to
// the deployment that served it, and is never kept by the browser.
import { PIN_COOKIE } from '#lib/update/update.constants.js';

/** The cookie that keeps a browser on `deployment`, written as the adapter writes it. */
export function toPinCookie(deployment: string) {
	return `${PIN_COOKIE}=${deployment}; Path=/; SameSite=Strict; Secure; HttpOnly`;
}

/** A page answered by `deployment`, keeping the browser on it and out of the browser's cache. Off Vercel, as it came. */
export function toPinnedPage(response: Response, deployment: string): Response {
	if (!deployment) return response;
	if (!response.headers.get('content-type')?.startsWith('text/html')) return response;
	const pinned = new Response(response.body, response);
	pinned.headers.append('set-cookie', toPinCookie(deployment));
	pinned.headers.set('cache-control', 'no-store');
	return pinned;
}
