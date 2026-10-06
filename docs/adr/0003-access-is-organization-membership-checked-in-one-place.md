---
status: accepted
---

# Access is organization membership, checked in one place

Report Generator V1 has one organization, Trident Cubed, yet access is stored as membership rows (a User, an organization, a role of Admin or Member) rather than a role column on the User. Justin wants client companies to sign up later as organizations of their own, Vercel-style, whose admins add and remove their own people, and wants the auth layer reusable in other projects; a role column would mean a rewrite on the day the second organization arrives. A User with no membership is a Guest. Every path that touches data (records, storage objects, live channels and replayed offline writes) asks one server-side permission check that reads the membership and Team tables, with Postgres Row Level Security behind it as a safety net through the claims helper from ADR 0002. Decided on 2026-10-05 and 2026-10-06 ([#118](https://github.com/layerdbiz/tridentcubed/issues/118)).

## Considered options

- A role column on the User (`admin`, `member`): fewer tables in V1, but client organizations, a User in two organizations, and an organization's own admins would all need a schema change.
- Row Level Security as the only gate: one place in theory, but rules for storage, live channels and offline replay would be spread across SQL policies the team does not read easily; the check in code is the gate and RLS catches a missed call.

## Consequences

- Membership is created by the server, never by the User: at each sign-in a verified `@tridentcubed.com` address gets a Member row in Trident Cubed unless one exists or the User is Deactivated, and the bootstrap addresses get an Admin row. Better Auth's organization plugin has no domain auto-join, so the app adds the row itself.
- Deactivation beats the domain rule: a Deactivated User cannot sign in again with a `@tridentcubed.com` address. Their sessions are revoked, so access ends within the session cookie cache (five minutes).
- The Super admin is a platform-level flag above every organization, not a membership role; in V1 it behaves like an Admin.
