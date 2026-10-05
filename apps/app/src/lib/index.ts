/* ROOT */
export * from "./definitions/definitions.ts";
export * from "./definitions/inputs.ts";
export * from "./definitions/pages.ts";
export * from "./definitions/panels.ts";
export * from "./definitions/types.ts";

/* COMPONENTS */
// c
export { default as C } from "./components/c/c.svelte";

// page
export { default as Page, type PageProps } from "./components/page/page.svelte";

// panel
export { default as Panel, type PanelProps } from "./components/panel/panel.svelte";
