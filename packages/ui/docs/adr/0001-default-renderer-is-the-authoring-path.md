---
status: accepted
date: 2026-09-20
---

# New components use the default renderer, not a root override

The base component renders in two ways: the default renderer (the requested tag with content or layout snippets inside) and a root override (the component supplies its own markup through the `component` snippet). When this was decided, 30 of the 31 library components built on the base component used a root override, and none of them rendered the `layout` argument Root hands to the override, so layout snippets (`left`, `center`, `a1c3`, `bg` and the rest) silently render nothing on those components. Example, the newer of the two template components, uses the default renderer; example-old uses the override.

Decided on "Confirm shared UI conventions and app exceptions" (layerdbiz/tridentcubed#4): new components start from the default renderer. A root override is written only when the markup needs it (several elements, or a native element with structured children such as `details`, `select`, `img`, `iframe`) or when the render args (`content`, `observe`) are needed, and an override that should accept layout snippets renders the `layout` argument. The 30 shipped overrides stay as they are; both paths keep working so existing code is untouched, and the overrides are upgraded later, one at a time, outside this map.

## Consequences

- A reader who counts the shipped components will see the override as the majority and assume it is the pattern. It is the older pattern.
- Layout snippets work on every component written from here on and on the base component itself; on the shipped overrides they do not, until each is upgraded.
