// The emailed-code sign-in (#181), through the same two steps the login page takes, against the in-process
// database with the real schema. The code is read from the server log, as an agent signing in locally reads it.
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { createTestAuth, createTestSignIn } from './testing';
import { sendCode, verifyCode } from './signin';
import { CODE_MINUTES } from './auth';

afterEach(() => {
	vi.useRealTimers();
});

describe('signing in with a code sent by email', () => {
	it('signs a new User in with the code that was sent, and the session finds them', async () => {
		const { auth, readCode } = await createTestSignIn();

		expect(await sendCode(auth, 'Ana@Example.com')).toEqual({ ok: true });
		const code = readCode('ana@example.com');
		expect(code).toMatch(/^\d{6}$/);

		const result = await verifyCode(auth, { email: 'ana@example.com', code });
		if (!result.ok) throw new Error(result.message);
		expect(result.user.email).toBe('ana@example.com');

		const session = await auth.api.getSession({ headers: new Headers({ cookie: result.cookie }) });
		expect(session?.user.id).toBe(result.user.id);
	});

	it('signs the same user in the second time, whatever the capitals', async () => {
		const { signIn } = await createTestSignIn();

		const first = await signIn('bo@example.com');
		const second = await signIn('Bo@Example.com');

		expect(second.user.id).toBe(first.user.id);
		expect(second.cookie).not.toBe(first.cookie);
	});

	it('says plainly when the code is wrong, and a new code still works', async () => {
		const { auth, readCode } = await createTestSignIn();
		await sendCode(auth, 'cy@example.com');
		const sent = readCode('cy@example.com');
		const wrong = sent === '000000' ? '111111' : '000000';

		const result = await verifyCode(auth, { email: 'cy@example.com', code: wrong });
		expect(result).toEqual({
			ok: false,
			reason: 'wrong',
			message: 'That code is not right. Check it, or send a new code.'
		});

		await sendCode(auth, 'cy@example.com');
		const again = await verifyCode(auth, {
			email: 'cy@example.com',
			code: readCode('cy@example.com')
		});
		expect(again.ok).toBe(true);
	});

	it('says plainly when the code has expired', async () => {
		const { auth, readCode } = await createTestSignIn();
		vi.useFakeTimers({ toFake: ['Date'] });
		await sendCode(auth, 'di@example.com');

		vi.setSystemTime(Date.now() + (CODE_MINUTES + 1) * 60 * 1000);
		const result = await verifyCode(auth, {
			email: 'di@example.com',
			code: readCode('di@example.com')
		});

		expect(result).toEqual({
			ok: false,
			reason: 'expired',
			message: 'That code has expired. Send a new code to try again.'
		});
	});

	it('takes a code with spaces in it, as a phone may paste it', async () => {
		const { auth, readCode } = await createTestSignIn();
		await sendCode(auth, 'ed@example.com');
		const code = readCode('ed@example.com');

		const result = await verifyCode(auth, {
			email: ' ed@example.com ',
			code: `${code.slice(0, 3)} ${code.slice(3)}`
		});

		expect(result.ok).toBe(true);
	});
});

// Sending codes is limited (open item from #181): three a minute from one address, through Better Auth's own rate
// limit kept in the database, so every server of a serverless deployment counts the same sends.
describe('how often codes are sent', () => {
	const HERE = '203.0.113.7';
	const TOO_MANY = 'Too many codes were asked for from here. Wait a minute, then send a new code.';

	it('refuses the fourth code asked for from one address within a minute, and sends none', async () => {
		const { auth, lines } = await createTestSignIn();

		for (const name of ['fa', 'fb', 'fc'])
			expect(await sendCode(auth, `${name}@example.com`, { ip: HERE })).toEqual({ ok: true });
		expect(await sendCode(auth, 'fd@example.com', { ip: HERE })).toEqual({
			ok: false,
			message: TOO_MANY
		});

		expect(lines.some((line) => line.includes('fd@example.com'))).toBe(false);
		expect(await sendCode(auth, 'fd@example.com', { ip: '198.51.100.2' })).toEqual({ ok: true });
	});

	it('still says plainly when the address does not look right', async () => {
		const { auth } = await createTestSignIn();

		expect(await sendCode(auth, 'not-an-email', { ip: HERE })).toEqual({
			ok: false,
			message: 'That email address does not look right.'
		});
	});

	it('sends again once the minute has passed', async () => {
		const { auth } = await createTestSignIn();
		vi.useFakeTimers({ toFake: ['Date'] });
		for (const name of ['ga', 'gb', 'gc'])
			await sendCode(auth, `${name}@example.com`, { ip: HERE });

		vi.setSystemTime(Date.now() + 61 * 1000);

		expect(await sendCode(auth, 'gd@example.com', { ip: HERE })).toEqual({ ok: true });
	});

	it('counts the sends of every server on the database, and of Better Auth’s own address', async () => {
		const { auth, db } = await createTestSignIn();
		const other = createTestAuth(db);
		const post = () =>
			auth.handler(
				new Request('http://localhost:5174/api/auth/email-otp/send-verification-otp', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						origin: 'http://localhost:5174',
						'x-forwarded-for': HERE
					},
					body: JSON.stringify({ email: 'ha@example.com', type: 'sign-in' })
				})
			);

		expect((await post()).status).toBe(200);
		expect(await sendCode(other, 'hb@example.com', { ip: HERE })).toEqual({ ok: true });
		expect((await post()).status).toBe(200);
		expect((await post()).status).toBe(429);
		expect(await sendCode(other, 'hc@example.com', { ip: HERE })).toEqual({
			ok: false,
			message: TOO_MANY
		});
	});
});
