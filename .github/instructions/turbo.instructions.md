---
name: Turborepo Rules
description: 'Use when editing turbo.json. Covers persistent task dependency pitfalls, watch-mode deadlocks, and task dependency structure.'
applyTo: 'turbo.json'
---

# Turborepo Task Dependency Rules

## Turborepo Task Dependencies

- `build` depends on `^build` (topological)
- `build` also depends on the root `//#barrels` task
- `storybook` depends on `^build` (needs built UI components)
- `barrel` tasks are never cached (always fresh generation)
- Watch tasks (`dev`, `story:watch`) are persistent
- Root runtime app selection belongs in the root `package.json` `apps` object and the workspace launcher, not in `turbo.json`.
- `//#barrels` and `//#barrels:watch` should use broad app globs such as `apps/*/src/lib/**` and `apps/*/src/lib/index.ts` rather than handwritten per-app lists.
- Barrel coverage is global across discovered apps; do not narrow the root barrel tasks to match the runtime app defaults.

## The Persistent Task Deadlock Problem

**NEVER** make persistent tasks depend on non-persistent tasks in `turbo.json`:

```json
// ❌ WRONG - This will cause deadlocks in watch mode
"storybook#dev": {
  "dependsOn": ["sync", "^components", "story"],
  "persistent": true
}
```

```json
// ✅ CORRECT - Persistent tasks should only depend on other persistent/build tasks
"storybook#dev": {
  "dependsOn": ["sync", "^components"],
  "persistent": true
}
```

## The Solution: Watch Multiple Tasks

Instead of making persistent tasks depend on non-persistent ones, watch them simultaneously:

```json
// package.json
"dev": "turbo watch dev story"
```

When a root watch flow needs both persistent app dev tasks and one-shot generation tasks such as story generation, watch them together explicitly instead of chaining them with `dependsOn`.

## Why This Happens

1. **Persistent tasks** (like `dev`, `storybook`) run forever and never exit
2. **Non-persistent tasks** (like `story`, `barrel`) run once and exit
3. In watch mode, if a persistent task depends on a non-persistent task, the non-persistent task can never re-run because the persistent task never exits
4. Result: tasks hang indefinitely waiting for dependencies that will never complete

## Debugging Tips

- If `pnpm dev` hangs but manual commands work, check for persistent to non-persistent dependencies
- Use `turbo run [task] --dry` to inspect task dependency chains
- Manual execution (`turbo run story`) will work fine - the issue only appears in watch mode
- If root runtime selection is wrong, check the root `package.json` `apps` object and the workspace launcher before changing `turbo.json`.
