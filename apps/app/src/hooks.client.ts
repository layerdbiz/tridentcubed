// Runs in the browser before any page. A page opened over plain http by a network address (the dev server on a
// phone) has no `crypto.randomUUID`; see uuid.ts. Install App starts hearing the browser here, because the browser
// can offer its one-tap install before any page is drawn (#203).
import { install } from '#lib/install/install.state.svelte.js';
import { ensureRandomUuid } from './uuid';

ensureRandomUuid();
install.listen(window);
