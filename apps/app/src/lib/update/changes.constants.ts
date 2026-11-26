// What the new version window (#396) needs to know about this build. Vercel names the commit and the branch a build
// is made from; apps/app/vite.config.ts writes them in, and a build anywhere else leaves them empty.

/** The commit this build was made from; empty outside Vercel. */
export const BUILD_COMMIT = __BUILD_COMMIT__;

/** The branch this build was made from; empty outside Vercel. */
export const BUILD_BRANCH = __BUILD_BRANCH__;

/**
 * The branches whose app lists every change since the last look in its new version window, in place of the short
 * update note (Justin, 2026-11-26: next for now; add `dev` to turn it on there).
 */
export const CHANGE_LIST_BRANCHES = ['next'];

/** Whether this build shows the new version window. */
export const HAS_CHANGE_LIST = CHANGE_LIST_BRANCHES.includes(BUILD_BRANCH);

/** Where the commits are read: the repository is public, so GitHub answers anyone. */
export const COMPARE_URL = 'https://api.github.com/repos/layerdbiz/tridentcubed/compare';

/** How often the window asks for a newer version while one is out and unseen, in milliseconds. */
export const CHECK_EVERY = 60_000;

/** How long without a touch, a key or a scroll before someone counts as away from the app, in milliseconds. */
export const IDLE_AFTER = 20_000;
