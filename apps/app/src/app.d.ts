// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

/// <reference types="unplugin-icons/types/svelte" />

import type { AuthType } from '#lib/server/auth.js';
import type { ActorType } from '#lib/server/db/claims.js';

declare global {
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
