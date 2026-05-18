---
name: Workspace Tooling Rules
description: 'Use when editing shared workspace config files such as svelte.config.js, vite.config.ts, tsconfig.json, and pnpm-workspace.yaml. Covers shared config package usage.'
applyTo:
  - 'pnpm-workspace.yaml'
  - '**/svelte.config.js'
  - '**/vite.config.ts'
  - '**/tsconfig.json'
---

# Workspace Tooling Rules

## Configuration Sharing

- Svelte config: import from `@layerd/config-svelte`
- TypeScript config: extend from `@layerd/config-ts`
- Vite config: import plugins from `@layerd/config-vite`
- In `pnpm-workspace.yaml`, preserve the broad workspace globs for `apps/*`, `packages/*`, and `packages/config/*` unless the monorepo shape is intentionally changing.
