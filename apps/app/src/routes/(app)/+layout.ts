// The signed-in app is drawn on the device (ADR 0007), so the server never renders it. Sign-in, Waiting for
// access, files and export are the server's own routes, outside this group.
export const ssr = false;
