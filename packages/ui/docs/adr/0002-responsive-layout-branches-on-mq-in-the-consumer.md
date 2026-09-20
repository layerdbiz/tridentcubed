---
status: accepted
date: 2026-09-20
---

# Responsive layout branches on `mq` in the consumer; the base component system is breakpoint-blind

Nothing in the base component, Root, rails or the layout snippets reads the viewport. Breakpoint-keyed snippets (a `left` for phones and another for desktop on one component) were tried and did not work: the snippets render regardless of the Bucket. What works, and what the play app's MQ routes demonstrate, is branching in the consumer on the shared `mq` state, two ways:

- **Swap the tree.** `{#if mq.sm}` one base component with a `full` layer and a `fg` layer, `{:else}` another with `cols` and cell ranges. Shared content is a snippet rendered inside whichever tree is active.
- **Compute a prop.** One base component whose `rail`, `cols` or class is derived from the Bucket.

Decided on "Confirm shared UI conventions and app exceptions" (layerdbiz/tridentcubed#4): responsive layout is done in the consumer by one of those two forms. `Mq` is hosted once in the top-most layout that needs it, and server-rendered routes branch on `mq.base` first so first paint is stable. MQ-aware snippets stay a parked idea, not a direction.

## Consequences

- `Mq` seeds the Bucket from a blocking script in the document head to avoid a flash of the wrong layout. That script is render-blocking by design; the theme atom's mode handling relies on the same trade. A lighter way to get a stable first paint may exist and is open to exploration.
- Container queries are a separate tool for component-level responsiveness and are unexplored here; they come after Report Generator V1.
