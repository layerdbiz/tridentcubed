import { createAppConfig } from '@layerd/config-vite';

export default createAppConfig({
	root: import.meta.dirname,
	prerender: {
		handleHttpError: ({ path, referrer, message }) => {
			// Handle remote function errors during prerender gracefully
			// These can fail when external APIs are unreachable during build
			if (path.includes('/_app/remote/')) {
				console.warn(`⚠️ Prerender warning: Remote function failed at ${path}`);
				console.warn(`   Referrer: ${referrer}`);
				console.warn(`   Message: ${message}`);
				console.warn(`   This is expected if external APIs are unreachable during build.`);

				return; /* Don't fail the build */
			}

			// For other HTTP errors, fail the build
			throw new Error(message);
		},

		// Handle routes that weren't crawled (like catch-all 404 routes)
		handleUnseenRoutes: 'ignore'
	}
});
