// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

/// <reference types="unplugin-icons/types/svelte" />

import type { Session, User } from 'better-auth';

declare global {
	namespace App {
		// interface Error {}
		/** The signed-in User and their session, found by `hooks.server.ts`; unset when signed out. */
		interface Locals {
			user?: User;
			session?: Session;
		}
		// interface PageData {}
		interface PageState {
			projectPane?: 'edit' | 'preview';
		}
		// interface Platform {}
	}
}

export {};
