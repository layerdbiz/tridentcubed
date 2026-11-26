// The releases (#157), newest first, as scripts/release.ts writes them after each merge into dev. Empty until the
// first release.
import data from './releases.json';
import type { ReleaseType } from './releases.utils';

export const RELEASES = data as ReleaseType[];

/** The app's version as people read it, from the newest release's tag: v1.1.0. */
export const VERSION_LABEL = RELEASES[0] ? `v${RELEASES[0].version}` : 'Not released yet';
