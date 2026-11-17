// From the `sv create` scaffold's Drizzle add-on (ADR 0001, #180), conformed: generating migrations needs no
// database, so DATABASE_URL is read only when a command that talks to one (push, migrate, studio) has it set.
// Vercel builds never run this; the schema reaches Supabase as one migration (spec #179).
import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL;

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	...(url ? { dbCredentials: { url } } : {}),
	verbose: true,
	strict: true
});
