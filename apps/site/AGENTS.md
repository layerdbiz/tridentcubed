# apps/site (tridentcubed.com)

Shared conventions: root `AGENTS.md`. The app layout rules in
`../app/AGENTS.md` apply here too; this file holds what differs.

- Data lives in `src/lib/<topic>/<topic>.remote.ts` (about, contact, email,
  faq, globe, icons, partners, sections, services, team, testimonials) and
  is imported from the `#lib` barrel (Kit 3's `package.json#imports`; `$lib`
  is gone). `prerender` for build-time
  content (`getXData`), `query` for Sheetari reads (`fetchX`), `form` for
  contact (`submitX`).
- Sheetari is read live; nothing reads a local snapshot.
- The globe component is a known hack: minimal changes until the Report
  Generator is done.

## Known exceptions

`HomePage.svelte` (1,059 lines, PascalCase) waits for "UI library
cleanup" (#33), not a mid-feature fix. Its `submitContactData.enhance` call
still uses the callback shape Kit 2.61 changed; the Kit 3 upgrade (#83)
left it alone. Whether the contact form still submits is checked by hand
on #15: it posts to a live Zapier hook, so never submit it from a test or
a session.
