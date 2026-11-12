// Helpers for tests that need the database or a signed-in User (#181). Every call gives a fresh, empty in-process
// database with the real schema, and Better Auth on it with the server-log email sender, so a test reads the
// emailed code exactly as an agent reads it from a local server's log. Never imported by app code.
import { createAuth } from './auth';
import { createMemoryDatabase } from './db/index';
import { createLogSender } from './email';
import { sendCode, verifyCode } from './signin';

export const TEST_SECRET = 'test-secret-that-is-at-least-32-characters-long';

export async function createTestSignIn() {
	const db = await createMemoryDatabase();
	const lines: string[] = [];
	const auth = createAuth({
		db,
		secret: TEST_SECRET,
		sender: createLogSender((line) => lines.push(line)),
		baseURL: 'http://localhost:5174',
		isSecure: false
	});

	// The last code the log shows for this email.
	function readCode(email: string) {
		const line = lines.findLast((each) => each.startsWith(`[email] to ${email.toLowerCase()}:`));
		const code = line?.match(/code is (\d{6})/)?.[1];
		if (!code) throw new Error(`No code was logged for ${email}`);
		return code;
	}

	// Signs a User in by email the way the login page does, and gives back the user and their Cookie header.
	async function signIn(email: string) {
		const sent = await sendCode(auth, email);
		if (!sent.ok) throw new Error(sent.message);
		const result = await verifyCode(auth, { email, code: readCode(email) });
		if (!result.ok) throw new Error(result.message);
		return result;
	}

	return { db, auth, lines, readCode, signIn };
}
