# apps/site (tridentcubed.com)

Shared conventions: root `AGENTS.md`. The app layout rules in
`../app/AGENTS.md` apply here too; this file holds what differs.

- Data lives in `src/lib/<topic>/<topic>.remote.ts` (about, contact, email,
  faq, globe, icons, partners, sections, services, team, testimonials) and
  is imported from the bare `$lib` barrel. `prerender` for build-time
  content (`getXData`), `query` for Sheetari reads (`fetchX`), `form` for
  contact (`submitX`).
- Sheetari is read live; nothing reads a local snapshot.
- The globe component is a known hack: minimal changes until the Report
  Generator is done.

## Known exceptions

`HomePage.svelte` (1,046 lines, PascalCase) and the `form.enhance` call
in it that uses the callback shape Kit 2.61 changed: both are fixed on the
Kit upgrade or "UI library cleanup" (#33), not mid-feature.
