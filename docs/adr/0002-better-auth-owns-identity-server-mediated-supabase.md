---
status: accepted
---

# Better Auth owns identity and the SvelteKit server is the only Supabase client

Report Generator V1 signs its users in with Better Auth, whose user, session and account tables live in the Supabase Postgres through Drizzle with UUID ids. The SvelteKit server is the only client of Supabase, holding the secret key; the browser never receives a Supabase token. Row Level Security stays on and is enforced through one Drizzle transaction-local claims helper that every query goes through; Storage is reached through server-signed upload and download URLs. Decided on 2026-10-05 ([#115](https://github.com/layerdbiz/tridentcubed/issues/115)): Justin wants the user list in the app's own tables, Matt's run picked this pattern, and the sync-engine research found that PowerSync fits it with no browser token. Sources: `docs/research/2026-10-05-better-auth-with-supabase.md` and `docs/research/2026-10-05-better-auth-on-sveltekit-3.md`.

## Considered options

- Supabase Auth throughout: the fewest steps on paper (Justin's own 2026-10-03 research recommended it), but users would live in Supabase's `auth.users`, session rules would follow the Supabase plan, and it contradicts the stated plan.
- Better Auth tokens registered with Supabase as a third-party issuer: mechanically possible through the Management API but undocumented, absent from Studio's menu and not reproducible in local development. It stays an experiment on the Realtime prototype ([#117](https://github.com/layerdbiz/tridentcubed/issues/117)), not the plan.

## Consequences

- Supabase Realtime private channels need a token Supabase can verify, which this pattern does not give the browser. The prototype on #117 tries two routes; if both fail, V1 keeps Better Auth and does presence and cursors without Supabase Realtime rather than switching identity providers. ADR 0008 makes that the V1 plan by choice: presence travels through PowerSync, and Supabase Realtime waits for live cursors after V1.
- A direct query under the owner role skips Row Level Security, so the claims helper must be the only query path and a lint or test must catch any other.
- Supabase Auth keeps running unused (it cannot be disabled); its MAU meter and `auth.users` stay empty.
- V1 sign-in methods are Microsoft, Google and an emailed one-time code, with one "Continue with" screen that creates the user on first use; sessions last 30 days and renew on every use; anyone may create a user, and the verified email decides at each sign-in whether they are staff, an admin or a guest. The detail lives on #115.
