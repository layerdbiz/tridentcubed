// What the update note says to a waiting service worker (#202), and how a request names the version it wants (#401),
// named once so the note, the worker and the server agree.

/** The message that asks a waiting service worker to take over the open app. Only the User's tap sends it. */
export const TAKE_OVER = 'take-over';

/** How long the note waits for the waiting service worker to take over before it reloads anyway, in milliseconds. */
export const TAKE_OVER_WAIT = 4000;

/**
 * The Vercel deployment this build is, written in by vite.config.ts; empty in a build anywhere else. Vercel keeps an
 * open app on the deployment it started with by a cookie (Skew Protection, `PIN_COOKIE`); a request that names a
 * deployment in `DEPLOYMENT_HEADER` reaches that one instead, whatever the cookie says.
 */
export const DEPLOYMENT_ID = __DEPLOYMENT_ID__;

/** The header that names the deployment a request is for. Given empty, the newest deployment answers. */
export const DEPLOYMENT_HEADER = 'x-deployment-id';

/** Vercel's cookie that keeps a browser on one deployment (Skew Protection), as SvelteKit's Vercel adapter sets it. */
export const PIN_COOKIE = '__vdpl';
