// The two steps of signing in with an emailed code (#181), as the login page's forms take them: send a code to an
// email, then check the code typed back. Better Auth does the work; this turns its errors into plain words the page
// shows as they are, and never says whether an email already has a user.
import { isAPIError } from 'better-auth/api';
import type { AuthType } from './auth';

export type SignInUserType = { id: string; email: string; name: string };

export type SendCodeResultType = { ok: true } | { ok: false; message: string };

export type VerifyCodeResultType =
	| { ok: true; user: SignInUserType; cookie: string }
	| { ok: false; reason: 'wrong' | 'expired' | 'used-up'; message: string };

const MESSAGES = {
	wrong: 'That code is not right. Check it, or send a new code.',
	expired: 'That code has expired. Send a new code to try again.',
	'used-up': 'That code was tried too many times. Send a new code to try again.'
} as const;

function toReason(error: unknown) {
	const code = isAPIError(error) ? (error.body?.code as string | undefined) : undefined;
	if (code === 'OTP_EXPIRED') return 'expired';
	if (code === 'TOO_MANY_ATTEMPTS') return 'used-up';
	if (code === 'INVALID_OTP') return 'wrong';
	return undefined;
}

export async function sendCode(auth: AuthType, email: string): Promise<SendCodeResultType> {
	try {
		await auth.api.sendVerificationOTP({ body: { email: email.trim(), type: 'sign-in' } });
		return { ok: true };
	} catch (error) {
		console.error('[sign-in] the code could not be sent', error);
		const isBadEmail = isAPIError(error) && error.body?.code === 'INVALID_EMAIL';
		return {
			ok: false,
			message: isBadEmail
				? 'That email address does not look right.'
				: 'The code could not be sent. Try again in a minute.'
		};
	}
}

export async function verifyCode(
	auth: AuthType,
	{ email, code, headers }: { email: string; code: string; headers?: Headers }
): Promise<VerifyCodeResultType> {
	try {
		const result = await auth.api.signInEmailOTP({
			body: { email: email.trim(), otp: code.replaceAll(/\s/g, '') },
			headers: headers ?? new Headers(),
			returnHeaders: true
		});
		const { id, email: address, name } = result.response.user;
		return { ok: true, user: { id, email: address, name }, cookie: toCookie(result.headers) };
	} catch (error) {
		const reason = toReason(error);
		if (!reason) throw error;
		return { ok: false, reason, message: MESSAGES[reason] };
	}
}

// The cookies a response sets, as one Cookie header, so a test (or a server-side caller) can send them back.
function toCookie(headers: Headers) {
	return headers
		.getSetCookie()
		.map((line) => line.split(';')[0])
		.join('; ');
}
