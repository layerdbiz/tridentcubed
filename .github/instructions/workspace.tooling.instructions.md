---
name: Workspace Tooling Rules
description: 'Use when editing shared workspace config files such as svelte.config.js, vite.config.ts, tsconfig.json, and pnpm-workspace.yaml. Covers shared config package usage.'
applyTo: 'pnpm-workspace.yaml,**/svelte.config.js,**/vite.config.ts,**/tsconfig.json'
---

# Workspace Tooling Rules

- Svelte config should import from `@layerd/config-svelte`.
- TypeScript config should extend from `@layerd/config-ts`.
- Vite config should import plugins from `@layerd/config-vite`.
- Keep shared config files workspace-wide and additive; do not bury app-specific runtime behavior in them.
- In `pnpm-workspace.yaml`, preserve the broad workspace globs for `apps/*`, `packages/*`, and `packages/config/*` unless the monorepo shape is intentionally changing.
