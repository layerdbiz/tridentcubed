import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";
import type {
	ComponentProps as UiComponentProps,
	ObserveClass,
	ObserveOptions,
} from "@layerd/ui";
import type {
	GridValue,
	PlacementMode,
	PlacementValue,
	RootRendererProps,
	RootSnippetConfig,
	RootSnippetValue,
} from "$lib";

export type ComponentTag = keyof SvelteHTMLElements;
export type RootLayoutSnippet = Snippet;
export type ComponentContentSnippet = Snippet<[string?]>;
export type ComponentColor = UiComponentProps["color"];
export type ComponentAppearance = UiComponentProps["appearance"];
export type ComponentPosition = UiComponentProps["position"];
export type ComponentRenderArgs = {
	props: RootRendererProps;
	layout: RootLayoutSnippet;
	content?: ComponentContentSnippet;
	observe?: ObserveClass;
};

type ComponentItemProps = {
	topLeft?: RootSnippetValue;
	top?: RootSnippetValue;
	topRight?: RootSnippetValue;
	left?: RootSnippetValue;
	center?: RootSnippetValue;
	right?: RootSnippetValue;
	bottomLeft?: RootSnippetValue;
	bottom?: RootSnippetValue;
	bottomRight?: RootSnippetValue;
	a1?: RootSnippetValue;
	b1?: RootSnippetValue;
	c1?: RootSnippetValue;
	a2?: RootSnippetValue;
	b2?: RootSnippetValue;
	c2?: RootSnippetValue;
	a3?: RootSnippetValue;
	b3?: RootSnippetValue;
	c3?: RootSnippetValue;
	row1?: RootSnippetValue;
	row2?: RootSnippetValue;
	row3?: RootSnippetValue;
	col1?: RootSnippetValue;
	col2?: RootSnippetValue;
	col3?: RootSnippetValue;
	topHalf?: RootSnippetValue;
	bottomHalf?: RootSnippetValue;
	leftHalf?: RootSnippetValue;
	rightHalf?: RootSnippetValue;
	bg?: RootSnippetValue;
	full?: RootSnippetValue;
	fg?: RootSnippetValue;
};

export interface ComponentProps extends ComponentItemProps {
	children?: Snippet;
	label?: string;
	color?: ComponentColor;
	appearance?: ComponentAppearance;
	invert?: boolean;
	base?: boolean;
	primary?: boolean;
	secondary?: boolean;
	accent?: boolean;
	position?: ComponentPosition;
	disabled?: boolean;
	total?: string;
	class?: string;
	style?: string;
	tag?: ComponentTag;
	debug?: boolean;
	grid?: GridValue;
	rail?: string;
	rails?: string;
	ratio?: string;
	mode?: PlacementMode;
	items?: PlacementValue;
	content?: PlacementValue;
	rows?: string;
	cols?: string;
	size?: string;
	gap?: string;
	snippets?: Partial<Record<string, RootSnippetConfig>>;
	component?: Snippet<[ComponentRenderArgs]>;
	observe?: boolean | ObserveOptions;
	[key: string]: unknown;
}

export function normalizeComponentTag(
	tag: ComponentTag | undefined,
): ComponentTag {
	return tag ?? "div";
}
