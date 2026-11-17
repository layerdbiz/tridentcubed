// Prints the one seed as SQL to stdout (#194): `pnpm --silent --filter app db:seed-sql > seed.sql`. Supabase takes its
// starting rows through the connector, SQL only; the SQL comes from the seed itself (`toSeedSql` in
// src/lib/server/db/seed.ts), so its rows and ids cannot drift from it. A bare Vite server loads the app's code as
// the app and its tests do (`?raw` imports, the `#lib` subpath). The output is not committed.
import { createServer } from 'vite';

const server = await createServer({
	root: new URL('..', import.meta.url).pathname,
	configFile: false,
	logLevel: 'silent',
	server: { middlewareMode: true, hmr: false, ws: false },
	appType: 'custom'
});
try {
	const client = await server.ssrLoadModule('/src/lib/server/db/index.ts');
	const seed = await server.ssrLoadModule('/src/lib/server/db/seed.ts');
	process.stdout.write(await seed.toSeedSql(await client.createMemoryDatabase()));
} finally {
	await server.close();
}
process.exit(0);
