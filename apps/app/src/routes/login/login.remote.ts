// The login page's data (#181): which sign-in ways this deployment has, or the settings it still lacks, and the
// two forms of the emailed-code way. These are public endpoints by design: they are how a signed-out visitor
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
		return { ok: false as const, email, message: NOT_CONNECTED };
	}
	const sent = await sendCode(auth, email);
	return sent.ok
		? { ok: true as const, email }
		: { ok: false as const, email, message: sent.message };
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
		if (!result.ok) return { message: result.message };
		redirect(303, toNext(next));
	}
);
