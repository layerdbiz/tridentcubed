// The manifest's address (#200), answered by the app itself: every app in this repository serves the same shared
// static folder, so a manifest file there would be the Website's too. Open before sign-in (the sign-in guard's
// INSTALL list), because a browser asks for it with no session.
import { json } from '@sveltejs/kit';
import { toManifest } from './manifest.utils';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) =>
	json(toManifest(url), { headers: { 'content-type': 'application/manifest+json' } });
