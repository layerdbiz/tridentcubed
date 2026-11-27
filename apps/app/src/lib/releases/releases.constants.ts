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
 * The branches whose app opens What's New by itself the moment a new version is out, in place of the update note:
 * next (Justin, 2026-11-26), and dev since v1.0.0 (Justin, 2026-11-27: "it should pop up by itself").
 */
export const POP_UP_BRANCHES = ['next', 'dev'];

/** Whether this build opens What's New by itself for a new version. */
export const HAS_POP_UP = POP_UP_BRANCHES.includes(BUILD_BRANCH);

/** Where the branch's history is, written when the app is built (routes/api/history.json). */
export const HISTORY_PATH = '/api/history.json';

/** How often an open app asks whether a new version is out, in milliseconds. */
export const CHECK_EVERY = 60_000;
