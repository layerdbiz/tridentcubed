---
name: Storybook Rules
description: 'Use when editing apps/storybook. Covers generated stories, Storybook structure, and Storybook-specific workflow.'
applyTo: 'apps/storybook/**/*.svelte,apps/storybook/**/*.ts,apps/storybook/**/*.js,apps/storybook/**/*.css,apps/storybook/**/*.mdx'
---

# Storybook Rules

- Story generation runs only in dedicated story workflows such as `pnpm watch`, `pnpm stories`, or direct Turbo story tasks. Do not assume normal root `pnpm dev` regenerates stories.
- Generated stories come from UI components under `packages/ui/src/lib/components/**` and are written to `apps/storybook/src/stories/**`.
- Generated stories are not the source of truth. Change the UI component or story generator unless the user explicitly asks for manual story edits.
- Keep the `.stories.svelte` naming pattern and the generated atomic folder structure under `src/stories`.
- Storybook depends on the built UI package, and static builds go to `storybook-static/`.
- Do not manually create or maintain normal component stories during routine development unless explicitly requested.
