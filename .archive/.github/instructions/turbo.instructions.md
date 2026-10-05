---
name: Turborepo Rules
description: 'Use when editing turbo.json. Covers persistent task dependency pitfalls, watch-mode deadlocks, and task dependency structure.'
applyTo: 'turbo.json'
---

# Turborepo Task Dependency Rules

## Task Contracts

- `build` depends on `^build` and the root `//#barrels` task.
- `storybook` depends on `^build` because it needs built UI components.
- Barrel tasks are never cached.
- Watch tasks such as `dev` are persistent.
- Root runtime app selection belongs in the root `package.json` `apps` object and the workspace launcher, not in `turbo.json`.
- `//#barrels` and `//#barrels:watch` should use broad app globs such as `apps/*/src/lib/**` and `apps/*/src/lib/index.ts` instead of handwritten per-app lists.
- Barrel coverage is global across discovered apps; do not narrow root barrel tasks to the runtime app defaults.

## Persistent Task Deadlocks

Never make persistent tasks depend on non-persistent tasks in `turbo.json`.

- Persistent tasks run forever and never exit.
- Non-persistent tasks run once and exit.
- In watch mode, a persistent task waiting on a non-persistent dependency can block that dependency from ever re-running.

When a watch flow needs both persistent app tasks and one-shot generation tasks, watch them together explicitly instead of chaining them with `dependsOn`.

## Debugging Tips

- If `pnpm dev` hangs but manual commands work, check for persistent-to-non-persistent dependencies.
- Use `turbo run [task] --dry` to inspect task dependency chains.
- If root runtime selection is wrong, check the root `package.json` `apps` object and the workspace launcher before changing `turbo.json`.
