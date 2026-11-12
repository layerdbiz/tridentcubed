// Better Auth owns identity (ADR 0002, #181): UUID ids made by Postgres, its four tables in the app's schema through
// Drizzle, no passwords, and an emailed six-digit code that signs a User in and creates them the first time.
// Sessions last 30 days, renewed once a day on use, with a five-minute cookie cache (spec #179).
// #182: Better Auth's organization plugin holds organizations and memberships, and every new session runs the
// sign-in rule (`grantAccess`), which sets the organization the session acts in. The plugin's own HTTP routes are
// closed by the guard (`/api/auth/organization/*`): memberships change only through the sign-in rule and the app's
// one permission check, so its roles carry no permissions of their own.
// `createAuth` takes everything it needs, so tests build one on the in-process database; the app builds its one
// instance from the deployment's settings in `#lib/server/server.ts`.
import type { RequestEvent } from '@sveltejs/kit';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { betterAuth } from 'better-auth/minimal';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { organization } from 'better-auth/plugins/organization';
import { createAccessControl } from 'better-auth/plugins/access';
import { grantAccess } from './access';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import type { DatabaseType } from './db/index';
import * as schema from './db/schema';
import { type EmailSenderType, toCodeEmail } from './email';
import type { ProviderKeysType } from './settings';

const DAY = 60 * 60 * 24;

export const CODE_MINUTES = 10;

/** How many codes one address may ask for, and in how many seconds (Better Auth's own default for the plugin). */
export const CODE_SENDS = { max: 3, window: 60 };

const AC = createAccessControl({ organization: [], member: [], invitation: [] });
const ROLES = { admin: AC.newRole({}), manager: AC.newRole({}), team: AC.newRole({}) };

export type AuthOptionsType = {
	db: DatabaseType;
	secret: string;
	sender: EmailSenderType;
	/** The app's own address, when the deployment knows it; locally it is read from each request (`LOCAL_BASE_URL`). */
	baseURL?: string;
	/** Other addresses of this deployment that may post to it (a Vercel deployment's own URLs). */
	trustedOrigins?: string[];
	/** Secure cookies: on when deployed, off locally so a phone on the network (plain http) keeps the cookie. */
	isSecure: boolean;
	/** Kit's `getRequestEvent`, so Better Auth's cookies reach the response from hooks, forms and commands. */
	getRequestEvent?: () => RequestEvent | undefined;
	/** Continue with Google, when the deployment has both its keys (#191). */
	google?: ProviderKeysType;
	/** Continue with Microsoft, when the deployment has both its keys (#191). */
	microsoft?: ProviderKeysType;
};

// Outside a deployment the app's address is whichever host the request names (localhost, or this machine's address
// from a phone on the network), over plain http. Better Auth reads it from each request, and from the headers its
// API calls are given, so a sign-in started from a remote function sends Google the right callback address. A call
// given no headers (sending a code) falls back to the dev server's own port.
const LOCAL_BASE_URL = {
	allowedHosts: ['*'],
	protocol: 'http' as const,
	fallback: 'http://localhost:5174'
};

// Name and email only (#115): no Microsoft Graph, so no profile photo and no offline access.
const NAME_AND_EMAIL = ['openid', 'profile', 'email'];

// Microsoft's fixed tenant for personal accounts: their email is the account itself, which Microsoft verified.
const MICROSOFT_PERSONAL_TENANT = '9188040d-6c67-4c5b-b112-36a304b66dad';

// Microsoft's `email` claim is whatever an organization's admin typed, so it proves nothing on its own. It counts as
// verified for a personal account, or when Microsoft says the organization verified the email's domain (`xms_edov`,
// an optional claim the setup wizard has Justin add to the app registration).
function isVerifiedMicrosoftEmail(profile: Record<string, unknown>) {
	if (!profile.email) return false;
	if (profile.tid === MICROSOFT_PERSONAL_TENANT) return true;
	return profile.xms_edov === true || profile.xms_edov === 'true' || profile.xms_edov === 1;
}

// Google and Microsoft, each only when its keys are set. Their callback addresses are Better Auth's
// `/api/auth/callback/google` and `/api/auth/callback/microsoft`, which the setup wizard tells Justin to register.
function toSocialProviders({ google, microsoft }: Pick<AuthOptionsType, 'google' | 'microsoft'>) {
	return {
		...(google && { google: { ...google, prompt: 'select_account' as const } }),
		...(microsoft && {
			microsoft: {
				...microsoft,
				// Any organization's account and personal accounts.
				tenantId: 'common',
				prompt: 'select_account' as const,
				disableDefaultScope: true,
				scope: NAME_AND_EMAIL,
				disableProfilePhoto: true,
				mapProfileToUser: (profile: Record<string, unknown>) => ({
					emailVerified: isVerifiedMicrosoftEmail(profile)
				})
			}
		})
	};
}

export function createAuth({
	db,
	secret,
	sender,
	baseURL,
	trustedOrigins,
	isSecure,
	getRequestEvent = () => undefined,
	google,
	microsoft
}: AuthOptionsType) {
	return betterAuth({
		appName: 'Trident Cubed',
		baseURL: baseURL ?? (isSecure ? undefined : LOCAL_BASE_URL),
		trustedOrigins,
		secret,
		database: drizzleAdapter(db, { provider: 'pg', schema }),
		advanced: { database: { generateId: 'uuid' }, useSecureCookies: isSecure },
		socialProviders: toSocialProviders({ google, microsoft }),
		// All three ways reach the same user when the email is the same and verified (spec #179). No provider is
		// trusted without that: an unverified sign-in neither joins an existing user nor makes a new one, so nobody
		// can claim an email first and share the user its real owner later signs in to.
		account: { accountLinking: { enabled: true, requireLocalEmailVerified: true } },
		user: {
			additionalFields: {
				isSuperAdmin: { type: 'boolean', defaultValue: false, input: false, required: false }
			}
		},
		databaseHooks: {
			user: {
				create: {
					async before(user) {
						if (!user.emailVerified) {
							throw new APIError('FORBIDDEN', {
								code: 'email_not_verified',
								message: 'That account does not show a verified email address.'
							});
						}
					}
				}
			},
			// The sign-in rule (#182), at every sign-in by any way: memberships from the verified email.
			session: {
				create: {
					async before(session) {
						const activeOrganizationId = await grantAccess(db, session.userId);
						return { data: { ...session, activeOrganizationId } };
					}
				}
			}
		},
		// On everywhere (Better Auth leaves it off in development), kept in the database so every server of a
		// serverless deployment counts the same requests. The login page sends codes through Better Auth's own address
		// (`signin.ts`), so its sends count with any made to that address directly.
		rateLimit: { enabled: true, storage: 'database' },
		session: {
			expiresIn: 30 * DAY,
			updateAge: DAY,
			cookieCache: { enabled: true, maxAge: 5 * 60 }
		},
		plugins: [
			emailOTP({
				otpLength: 6,
				expiresIn: CODE_MINUTES * 60,
				allowedAttempts: 5,
				storeOTP: 'hashed',
				rateLimit: CODE_SENDS,
				async sendVerificationOTP({ email, otp }) {
					await sender.send(toCodeEmail(email, otp, CODE_MINUTES));
				}
			}),
			organization({
				ac: AC,
				roles: ROLES,
				creatorRole: 'admin',
				allowUserToCreateOrganization: false
			}),
			// Last, as Better Auth requires.
			sveltekitCookies(getRequestEvent as () => RequestEvent)
		]
	});
}

export type AuthType = ReturnType<typeof createAuth>;
