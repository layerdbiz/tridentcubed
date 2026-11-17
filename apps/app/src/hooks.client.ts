// Runs in the browser before any page. A page opened over plain http by a network address (the dev server on a
// phone) has no `crypto.randomUUID`; see uuid.ts.
import { ensureRandomUuid } from './uuid';

ensureRandomUuid();
