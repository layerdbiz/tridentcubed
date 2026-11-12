// What the deployment's settings switch on (spec #179 "Database, environments and settings", #181). The names are
// the contract the setup wizard writes to Vercel. Only DATABASE_URL and BETTER_AUTH_SECRET are needed for the app
// to start in production; each sign-in way switches on when its keys are present. Outside production nothing is
// needed: the in-process database, a fixed development secret and the server-log email sender stand in.
// "Production" is a Vercel deployment (`VERCEL` is set there, at build and at run); a local `vp preview` is not.

export type SignInWayType = 'email' | 'google' | 'microsoft';

export type ProviderKeysType = { clientId: string; clientSecret: string };

export type SettingsType = {
	isProduction: boolean;
	/** Whether there is a database and a secret to start with (always, outside production). */
	isConnected: boolean;
	/** Setting names a production deployment still needs, never their values: the database and secret, then a sign-in way. */
	missing: string[];
	/** Unset: the in-process database (never in production, where it is listed as missing). */
	databaseUrl?: string;
	secret: string;
	/** The app's own address when the deployment knows it; unset locally, where each request gives it. */
	baseURL?: string;
	trustedOrigins: string[];
	/** Who sends email: Resend, the server log (outside production only), or nobody. */
	email: 'resend' | 'log' | 'none';
	resendApiKey?: string;
	google?: ProviderKeysType;
	microsoft?: ProviderKeysType;
	/** The sign-in ways the login page shows, in its order. */
	ways: SignInWayType[];
};

export type EnvType = Record<string, string | undefined>;

// Outside production only: sessions signed with it mean nothing anywhere else.
const DEVELOPMENT_SECRET = 'trident-development-secret-never-used-in-production';

function toKeys(clientId?: string, clientSecret?: string) {
	return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

function toHttps(host?: string) {
	return host ? `https://${host}` : undefined;
}

export function readSettings(env: EnvType): SettingsType {
	const isProduction = Boolean(env.VERCEL);
	const email = env.RESEND_API_KEY ? 'resend' : isProduction ? 'none' : 'log';
	const google = toKeys(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
	const microsoft = toKeys(env.MICROSOFT_CLIENT_ID, env.MICROSOFT_CLIENT_SECRET);
	// The emailed code first, then Google and Microsoft under it, each only when both its keys are set (#191).
	const ways: SignInWayType[] = [];
	if (email !== 'none') ways.push('email');
	if (google) ways.push('google');
	if (microsoft) ways.push('microsoft');

	const missing: string[] = [];
	if (isProduction) {
		if (!env.DATABASE_URL) missing.push('DATABASE_URL');
		if (!env.BETTER_AUTH_SECRET) missing.push('BETTER_AUTH_SECRET');
	}
	const isConnected = missing.length === 0;
	if (isProduction && ways.length === 0) {
		missing.push('RESEND_API_KEY or GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
	}

	const productionURL =
		env.VERCEL_ENV === 'production' ? toHttps(env.VERCEL_PROJECT_PRODUCTION_URL) : undefined;
	const deploymentURLs = [toHttps(env.VERCEL_BRANCH_URL), toHttps(env.VERCEL_URL)];

	return {
		isProduction,
		isConnected,
		missing,
		databaseUrl: env.DATABASE_URL || undefined,
		secret: env.BETTER_AUTH_SECRET || DEVELOPMENT_SECRET,
		baseURL: env.BETTER_AUTH_URL || productionURL || deploymentURLs.find(Boolean),
		trustedOrigins: deploymentURLs.filter((url): url is string => Boolean(url)),
		email,
		resendApiKey: env.RESEND_API_KEY || undefined,
		google,
		microsoft,
		ways
	};
}
