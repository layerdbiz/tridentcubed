// Helpers for tests that need the database or a signed-in User (#181). Every call gives a fresh, empty in-process
// database with the real schema, and Better Auth on it with the server-log email sender, so a test reads the
// emailed code exactly as an agent reads it from a local server's log. The database starts from the one seed (the
// Trident Cubed organization, domain tridentcubed.com), and `claims` is the claims helper on it (#182).
// Never imported by app code.
import { findActor } from './access';
import { createAuth } from './auth';
import { createClaims } from './db/claims';
import { createMemoryDatabase } from './db/index';
import { seedDatabase } from './db/seed';
import { createLogSender } from './email';
import { sendCode, verifyCode } from './signin';

export const TEST_SECRET = 'test-secret-that-is-at-least-32-characters-long';

export async function createTestSignIn() {
	const db = await createMemoryDatabase();
	await seedDatabase(db);
	const claims = createClaims(db);
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

	// Who a Cookie header's User is, as the server hook works it out (`event.locals.actor`).
	async function readActor(cookie: string) {
		const found = await auth.api.getSession({ headers: new Headers({ cookie }) });
		if (!found) throw new Error('That cookie has no session.');
		return findActor(claims, found.user, found.session.activeOrganizationId);
	}

	// Signs a User in by email the way the login page does, and gives back the user, their Cookie header and who
	// the server takes them to be.
	async function signIn(email: string) {
		const sent = await sendCode(auth, email);
		if (!sent.ok) throw new Error(sent.message);
		const result = await verifyCode(auth, { email, code: readCode(email) });
		if (!result.ok) throw new Error(result.message);
		return { ...result, actor: await readActor(result.cookie) };
	}

	return { db, auth, claims, lines, readCode, readActor, signIn };
}
