---
name: Playground
description: 'Use when testing new ideas in a safe environment.'
applyTo: 'apps/play/**/*.{svelte,ts,js,css}'
---

# Playground App

## Purpose

The `apps/play` app is a safe proving ground for UI architecture, layout systems, wrapper behavior, and other experimental component ideas.

Its main purpose is to test changes safely before they are merged into the real package-level component system.

In practice, `apps/play/src/lib/` acts as a simplified stand-in for the production component layer in `packages/ui`. This allows new ideas to be explored, refined, and proven out without risking breakage in the actual shared base components that many other components depend on.

A common workflow is to test new features here first, validate the approach, and then later merge the proven result into the appropriate `packages/ui` component when the user decides it is ready.

## Source of Truth

- `apps/play/src/lib/` is the **only active source of truth** inside the play app.
- Anything under `src/lib/` should be treated as the current implementation.
- Do not assume files outside `src/lib/` are active just because they are newer or more experimental.

## Component Ownership

- Keep helper ownership aligned with the component that uses it.
- `root.svelte` should depend on `root.svelte.ts`, not on `component.svelte.ts`.
- Root-owned runtime types, merge helpers, and rendering helpers belong in `root.svelte.ts`.
- `component.svelte.ts` should stay adapter-specific and only support `component.svelte`.
- Build upward from `Root` into `Component`, not the other way around.

## Folder Roles

### `src/lib/`

- Current working implementation.
- The structure here should remain stable and intentional.
- Changes here should be made carefully.

### `src/+versions/`

- Historical snapshots of `src/lib/` at important milestones.
- These are frozen reference points.
- Do **not** edit version snapshot files unless the user explicitly asks.
- Do **not** treat these as active implementation targets.

### `src/+merge/`

- Contains work that has already been explored, tested, or proven elsewhere.
- These files are **merge candidates**, not source of truth.
- Content here may be newer than `src/lib/`, but it is **not** automatically approved.
- Nothing in `+merge` should be copied into `lib` without first planning how it should be merged.

## Merge Workflow

When work exists in `src/+merge/`:

1. Treat it as a candidate for adoption, not as something to apply directly.
2. Compare it against the current `src/lib/` implementation.
3. Preserve the existing `src/lib/` structure unless the user explicitly approves a structural change.
4. Plan the merge before editing any active files.
5. Reuse proven ideas from `+merge`, but integrate them carefully into the current `lib` architecture.

Never do a blind overwrite from `+merge` into `lib`.

## Planning Expectations

When the user is in planning mode:

- Always identify whether a file is in `lib`, `+versions`, or `+merge`.
- Be explicit about which files are active and which are reference-only.
- Prefer merge plans that extend the current `lib` implementation instead of replacing it outright.
- If a merge would affect structure, responsibilities, or file boundaries, call that out clearly before implementation.

## Versioning Expectations

- `+versions` exists to preserve milestones.
- New version snapshots should reflect the state of `src/lib/` after a stable checkpoint.
- Version folders are for historical reference, rollback, and comparison.
- They should not become alternate active workspaces.
- A new version snapshot should only be created after the user explicitly confirms that a merge into `src/lib/` is complete and working correctly.
- The user is the final authority for verification. Do not assume a merge is complete just because code compiles or appears correct.
- After explicit user confirmation, create the next version folder number under `src/+versions/`.
- The new version folder should preserve the completed merge candidate that was just integrated, using the next available version number.
- Do not create version folders automatically before user confirmation.
- Do not archive incomplete, unverified, or in-progress merge work as a new version.

## Practical Guidance

- Prefer testing first in `apps/play/src/routes/(play)/+page.svelte` unless the user says otherwise.
- After something looks good there, it may later be broken out into another route folder.
- Keep experiments understandable and easy to compare back to `src/lib/`.
- Avoid unnecessary drift between the active implementation and merge candidates.
- When proving snippet or rail behavior, prefer empty snippets and built-in fallback labels before adding hardcoded demo content.
- Use light visual demo skinning to reveal snippet, rail, and debug boundaries, but keep the runtime fallback behavior visible.

## Guardrails

- Do not treat `+merge` as source of truth.
- Do not edit `+versions` casually.
- Do not restructure `src/lib/` without a reasoned plan.
- Do not assume that "newer" means "correct."
- Always plan merges into `src/lib/` carefully before making edits.
- Never create a new version snapshot without explicit user confirmation that the merge is correct and complete.

## Intent

This workflow exists to support safe experimentation while protecting the integrity of the active play implementation.

The goal is to:

- keep `src/lib/` clean and reliable,
- keep `+versions` as a trustworthy historical record,
- and use `+merge` as a staging area for ideas that still need deliberate integration.
