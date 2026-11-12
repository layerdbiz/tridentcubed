// Enable SSR so SvelteKit's internal fetch can render this page in-process.
// The root layout disables SSR globally; this overrides it for the token print route.
// csr=false removes all script tags from the output so networkidle0 settles cleanly.
export const ssr = true;
export const csr = false;
