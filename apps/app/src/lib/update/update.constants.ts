// What the update note says to a waiting service worker (#202), named once so the note and the worker agree.

/** The message that asks a waiting service worker to take over the open app. Only the User's tap sends it. */
export const TAKE_OVER = 'take-over';

/** How long the note waits for the waiting service worker to take over before it reloads anyway, in milliseconds. */
export const TAKE_OVER_WAIT = 4000;
