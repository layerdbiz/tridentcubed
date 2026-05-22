// Enable SSR so the PDF server can fetch this page as rendered HTML.
// The root layout disables SSR globally; this overrides it for the print shell.
export const ssr = true;
export const csr = false;
