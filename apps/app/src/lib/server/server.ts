// The server's one database and one Better Auth, made on first use from the deployment's settings (#181).
// Production with a setting missing gets no database and no auth: the guard sends every visitor to the login page,
// which says the app is not connected yet and names what is missing. The in-process database is kept on
// `globalThis`, so it (and everyone signed into it) survives the dev server reloading these modules; it starts from
// the one seed. The raw database stays in here and in Better Auth: app code gets the claims helper (#182).
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getRequestEvent } from '$app/server';
import * as env from '$app/env/private';
import { type AuthType, createAuth } from './auth';
import { type ClaimsType, createClaims } from './db/claims';
import { createDatabase, createMemoryDatabase, type DatabaseType } from './db/index';
import { seedDatabase } from './db/seed';
import { createLogSender, createResendSender, type EmailSenderType } from './email';
import { readSettings, type SettingsType } from './settings';
import { createLocalStore, createSupabaseStore, type FileStoreType } from './store';

export type ServerType = {
	settings: SettingsType;
	claims?: ClaimsType;
	auth?: AuthType;
	/** Where files are kept (#187); none in a production deployment without the Supabase settings. */
	store?: FileStoreType;
};

// Outside production with no Supabase settings, files lie in a folder of the system's temporary files, which is
// emptied with the machine, as the in-process database is with the dev server.
const LOCAL_FOLDER = join(tmpdir(), 'trident-files');

const KEY = Symbol.for('trident.memory-database');
const store = globalThis as typeof globalThis & { [KEY]?: Promise<DatabaseType> };

let server: Promise<ServerType> | undefined;

function toSender(settings: SettingsType): EmailSenderType {
	if (settings.resendApiKey) return createResendSender(settings.resendApiKey);
	if (settings.email === 'log') return createLogSender();
	return {
		async send() {
			throw new Error('No email sender is set (RESEND_API_KEY).');
		}
	};
}

async function createSeededMemoryDatabase() {
	const db = await createMemoryDatabase();
	await seedDatabase(db);
	return db;
}

async function start(): Promise<ServerType> {
	const settings = readSettings({ ...env });
	if (!settings.isConnected) return { settings };

	const db = settings.databaseUrl
		? createDatabase(settings.databaseUrl)
		: await (store[KEY] ??= createSeededMemoryDatabase());
	const auth = createAuth({
		db,
		secret: settings.secret,
		sender: toSender(settings),
		baseURL: settings.baseURL,
		trustedOrigins: settings.trustedOrigins,
		isSecure: settings.isProduction,
		getRequestEvent,
		google: settings.google,
		microsoft: settings.microsoft
	});
	return { settings, claims: createClaims(db), auth, store: toStore(settings) };
}

function toStore(settings: SettingsType): FileStoreType | undefined {
	if (settings.supabase) return createSupabaseStore(settings.supabase);
	if (settings.storage === 'local') {
		return createLocalStore({ folder: LOCAL_FOLDER, secret: settings.secret });
	}
	return undefined;
}

export function getServer() {
	server ??= start();
	return server;
}
