// The login page's data (#181): which sign-in ways this deployment has, or the settings it still lacks, the two
// forms of the emailed-code way, and the form that starts Continue with Google or Microsoft (#191). These are public endpoints by design: they are how a signed-out visitor
// signs in, and they never say whether an email already has a user.
import { form, getRequestEvent, query } from '$app/server';
import { redirect } from '@sveltejs/kit';
import * as v from 'valibot';
import { CODE_MINUTES } from '#lib/server/auth.js';
import { toNext } from '#lib/server/guard.js';
import { getServer } from '#lib/server/server.js';
import { sendCode, verifyCode } from '#lib/server/signin.js';

const NOT_CONNECTED = 'The app is not connected yet.';

const EMAIL = v.pipe(
	v.string(),
	v.trim(),
	v.nonEmpty('Type your email.'),
	v.email('That email address does not look right.')
);

export const fetchSignInWays = query(async () => {
	const { settings } = await getServer();
	return {
		isConnected: settings.isConnected,
		ways: settings.ways,
		missing: settings.missing,
		codeMinutes: CODE_MINUTES
	};
});

export const submitEmail = form(v.object({ email: EMAIL }), async ({ email }) => {
	const { settings, auth } = await getServer();
	if (!auth || !settings.ways.includes('email')) {
		return { isSent: false as const, email, message: NOT_CONNECTED };
	}
	const event = getRequestEvent();
	const sent = await sendCode(auth, email, {
		ip: event.getClientAddress(),
		origin: event.url.origin
	});
	return sent.isSent
		? { isSent: true as const, email }
		: { isSent: false as const, email, message: sent.message };
});

export const submitCode = form(
	v.object({
		email: EMAIL,
		code: v.pipe(v.string(), v.trim(), v.nonEmpty('Type the code from the email.')),
		next: v.optional(v.string(), '')
	}),
	async ({ email, code, next }) => {
		const { auth } = await getServer();
		if (!auth) return { message: NOT_CONNECTED };
		const result = await verifyCode(auth, {
			email,
			code,
			headers: getRequestEvent().request.headers
		});
		if (!result.isSignedIn) return { message: result.message };
		redirect(303, toNext(next));
	}
);

// The only other sites the login page sends a browser to.
const PROVIDER_ORIGINS = ['https://accounts.google.com', 'https://login.microsoftonline.com'];

// Sends the browser to Google or Microsoft. They send it back to Better Auth's callback address, which signs the User
// in and goes on to `next`; a sign-in that did not work comes back to this page with `?error=`.
export const submitProvider = form(
	v.object({
		provider: v.picklist(['google', 'microsoft']),
		next: v.optional(v.string(), '')
	}),
	async ({ provider, next }) => {
		const { settings, auth } = await getServer();
		if (!auth || !settings.ways.includes(provider)) return { message: NOT_CONNECTED };
		const to = toNext(next);
		const started = await auth.api
			.signInSocial({
				body: {
					provider,
					callbackURL: to,
					errorCallbackURL: to === '/' ? '/login' : `/login?next=${encodeURIComponent(to)}`
				},
				headers: getRequestEvent().request.headers
			})
			.catch((error: unknown) => {
				console.error(`[sign-in] ${provider} could not start`, error);
				return undefined;
			});
		if (!started?.url) return { message: 'That sign-in could not start. Try again in a minute.' };
		redirect(303, started.url, { external: PROVIDER_ORIGINS });
	}
);
