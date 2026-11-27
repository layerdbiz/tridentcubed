// What What's New (#363, #396, #399, #400) knows of this build. Vercel names the commit and the branch a build is
// made from, and the build reads its version from the release tags (#157, releases.server.ts); apps/app/vite.config.ts
// writes them in, and a build anywhere else leaves them empty.

/** The app's version as people read it, from the release tags: v1.1.0, or v1.2.0-next.4 on next. */
export const VERSION_LABEL = __APP_VERSION__ || 'Not released yet';

/** The commit this build was made from; empty outside Vercel. */
export const BUILD_COMMIT = __BUILD_COMMIT__;

/** The branch this build was made from; empty outside Vercel. */
export const BUILD_BRANCH = __BUILD_BRANCH__;

/**
 * The colour of each kind of change in What's New (Justin, 2026-11-27: "a little green dot and blue dot"), a feature
 * the theme's success green and a fix its info blue: full in a section's title, before its counts (`dot`), and light
 * on the bullets of its lines (`bullet`, "a light version of the green and a light version of the blue").
 */
export const KIND_COLORS = {
	feature: { dot: 'bg-success', bullet: 'bg-success-300' },
	fix: { dot: 'bg-info', bullet: 'bg-info-300' }
} as const;

/** Where the branch's history is, written when the app is built (routes/api/history.json). */
export const HISTORY_PATH = '/api/history.json';

/** How often an open app asks whether a new version is out, in milliseconds. */
export const CHECK_EVERY = 60_000;
