// Helpers for tests that need the database or a signed-in User (#181). Every call gives a fresh, empty in-process
// database with the real schema, and Better Auth on it with the server-log email sender, so a test reads the
// emailed code exactly as an agent reads it from a local server's log. The database starts from the one seed (the
// Trident Cubed organization, domain tridentcubed.com), and `claims` is the claims helper on it (#182).
// Never imported by app code.
import { findActor } from './access';
import { createAuth } from './auth';
import { createClaims } from './db/claims';
import { createMemoryDatabase, type DatabaseType } from './db/index';
import { seedDatabase } from './db/seed';
import { createLogSender } from './email';
import { sendCode, verifyCode } from './signin';

export const TEST_SECRET = 'test-secret-that-is-at-least-32-characters-long';

const APP = 'http://localhost:5174';

export type TestProviderType = 'google' | 'microsoft';

/** Better Auth on a test database, as the app makes it: another server of the same deployment, when given one's db. */
export function createTestAuth(db: DatabaseType, lines: string[] = []) {
	return createAuth({
		db,
		secret: TEST_SECRET,
		sender: createLogSender((line) => lines.push(line)),
		baseURL: APP,
		isSecure: false,
		google: { clientId: 'test-google-id', clientSecret: 'test-google-secret' },
		microsoft: { clientId: 'test-microsoft-id', clientSecret: 'test-microsoft-secret' }
	});
}

// Each sign-in a test makes comes from an address of its own, so sending codes is never limited unless a test means it.
let addresses = 0;

function nextAddress() {
	addresses += 1;
	return `10.${(addresses >> 16) & 255}.${(addresses >> 8) & 255}.${addresses & 255}`;
}

export async function createTestSignIn() {
	const db = await createMemoryDatabase();
	await seedDatabase(db);
	const claims = createClaims(db);
	const lines: string[] = [];
	const auth = createTestAuth(db, lines);

	// The last code the log shows for this email.
	function readCode(email: string) {
		const line = lines.findLast((each) => each.startsWith(`[email] to ${email.toLowerCase()}:`));
		const code = line?.match(/code is (\d{6})/)?.[1];
		if (!code) throw new Error(`No code was logged for ${email}`);
		return code;
	}

	// Who a Cookie header's User is, as the server hook works it out (`event.locals.actor`).
	async function readActor(cookie: string) {
		const found = await auth.api.getSession({ headers: new Headers({ cookie }) });
		if (!found) throw new Error('That cookie has no session.');
		return findActor(claims, found.user, found.session.activeOrganizationId);
	}

	// Signs a User in by email the way the login page does, and gives back the user, their Cookie header and who
	// the server takes them to be.
	async function signIn(email: string) {
		const sent = await sendCode(auth, email, { ip: nextAddress() });
		if (!sent.isSent) throw new Error(sent.message);
		const result = await verifyCode(auth, { email, code: readCode(email) });
		if (!result.isSignedIn) throw new Error(result.message);
		return { ...result, actor: await readActor(result.cookie) };
	}

	// Starts Continue with Google or Microsoft the way the login page does: the provider's address to send the
	// browser to, and the cookie that remembers the attempt until the provider sends the User back.
	async function startSignIn(provider: TestProviderType, callbackURL = '/') {
		const response = await auth.handler(
			new Request(`${APP}/api/auth/sign-in/social`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					origin: APP,
					'x-forwarded-for': nextAddress()
				},
				body: JSON.stringify({ provider, callbackURL, errorCallbackURL: '/login' })
			})
		);
		if (!response.ok) throw new Error(`${provider} sign-in did not start: ${response.status}`);
		const { url } = (await response.json()) as { url: string };
		return { url, cookie: toCookie(response.headers) };
	}

	// The whole round trip of Continue with Google or Microsoft: start it, then come back to the callback address as
	// the provider would, while the provider's token endpoint answers with an ID token holding `idClaims` (a test only
	// plays the provider; Better Auth does the rest). Gives where the User lands, their cookie and the signed-in user.
	async function signInWith(
		provider: TestProviderType,
		idClaims: Record<string, unknown>,
		callbackURL = '/'
	) {
		const started = await startSignIn(provider, callbackURL);
		const state = new URL(started.url).searchParams.get('state') ?? '';
		const realFetch = globalThis.fetch;
		globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input instanceof Request ? input.url : input);
			if (!TOKEN_ENDPOINTS.some((endpoint) => url.startsWith(endpoint))) {
				return realFetch(input, init);
			}
			return Response.json({
				access_token: 'test-access-token',
				token_type: 'Bearer',
				expires_in: 3600,
				id_token: toUnsignedJwt({ aud: `test-${provider}-id`, ...idClaims })
			});
		}) as typeof fetch;
		try {
			const response = await auth.handler(
				new Request(`${APP}/api/auth/callback/${provider}?code=test-code&state=${state}`, {
					headers: { cookie: started.cookie }
				})
			);
			const location = response.headers.get('location') ?? '';
			const cookie = toCookie(response.headers);
			const session = cookie
				? await auth.api.getSession({ headers: new Headers({ cookie }) })
				: null;
			const error = location.includes('error=')
				? new URL(location, APP).searchParams.get('error')
				: null;
			return { location, cookie, error, user: session?.user };
		} finally {
			globalThis.fetch = realFetch;
		}
	}

	return { db, auth, claims, lines, readCode, readActor, signIn, startSignIn, signInWith };
}

const TOKEN_ENDPOINTS = [
	'https://oauth2.googleapis.com/token',
	'https://login.microsoftonline.com/'
];

// An ID token as a provider's token endpoint returns it. Better Auth reads, and does not re-verify, an ID token it
// got straight from the provider over TLS, so the test's needs no signature.
function toUnsignedJwt(claims: Record<string, unknown>) {
	const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
	const now = Math.floor(Date.now() / 1000);
	return `${part({ alg: 'none', typ: 'JWT' })}.${part({ iat: now, exp: now + 3600, ...claims })}.`;
}

function toCookie(headers: Headers) {
	return headers
		.getSetCookie()
		.map((line) => line.split(';')[0])
		.join('; ');
}
