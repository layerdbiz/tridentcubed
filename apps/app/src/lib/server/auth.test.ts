// Continue with Google and Continue with Microsoft (#191), through Better Auth's own HTTP endpoints as the login page
// and the provider's redirect reach them, against the in-process database. Only the provider's side is played by the
// test: its token endpoint is answered with an ID token carrying the claims each case needs. Real keys, real consent
// screens and real Microsoft tenants cannot be exercised here; the handoff note says what was checked by hand.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vite-plus/test';
import { createAuth } from './auth';
import { createMemoryDatabase } from './db/index';
import { createLogSender } from './email';
import { sendCode } from './signin';
import { createTestSignIn, TEST_SECRET } from './testing';

const APP = 'http://localhost:5174';

describe('starting a sign-in with Google or Microsoft', () => {
	it('sends the User to Google, asking only for name and email, and back to the callback address', async () => {
		const { startSignIn } = await createTestSignIn();

		const url = new URL((await startSignIn('google')).url);

		expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
		expect(url.searchParams.get('redirect_uri')).toBe(`${APP}/api/auth/callback/google`);
		expect(url.searchParams.get('scope')?.split(' ').sort()).toEqual([
			'email',
			'openid',
			'profile'
		]);
	});

	it('sends the User to Microsoft for any organization or personal account, asking only for name and email', async () => {
		const { startSignIn } = await createTestSignIn();

		const url = new URL((await startSignIn('microsoft')).url);

		expect(url.origin + url.pathname).toBe(
			'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
		);
		expect(url.searchParams.get('redirect_uri')).toBe(`${APP}/api/auth/callback/microsoft`);
		expect(url.searchParams.get('scope')?.split(' ').sort()).toEqual([
			'email',
			'openid',
			'profile'
		]);
	});

	it('has no Google or Microsoft without their keys', async () => {
		const auth = createAuth({
			db: await createMemoryDatabase(),
			secret: TEST_SECRET,
			sender: createLogSender(() => {}),
			baseURL: APP,
			isSecure: false
		});

		for (const provider of ['google', 'microsoft']) {
			const response = await auth.handler(
				new Request(`${APP}/api/auth/sign-in/social`, {
					method: 'POST',
					headers: { 'content-type': 'application/json', origin: APP },
					body: JSON.stringify({ provider, callbackURL: '/' })
				})
			);
			expect(response.ok).toBe(false);
		}
	});

	it('runs locally with no address set: codes still send, and Google gets the address the page was opened on', async () => {
		const auth = createAuth({
			db: await createMemoryDatabase(),
			secret: TEST_SECRET,
			sender: createLogSender(() => {}),
			isSecure: false,
			google: { clientId: 'g-id', clientSecret: 'g-secret' }
		});

		expect(await sendCode(auth, 'ana@example.com')).toEqual({ isSent: true });
		const { url } = await auth.api.signInSocial({
			body: { provider: 'google', callbackURL: '/' },
			headers: new Headers({ host: '192.168.1.20:5174' })
		});
		expect(new URL(url ?? '').searchParams.get('redirect_uri')).toBe(
			'http://192.168.1.20:5174/api/auth/callback/google'
		);
	});

	it('uses the callback addresses the setup wizard tells Justin to register', () => {
		const wizard = readFileSync(
			new URL('../../../../../scripts/setup-dev-app.sh', import.meta.url),
			'utf8'
		);

		expect(wizard).toContain('$APP_URL/api/auth/callback/google');
		expect(wizard).toContain('$APP_URL/api/auth/callback/microsoft');
		expect(wizard).toContain('xms_edov');
	});

	it('has the setup wizard put the site address in Vercel as BETTER_AUTH_URL, never in the local .env', () => {
		const wizard = readFileSync(
			new URL('../../../../../scripts/setup-dev-app.sh', import.meta.url),
			'utf8'
		);

		expect(wizard).toContain('APP_URL="https://dev.app.tridentcubed.com"');
		expect(wizard).toContain(`BETTER_AUTH_URL) printf '%s' "$APP_URL"`);
		expect(wizard).toContain('push_to_vercel "${CORE_KEYS[@]}" "${FIXED_KEYS[@]}"');
		expect(wizard).not.toContain('write_env BETTER_AUTH_URL');
	});
});

const GOOGLE_ANA = {
	sub: 'google-ana',
	email: 'ana@example.com',
	email_verified: true,
	name: 'Ana Ruiz'
};

// Microsoft's fixed tenant for personal accounts, and an organization's own tenant.
const PERSONAL_TENANT = '9188040d-6c67-4c5b-b112-36a304b66dad';
const CONTOSO_TENANT = '72f988bf-86f1-41af-91ab-2d7cd011db47';

// A work account: `xms_edov` is Microsoft's claim that the organization verified the email's domain. The app
// registration asks for it (the setup wizard's Microsoft step); without it a work email proves nothing.
const MICROSOFT_WORK_BO = {
	oid: 'microsoft-bo',
	tid: CONTOSO_TENANT,
	iss: `https://login.microsoftonline.com/${CONTOSO_TENANT}/v2.0`,
	email: 'bo@contoso.example',
	name: 'Bo Lee',
	xms_edov: true
};

const MICROSOFT_PERSONAL_CY = {
	oid: 'microsoft-cy',
	tid: PERSONAL_TENANT,
	iss: `https://login.microsoftonline.com/${PERSONAL_TENANT}/v2.0`,
	email: 'cy@outlook.example',
	name: 'Cy Park'
};

describe('coming back from Google or Microsoft', () => {
	it('signs a new User in with Google and creates the user the first time, then finds the same one', async () => {
		const { auth, signInWith } = await createTestSignIn();

		const first = await signInWith('google', GOOGLE_ANA, '/projects/7');
		expect(first.location).toBe('/projects/7');
		const session = await auth.api.getSession({ headers: new Headers({ cookie: first.cookie }) });
		expect(session?.user).toMatchObject({
			email: 'ana@example.com',
			name: 'Ana Ruiz',
			emailVerified: true
		});

		const second = await signInWith('google', GOOGLE_ANA);
		expect(second.user?.id).toBe(session?.user.id);
	});

	it('signs a User in with a work Microsoft account whose email domain its organization verified', async () => {
		const { signInWith } = await createTestSignIn();

		const result = await signInWith('microsoft', MICROSOFT_WORK_BO);

		expect(result.error).toBeNull();
		expect(result.user).toMatchObject({
			email: 'bo@contoso.example',
			name: 'Bo Lee',
			emailVerified: true
		});
	});

	it('signs a User in with a personal Microsoft account', async () => {
		const { signInWith } = await createTestSignIn();

		const result = await signInWith('microsoft', MICROSOFT_PERSONAL_CY);

		expect(result.error).toBeNull();
		expect(result.user).toMatchObject({ email: 'cy@outlook.example', emailVerified: true });
	});
});

describe('one user, whichever way they sign in', () => {
	it('keeps a User who signed in with a code the same user when they later use Google', async () => {
		const { signIn, signInWith } = await createTestSignIn();
		const byCode = await signIn('ana@example.com');

		const byGoogle = await signInWith('google', GOOGLE_ANA);

		expect(byGoogle.error).toBeNull();
		expect(byGoogle.user?.id).toBe(byCode.user.id);
	});

	it('keeps a User who signed in with a code the same user when they later use Microsoft', async () => {
		const { signIn, signInWith } = await createTestSignIn();
		const byCode = await signIn('bo@contoso.example');

		const byMicrosoft = await signInWith('microsoft', MICROSOFT_WORK_BO);

		expect(byMicrosoft.error).toBeNull();
		expect(byMicrosoft.user?.id).toBe(byCode.user.id);
	});

	it('keeps a User who started with Google the same user by code and by Microsoft', async () => {
		const { signIn, signInWith } = await createTestSignIn();
		const byGoogle = await signInWith('google', GOOGLE_ANA);

		const byCode = await signIn('Ana@Example.com');
		const byMicrosoft = await signInWith('microsoft', {
			...MICROSOFT_PERSONAL_CY,
			oid: 'microsoft-ana',
			email: 'ana@example.com'
		});

		expect(byCode.user.id).toBe(byGoogle.user?.id);
		expect(byMicrosoft.user?.id).toBe(byGoogle.user?.id);
	});
});

describe('an email nobody verified', () => {
	// A work account from an organization that did not verify the email's domain: anyone can make one that says
	// ana@example.com in their own Microsoft tenant.
	const UNVERIFIED_ANA = {
		...MICROSOFT_WORK_BO,
		oid: 'microsoft-someone',
		email: 'ana@example.com',
		xms_edov: false
	};

	it('never reaches the user who signed in with a code', async () => {
		const { signIn, signInWith } = await createTestSignIn();
		await signIn('ana@example.com');

		const result = await signInWith('microsoft', UNVERIFIED_ANA);

		expect(result.error).toBe('account_not_linked');
		expect(result.user).toBeUndefined();
	});

	it('makes no user, so the real owner who signs in later is not sharing one with it', async () => {
		const { signIn, signInWith } = await createTestSignIn();

		const result = await signInWith('microsoft', UNVERIFIED_ANA, '/projects/7');
		expect(result.error).toBe('email_not_verified');
		expect(result.location.startsWith('/login?')).toBe(true);
		expect(result.user).toBeUndefined();

		await signIn('ana@example.com');
		const again = await signInWith('microsoft', UNVERIFIED_ANA);
		expect(again.error).toBe('account_not_linked');
	});

	it('is refused from Google too', async () => {
		const { signInWith } = await createTestSignIn();

		const result = await signInWith('google', { ...GOOGLE_ANA, email_verified: false });

		expect(result.error).toBe('email_not_verified');
		expect(result.user).toBeUndefined();
	});
});
