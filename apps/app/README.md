# apps/app

The Report Generator: turns a project's inputs into a report for Trident Cubed's
marine survey business.

Run it from this folder with `pnpm exec vp dev --host --port 5174`, preview a
build with `pnpm exec vp build` then `pnpm exec vp preview --host --port 4174`.

Agent rules: `AGENTS.md` here and at the repository root.

## Set up the dev app's keys

Every step only Justin can do for https://dev.app.tridentcubed.com (Google
sign-in, the database password, the storage key, the Vercel settings, then
Microsoft sign-in and Resend when wanted) is one guided wizard. From the
repository root, in Git Bash:

```
bash scripts/setup-dev-app.sh
```
