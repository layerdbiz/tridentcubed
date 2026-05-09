import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";
import type { RootRendererProps } from "./root.svelte.ts";

export type ComponentTag = keyof SvelteHTMLElements;
export type RootLayoutSnippet = Snippet;
export type ComponentContentSnippet = Snippet<[string?]>;
export type ComponentRenderArgs = {
	props: RootRendererProps;
	layout: RootLayoutSnippet;
	content?: ComponentContentSnippet;
	observe?: unknown;
};

export function normalizeComponentTag(
	tag: ComponentTag | undefined,
): ComponentTag {
	return tag ?? "div";
}
