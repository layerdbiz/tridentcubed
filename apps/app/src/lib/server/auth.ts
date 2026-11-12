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
import { betterAuth } from 'better-auth/minimal';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { organization } from 'better-auth/plugins/organization';
import { createAccessControl } from 'better-auth/plugins/access';
import { grantAccess } from './access';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import type { DatabaseType } from './db/index';
import * as schema from './db/schema';
import { type EmailSenderType, toCodeEmail } from './email';

const DAY = 60 * 60 * 24;

export const CODE_MINUTES = 10;

const AC = createAccessControl({ organization: [], member: [], invitation: [] });
const ROLES = { admin: AC.newRole({}), manager: AC.newRole({}), team: AC.newRole({}) };

export type AuthOptionsType = {
	db: DatabaseType;
	secret: string;
	sender: EmailSenderType;
	/** The app's own address, when the deployment knows it; locally it is read from each request. */
	baseURL?: string;
	/** Other addresses of this deployment that may post to it (a Vercel deployment's own URLs). */
	trustedOrigins?: string[];
	/** Secure cookies: on when deployed, off locally so a phone on the network (plain http) keeps the cookie. */
	isSecure: boolean;
	/** Kit's `getRequestEvent`, so Better Auth's cookies reach the response from hooks, forms and commands. */
	getRequestEvent?: () => RequestEvent | undefined;
};

export function createAuth({
	db,
	secret,
	sender,
	baseURL,
	trustedOrigins,
	isSecure,
	getRequestEvent = () => undefined
}: AuthOptionsType) {
	return betterAuth({
		appName: 'Trident Cubed',
		baseURL,
		trustedOrigins,
		secret,
		database: drizzleAdapter(db, { provider: 'pg', schema }),
		advanced: { database: { generateId: 'uuid' }, useSecureCookies: isSecure },
		user: {
			additionalFields: {
				isSuperAdmin: { type: 'boolean', defaultValue: false, input: false, required: false }
			}
		},
		databaseHooks: {
			session: {
				create: {
					async before(session) {
						const activeOrganizationId = await grantAccess(db, session.userId);
						return { data: { ...session, activeOrganizationId } };
					}
				}
			}
		},
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
