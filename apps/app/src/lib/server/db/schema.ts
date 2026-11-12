// The app's database schema in Drizzle (ADR 0002, 0005; spec #179 "Tables"), from the `sv create` scaffold's
// Drizzle add-on. Every table is declared here (or in a file this one re-exports), so `schema.sql` and, at the end
// of the run, the one initial migration are written from it.
export * from './auth.schema';
export * from './organization.schema';
