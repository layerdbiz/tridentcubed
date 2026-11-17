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

## Amendment, 2026-11-12

Decided on "Sign in and save to the real database" ([#179](https://github.com/layerdbiz/tridentcubed/issues/179)), on autopilot and for Justin's review.

- **The roles are Admin, Manager and Team**, Justin's words of 2026-10-24, which the look prototype's Team records already use. Member above is renamed Team, and Manager is added. For now Manager and Team may do the same things: read and change everything in their organization except its details, a Team record's role and the Archived status, and delete only a Draft they made. An Admin may do all of it. Nobody demotes the Super admin or the organization's last Admin. A project that is Sent, Complete or Archived refuses every change but a change of status.
- **Access grants** replace the bootstrap addresses: a short private list of email addresses, each with a role, whether it is the Super admin, and optionally the Team record that User signs in as. It is kept in the database, never in this repository.
- **The email domain rule** replaces the hard-coded `@tridentcubed.com`: the organization's details hold its email domain, and a verified address at that domain joins it with the Team role.
- At every sign-in the server decides access from the verified email in that order: an access grant, then the email domain, otherwise a Guest. A staff User is tied to the Team record with the same email (or the one their grant names), or gets a new Team record; that record's role is their membership's role.
- Users, Deactivated and its pages wait for a later spec; until then roles are changed on the Team record.
