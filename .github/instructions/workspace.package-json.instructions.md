---
name: Workspace Package Manifest Rules
description: 'Use when editing any package.json in the monorepo. Covers workspace dependency versions, dependency placement, and package manifest conventions.'
applyTo: '**/package.json'
---

# Workspace Package Manifest Rules

- Use `workspace:*` for internal package references.
- Keep build tools in `devDependencies`, not `dependencies`.
- Follow semver and show `^major.minor.patch` for external packages.
- When package installation is required, use root-level ` pnpm --filter <package-name> add <dependency>` as described in `.github/copilot-instructions.md`.
- In `packages/ui/package.json`, preserve exports for both `/src` development entry points and `/` built entry points.
- In the root `package.json`, keep `apps` as the default runtime app map for root `dev`, `build`, and `preview`; keys should match app package names discovered from `apps/*/package.json`.
- Prefer a real-boolean `apps` object. The workspace launcher still accepts the legacy array shape for compatibility, but the object map is the preferred structure.
- Keep the root runtime script surface minimal: `workspace`, `dev`, `watch`, `build`, and `preview` should remain the main entrypoints.
- Prefer one-off overrides via `pnpm <command> -- <app>` instead of restoring large per-app alias script matrices in the root manifest.
