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

/** Where a request to send a code came from: the visitor's address, and the app's own origin it came to. */
export type SendFromType = { ip?: string; origin?: string };

const TOO_MANY = 'Too many codes were asked for from here. Wait a minute, then send a new code.';

// The app's own origin: Better Auth's fixed address when the deployment has one (always trusted), else the one the
// request came to (local, where any host is), else the dev server's.
function toOrigin(auth: AuthType, origin?: string) {
	const { baseURL } = auth.options;
	if (typeof baseURL === 'string') return new URL(baseURL).origin;
	return origin ?? 'http://localhost:5174';
}

/**
 * Sends a sign-in code to `email`. It goes through Better Auth's own address rather than `auth.api`, which skips the
 * rate limit: so a visitor's sends count, by their address, with any made to that address directly.
 */
export async function sendCode(
	auth: AuthType,
	email: string,
	from: SendFromType = {}
): Promise<SendCodeResultType> {
	const origin = toOrigin(auth, from.origin);
	const headers = new Headers({ 'content-type': 'application/json', origin });
	if (from.ip) headers.set('x-forwarded-for', from.ip);
	let response: Response;
	try {
		response = await auth.handler(
			new Request(new URL('/api/auth/email-otp/send-verification-otp', origin), {
				method: 'POST',
				headers,
				body: JSON.stringify({ email: email.trim(), type: 'sign-in' })
			})
		);
	} catch (error) {
		console.error('[sign-in] the code could not be sent', error);
		return { ok: false, message: 'The code could not be sent. Try again in a minute.' };
	}
	if (response.ok) return { ok: true };
	if (response.status === 429) return { ok: false, message: TOO_MANY };
	const body = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
	console.error('[sign-in] the code could not be sent', response.status, body.code ?? body.message);
	return {
		ok: false,
		message:
			body.code === 'INVALID_EMAIL'
				? 'That email address does not look right.'
				: 'The code could not be sent. Try again in a minute.'
	};
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
