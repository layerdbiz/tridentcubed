// What the deployment's settings switch on (#181): the app needs nothing set to run locally, and a production
// deployment missing a setting names it (never its value) instead of crashing.
import { describe, expect, it } from 'vite-plus/test';
import { readSettings } from './settings';

const DEPLOYED = {
	VERCEL: '1',
	VERCEL_ENV: 'production',
	VERCEL_PROJECT_PRODUCTION_URL: 'dev.app.example.com'
};

describe('reading the deployment settings', () => {
	it('runs locally with nothing set: in-process database, a development secret, codes in the log', () => {
		const settings = readSettings({});

		expect(settings.isProduction).toBe(false);
		expect(settings.isConnected).toBe(true);
		expect(settings.missing).toEqual([]);
		expect(settings.databaseUrl).toBeUndefined();
		expect(settings.secret.length).toBeGreaterThanOrEqual(32);
		expect(settings.email).toBe('log');
		expect(settings.ways).toEqual(['email']);
	});

	it('names the missing database and secret in production, and no value', () => {
		const settings = readSettings({ ...DEPLOYED, RESEND_API_KEY: 're_secret_value' });

		expect(settings.isConnected).toBe(false);
		expect(settings.missing).toEqual(['DATABASE_URL', 'BETTER_AUTH_SECRET']);
		expect(JSON.stringify(settings.missing)).not.toContain('re_secret_value');
	});

	it('is connected in production with a database, a secret and a way to sign in', () => {
		const settings = readSettings({
			...DEPLOYED,
			DATABASE_URL: 'postgres://pooler',
			BETTER_AUTH_SECRET: 'a'.repeat(32),
			RESEND_API_KEY: 're_x'
		});

		expect(settings.missing).toEqual([]);
		expect(settings.email).toBe('resend');
		expect(settings.ways).toEqual(['email']);
		expect(settings.baseURL).toBe('https://dev.app.example.com');
	});

	it('takes the site address from BETTER_AUTH_URL over Vercel’s production domain (the wizard sets it)', () => {
		const settings = readSettings({
			...DEPLOYED,
			VERCEL_PROJECT_PRODUCTION_URL: 'tridentcubed-dev-app.vercel.app',
			BETTER_AUTH_URL: 'https://dev.app.example.com'
		});

		expect(settings.baseURL).toBe('https://dev.app.example.com');
	});

	it('hides the email way in production when no sender is set, and says no way is set up', () => {
		const settings = readSettings({
			...DEPLOYED,
			DATABASE_URL: 'postgres://pooler',
			BETTER_AUTH_SECRET: 'a'.repeat(32)
		});

		expect(settings.isConnected).toBe(true);
		expect(settings.ways).toEqual([]);
		expect(settings.missing).toEqual([
			'RESEND_API_KEY or GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET'
		]);
	});

	it('offers Google and Microsoft under the email way, each only when both its id and secret are set', () => {
		expect(
			readSettings({ GOOGLE_CLIENT_ID: 'g-id', GOOGLE_CLIENT_SECRET: 'g-secret' }).ways
		).toEqual(['email', 'google']);
		expect(
			readSettings({ MICROSOFT_CLIENT_ID: 'm-id', MICROSOFT_CLIENT_SECRET: 'm-secret' }).ways
		).toEqual(['email', 'microsoft']);
		expect(
			readSettings({
				GOOGLE_CLIENT_ID: 'g-id',
				GOOGLE_CLIENT_SECRET: 'g-secret',
				MICROSOFT_CLIENT_ID: 'm-id',
				MICROSOFT_CLIENT_SECRET: 'm-secret'
			}).ways
		).toEqual(['email', 'google', 'microsoft']);
	});

	it('leaves a provider off when only half of its keys are set', () => {
		const settings = readSettings({
			GOOGLE_CLIENT_ID: 'g-id',
			MICROSOFT_CLIENT_SECRET: 'm-secret'
		});

		expect(settings.ways).toEqual(['email']);
		expect(settings.google).toBeUndefined();
		expect(settings.microsoft).toBeUndefined();
	});

	it('is ready in production with Google alone, and offers only Google', () => {
		const settings = readSettings({
			...DEPLOYED,
			DATABASE_URL: 'postgres://pooler',
			BETTER_AUTH_SECRET: 'a'.repeat(32),
			GOOGLE_CLIENT_ID: 'g-id',
			GOOGLE_CLIENT_SECRET: 'g-secret'
		});

		expect(settings.missing).toEqual([]);
		expect(settings.ways).toEqual(['google']);
	});

	it('keeps files in a local folder with no storage settings, and nowhere in production (#187)', () => {
		expect(readSettings({}).storage).toBe('local');
		expect(readSettings({ ...DEPLOYED, DATABASE_URL: 'postgres://pooler' }).storage).toBe('none');
	});

	it('keeps files in Supabase Storage when its address and secret key are both set', () => {
		const settings = readSettings({
			...DEPLOYED,
			SUPABASE_URL: 'https://abc.supabase.co',
			SUPABASE_SECRET_KEY: 'sb_secret_x'
		});
		const half = readSettings({ SUPABASE_URL: 'https://abc.supabase.co' });

		expect(settings.storage).toBe('supabase');
		expect(settings.supabase).toEqual({
			url: 'https://abc.supabase.co',
			secretKey: 'sb_secret_x'
		});
		expect(half.storage).toBe('local');
	});
});
