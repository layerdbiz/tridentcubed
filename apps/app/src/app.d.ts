// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

/// <reference types="unplugin-icons/types/svelte" />

import type { AuthType } from '#lib/server/auth.js';
import type { ActorType } from '#lib/server/db/claims.js';

declare global {
	/** The commit this build was made from, written in by vite.config.ts from Vercel's settings; empty elsewhere. */
	const __BUILD_COMMIT__: string;
	/** The branch this build was made from, written in the same way. */
	const __BUILD_BRANCH__: string;
	/** The Vercel deployment this build is, written in the same way. */
	const __DEPLOYMENT_ID__: string;
	/** This build's version as people read it, from the release tags (#157, #400): v1.1.0; empty before any release. */
	const __APP_VERSION__: string;

	namespace App {
		// interface Error {}
		/**
		 * The signed-in User, their session and who they are (organization, role, Super admin; a Guest has no
		 * organization), found by `hooks.server.ts`; unset when signed out.
		 */
		interface Locals {
			user?: AuthType['$Infer']['Session']['user'];
			session?: AuthType['$Infer']['Session']['session'];
			actor?: ActorType;
		}
		// interface PageData {}
		interface PageState {
			projectPane?: 'edit' | 'preview';
		}
		// interface Platform {}
	}
}

export {};
