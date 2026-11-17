// The Needs Internet screen (#201) is made at build time and kept on the device by the service worker, which shows
// it at whatever address was asked for. So it must work as stored HTML: no client script of SvelteKit's, whose
// router would try to draw the asked-for route. Its one script is its own (offline.svelte).
export const prerender = true;
export const csr = false;
