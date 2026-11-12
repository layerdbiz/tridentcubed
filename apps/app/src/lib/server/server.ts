// The server's one database and one Better Auth, made on first use from the deployment's settings (#181).
// Production with a setting missing gets no database and no auth: the guard sends every visitor to the login page,
// which says the app is not connected yet and names what is missing. The in-process database is kept on
// `globalThis`, so it (and everyone signed into it) survives the dev server reloading these modules.
import { getRequestEvent } from '$app/server';
import * as env from '$app/env/private';
import { type AuthType, createAuth } from './auth';
import { createDatabase, createMemoryDatabase, type DatabaseType } from './db/index';
import { createLogSender, createResendSender, type EmailSenderType } from './email';
import { readSettings, type SettingsType } from './settings';

export type ServerType = { settings: SettingsType; db?: DatabaseType; auth?: AuthType };

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

async function start(): Promise<ServerType> {
	const settings = readSettings({ ...env });
	if (!settings.isConnected) return { settings };

	const db = settings.databaseUrl
		? createDatabase(settings.databaseUrl)
		: await (store[KEY] ??= createMemoryDatabase());
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
	return { settings, db, auth };
}

export function getServer() {
	server ??= start();
	return server;
}
