---
name: Turborepo Rules
description: 'Use when editing turbo.json. Covers persistent task dependency pitfalls, watch-mode deadlocks, and task dependency structure.'
applyTo: 'turbo.json'
---

# Turborepo Task Dependency Rules

## Turborepo Task Dependencies

- `build` depends on `^build` (topological)
- `storybook` depends on `^build` (needs built UI components)
- `barrel` tasks are never cached (always fresh generation)
- Watch tasks (`dev`, `story:watch`) are persistent

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

## Why This Happens

1. **Persistent tasks** (like `dev`, `storybook`) run forever and never exit
2. **Non-persistent tasks** (like `story`, `barrel`) run once and exit
3. In watch mode, if a persistent task depends on a non-persistent task, the non-persistent task can never re-run because the persistent task never exits
4. Result: tasks hang indefinitely waiting for dependencies that will never complete

## Debugging Tips

- If `pnpm dev` hangs but manual commands work, check for persistent to non-persistent dependencies
- Use `turbo run [task] --dry` to inspect task dependency chains
- Manual execution (`turbo run story`) will work fine - the issue only appears in watch mode
