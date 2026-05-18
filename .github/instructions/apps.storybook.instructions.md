---
name: Storybook Rules
description: 'Use when editing apps/storybook. Covers auto-generated stories, Storybook structure, UI package build dependencies, and story naming conventions.'
applyTo: 'apps/storybook/**/*.{svelte,ts,js,css,mdx}'
---

# Storybook Rules

## Story Generation System

- **Automatic in dedicated story workflows**: Stories regenerate when components change during `pnpm watch`, `pnpm stories`, or direct `storybook#story` runs
- Scans `packages/ui/src/lib/components/` for `.svelte` files
- Creates `.stories.svelte` files in `apps/storybook/src/stories/`
- Uses proper folder structure (atoms/, molecules/, organisms/, templates/)
- Do not assume the default root `pnpm dev` command runs story generation

## Storybook Structure (`apps/storybook/`)

```
apps/storybook/src/stories/
├── atoms/                       # Generated from packages/ui/src/lib/components/atoms/
├── molecules/                   # Generated from packages/ui/src/lib/components/molecules/
├── organisms/                   # Generated from packages/ui/src/lib/components/organisms/
├── templates/                   # Generated from packages/ui/src/lib/components/templates/
├── assets/                      # Static assets for stories
├── Colors.mdx                   # Color system documentation
├── Configure.mdx                # Configuration guide
└── Typography.mdx               # Typography documentation
```

## Critical Build Notes

- **Storybook**: Requires UI package to be built first
- **Stories are auto-generated in the story workflow** - any `.svelte` component automatically gets a story when story generation runs
- Storybook serves as both documentation and visual testing
- Static builds go to `storybook-static/` for deployment

## File Naming Conventions

- Stories use `.stories.svelte` pattern in `apps/storybook/src/stories/`
- Stories: `[Name].stories.svelte` (PascalCase)
- Tools exclude patterns: `.test.`, `.spec.`, `__tests__/`, `.stories.`

## Common Pitfalls

1. **Build UI package before Storybook** - dependency chain requirement
2. **Story generation is automatic** - no manual story creation during normal development unless explicitly requested
