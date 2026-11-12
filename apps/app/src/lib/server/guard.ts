// The sign-in guard (#181), run by the server hook on every request: a signed-out visitor opening an app address
// goes to the login page, which keeps the address in `next` so signing in lands there. Server routes under /api
// answer 401 instead. Remote functions (/_app/remote) stay open because each one checks the session itself
// (apps/app/AGENTS.md "Data"); the login page and Better Auth's routes stay open to let someone sign in.

export type GuardType = { kind: 'login'; location: string } | { kind: 'refuse' };

const OPEN = ['/login', '/api/auth/', '/_app/'];

export function toGuard(url: URL, isSignedIn: boolean): GuardType | undefined {
	if (isSignedIn) return undefined;
	const path = url.pathname;
	if (
		OPEN.some((open) => path === open || path.startsWith(open.endsWith('/') ? open : `${open}/`))
	) {
		return undefined;
	}
	if (path.startsWith('/api/')) return { kind: 'refuse' };
	const next = `${path}${url.search}`;
	return {
		kind: 'login',
		location: next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`
	};
}

// Only an address of this app, never another site or the login page itself; anything else lands on the app.
export function toNext(next: string | null | undefined) {
	if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
	if (next === '/login' || next.startsWith('/login?') || next.startsWith('/login/')) return '/';
	return next;
}
