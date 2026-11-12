// The sign-in guard (#181, #182), run by the server hook on every request: a signed-out visitor opening an app address
// goes to the login page, which keeps the address in `next` so signing in lands there. Server routes under /api
// answer 401 instead. A signed-in Guest is kept on Waiting for access, and their server-route requests answer 403.
// Remote functions (/_app/remote) stay open because each one checks the User itself (apps/app/AGENTS.md "Data"),
// and the claims helper shows a Guest nothing anyway; the login page and Better Auth's routes stay open to let
// someone sign in and out. Better Auth's organization routes are closed to everyone: memberships change only through
// the sign-in rule and the app's one permission check.

export type AccessType = 'signed-out' | 'guest' | 'staff';

export type GuardType =
	| { kind: 'redirect'; location: string }
	| { kind: 'refuse'; status: 401 | 403 | 404; message: string };

// The local folder's file links are signed and short-lived, as Supabase Storage's are, so they answer by their
// signature alone (#187). The app's own file addresses (/files/<id>) answer like server routes: a refusal, never a
// page.
const OPEN = ['/login', '/api/auth/', '/_app/', '/local-files/'];
const SERVED = ['/api/', '/files/'];
const CLOSED = '/api/auth/organization/';
const WAITING = '/waiting';

function isUnder(path: string, prefix: string) {
	return path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`);
}

/** Better Auth's organization routes, closed before Better Auth can answer them. */
export function isClosed(url: URL) {
	return url.pathname.startsWith(CLOSED);
}

export function toGuard(url: URL, access: AccessType): GuardType | undefined {
	const path = url.pathname;
	if (isClosed(url)) return { kind: 'refuse', status: 404, message: 'Not found.' };
	if (OPEN.some((open) => isUnder(path, open))) return undefined;

	if (access === 'staff') {
		return isUnder(path, WAITING) ? { kind: 'redirect', location: '/' } : undefined;
	}
	if (access === 'guest') {
		if (isUnder(path, WAITING)) return undefined;
		if (SERVED.some((served) => path.startsWith(served))) {
			return { kind: 'refuse', status: 403, message: 'You are waiting for access.' };
		}
		return { kind: 'redirect', location: WAITING };
	}

	if (SERVED.some((served) => path.startsWith(served))) {
		return { kind: 'refuse', status: 401, message: 'Sign in first.' };
	}
	const next = isUnder(path, WAITING) ? '/' : `${path}${url.search}`;
	return {
		kind: 'redirect',
		location: next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`
	};
}

// Only an address of this app, never another site or the login page itself; anything else lands on the app.
export function toNext(next: string | null | undefined) {
	if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
	if (next === '/login' || next.startsWith('/login?') || next.startsWith('/login/')) return '/';
	return next;
}
