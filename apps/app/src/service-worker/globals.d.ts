// What vite.config.ts writes into the service worker's build, as app.d.ts declares it for the app.
declare global {
	/** The Vercel deployment this build is; empty off Vercel. */
	const __DEPLOYMENT_ID__: string;
}

export {};
