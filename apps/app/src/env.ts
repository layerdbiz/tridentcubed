// The settings the app reads (Kit 3 `defineEnvVars`, from the `sv create` scaffold; read through
// `$app/env/private`). Every one is optional, so the app builds and runs with none: `#lib/server/settings.ts`
// decides what a missing one means, and a production deployment names what it lacks on the login page.
// The names are the contract the setup wizard writes to Vercel (spec #179).
import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (description: string) => ({
	description,
	schema: (value: string | undefined) => value || undefined
});

export const variables = defineEnvVars({
	DATABASE_URL: optional(
		'Supabase Postgres through its transaction pooler (port 6543). Unset outside production: the in-process database.'
	),
	BETTER_AUTH_SECRET: optional(
		'Signs sessions: 32 or more random characters. Unset outside production: a fixed development secret.'
	),
	BETTER_AUTH_URL: optional(
		"The app's own address, when Vercel's own variables do not give the right one."
	),
	RESEND_API_KEY: optional(
		'Sends sign-in codes from noreply@tridentcubed.com. Unset outside production: codes go to the server log.'
	),
	GOOGLE_CLIENT_ID: optional(
		"Continue with Google (#191), with the secret. The Google client's redirect URI is <app>/api/auth/callback/google."
	),
	GOOGLE_CLIENT_SECRET: optional('Continue with Google (#191), with the client ID.'),
	MICROSOFT_CLIENT_ID: optional(
		"Continue with Microsoft (#191), with the secret. The Entra app's redirect URI is <app>/api/auth/callback/microsoft; it needs the optional ID token claims email and xms_edov."
	),
	MICROSOFT_CLIENT_SECRET: optional('Continue with Microsoft (#191), with the client ID.'),
	VERCEL: optional('Set by Vercel: this is a deployment, so production rules apply.'),
	VERCEL_ENV: optional('Set by Vercel: production, preview or development.'),
	VERCEL_URL: optional("Set by Vercel: this deployment's own host."),
	VERCEL_BRANCH_URL: optional("Set by Vercel: the branch's host."),
	VERCEL_PROJECT_PRODUCTION_URL: optional("Set by Vercel: the project's production host.")
});
