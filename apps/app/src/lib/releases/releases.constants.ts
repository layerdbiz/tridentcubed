// The releases (#157), newest first, as scripts/release.ts writes them after each merge into dev, and what What's New
// (#363, #396, #399) knows of this build. Vercel names the commit and the branch a build is made from;
// apps/app/vite.config.ts writes them in, and a build anywhere else leaves them empty.
import data from './releases.json';
import type { ReleaseType } from './releases.utils';

export const RELEASES = data as ReleaseType[];

/** The app's version as people read it, from the newest release's tag: v1.1.0. */
export const VERSION_LABEL = RELEASES[0] ? `v${RELEASES[0].version}` : 'Not released yet';

/** The commit this build was made from; empty outside Vercel. */
export const BUILD_COMMIT = __BUILD_COMMIT__;

/** The branch this build was made from; empty outside Vercel. */
export const BUILD_BRANCH = __BUILD_BRANCH__;

/**
 * The branches whose app opens What's New by itself the moment a new version is out, in place of the update note
 * (Justin, 2026-11-26: next for now; add `dev` to turn it on there).
 */
export const POP_UP_BRANCHES = ['next'];

/** Whether this build opens What's New by itself for a new version. */
export const HAS_POP_UP = POP_UP_BRANCHES.includes(BUILD_BRANCH);

/** Where the branch's history is, written when the app is built (routes/api/history.json). */
export const HISTORY_PATH = '/api/history.json';

/** How often an open app asks whether a new version is out, in milliseconds. */
export const CHECK_EVERY = 60_000;
