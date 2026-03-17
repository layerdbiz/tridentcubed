// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

/// <reference types="unplugin-icons/types/svelte" />

declare global {
	interface Window {
		dataLayer: unknown[];
		gtag: (
			command: string,
			target: string | Date,
			params?: Record<string, unknown>,
		) => void;
	}

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

function googleEvent() {
	// This is a dummy function to ensure this file is treated as a module.
	// The actual content of the file is the global declarations above.
}
