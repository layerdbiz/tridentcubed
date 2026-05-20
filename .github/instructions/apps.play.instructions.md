---
name: Playground
description: 'Use when editing or creating apps/play source files and proving-ground routes. Covers play-app workflow, active lib ownership, merge candidates, version snapshots, and play-only demo allowances.'
applyTo: 'apps/play/**/*.svelte,apps/play/**/*.ts,apps/play/**/*.js,apps/play/**/*.css'
---

# Playground App Rules

`apps/play` is the safe proving ground for UI architecture, layout systems, wrapper behavior, and merge candidates before patterns move into `packages/ui`.

## Source Of Truth

- `apps/play/src/lib/**` is the active source of truth inside the play app.
- `apps/play/src/lib/**` can contain current proving-ground examples for `Component`, `Root`, rails, layout snippets, MQ-aware snippet behavior, and merge candidates.
- Do not assume files outside `src/lib` are active just because they are newer or more experimental.

## Folder Roles

- `src/lib/**`: current working implementation.
- `src/+merge/**`: candidate work that still needs deliberate integration into `src/lib`.
- `src/+versions/**`: frozen historical snapshots of `src/lib`.

## Runtime Ownership

- Keep helper ownership aligned with the component that uses it.
- `root.svelte` should depend on `root.svelte.ts`, not on `component.svelte.ts`.
- Root-owned runtime types, merge helpers, and rendering helpers belong in `root.svelte.ts`.
- `component.svelte.ts` should stay adapter-specific and only support `component.svelte`.
- Build upward from `Root` into `Component`, not the other way around.

## Merge Workflow

- Treat `+merge` content as a candidate for adoption, not as something to apply directly.
- Compare merge candidates against the current `src/lib` implementation before editing active files.
- Preserve the existing `src/lib` structure unless the user explicitly approves a structural change.
- Reuse proven ideas from `+merge`, but integrate them carefully into the current `lib` architecture.
- Never do a blind overwrite from `+merge` into `lib`.

## Versioning Expectations

- `+versions` preserves milestones after a stable checkpoint in `src/lib`.
- Do not edit version snapshot files unless the user explicitly asks.
- Create a new version snapshot only after the user explicitly confirms that the merge into `src/lib` is complete and correct.
- Do not archive incomplete or in-progress merge work as a new version.

## Practical Guidance

- Prefer testing first in `apps/play/src/routes/(play)/+page.svelte` unless the user says otherwise.
- Keep experiments understandable and easy to compare back to `src/lib`.
- When proving snippet or rail behavior, prefer empty snippets and built-in fallback labels before adding hardcoded demo content.
- Use light visual demo skinning to reveal snippet, rail, and debug boundaries, but keep the runtime fallback behavior visible.
- For simple play demos, keep trivial MQ branching and one-off Tailwind class strings inline in the markup when that makes the example easier to read.
- Do not lift simple demo-only `mq` choices, fallback labels, or one-off class strings into top-level constants unless reuse or complexity clearly justifies it.
- `apps/play/src/routes/(mq)/**` and `apps/play/src/routes/(play)/demo/mq-*` are the active proving-ground examples for `Mq`, `mq`, responsive layout snippet behavior, and rails plus snippets plus MQ interaction.
- Patterns proven here may later be merged into `packages/ui`, but `apps/play` rules do not apply globally.

## Play-Only Demo Allowances

- `apps/play` is the proving ground, so small inline MQ branches, debug toggles, fallback labels, and one-off Tailwind skinning are allowed when they make a runtime demo easier to read.
- Those allowances are local to play and should not be copied into other apps as the default route authoring style.
- When a play route is being used as a reference for another app, copy the structural pattern first: `Component`, rails, snippets, shared primitives, and route-colocated support components. Do not copy temporary demo-only shortcuts unless the target file is also a play-only proof.
- Raw HTML elements may appear in play when the point is to prove a low-level primitive boundary. Otherwise prefer the same shared UI components and runtime surfaces that production apps should use.
