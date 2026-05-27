import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";
import type { DebugValueType } from "@layerd/ui";
import type { PersistContext, PersistInput } from "./helpers/persist/persist.svelte.ts";
import {
	createClasses,
	type GridValue,
	type ObserveClass,
	type ObserveOptions,
	type PlacementMode,
	type PlacementValue,
	type RootRendererProps,
	type RootSnippetConfig,
	type RootSnippetValue,
} from "@layerd/ui";

/**
 * Creates base styling attributes that can be spread onto HTML elements
 */

export type ComponentTag = keyof SvelteHTMLElements;
export type ComponentLayoutSnippet = Snippet;
export type ComponentContentSnippet = Snippet<[string?]>;
export type ComponentRootArgs = {
	props: RootRendererProps;
	layout: ComponentLayoutSnippet;
};
export type ComponentRenderProps = ComponentReturn & RootRendererProps;
export type ComponentRenderArgs = ComponentRootArgs & {
	props: ComponentRenderProps;
	content: ComponentContentSnippet;
	observe?: ObserveClass;
};

export interface ComponentItemProps {
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
}

// Simple approach: Use a regular interface with JSDoc warnings for conflicts
export interface ComponentProps extends ComponentItemProps {
	// 📝 CONTENT
	label?: string;
	children?: Snippet;

	// 🎨 STYLES
	color?:
		| "base"
		| "neutral"
		| "primary"
		| "secondary"
		| "accent";

	appearance?:
		| "heavy"
		| "lite"
		| "outline"
		| "ghost"
		| "glass"
		| "gradient";

	// INVERT
	invert?: boolean;

	// STYLED
	base?: boolean;
	neutral?: boolean;
	primary?: boolean;
	secondary?: boolean;
	accent?: boolean;

	// VARIANTS
	heavy?: boolean;
	lite?: boolean;
	outline?: boolean;
	ghost?: boolean;
	glass?: boolean;
	gradient?: boolean;

	// CONTROLS
	total?: string;

	// 📏 SIZE
	size?: "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
	xxs?: boolean;
	xs?: boolean;
	sm?: boolean;
	md?: boolean;
	lg?: boolean;
	xl?: boolean;
	xxl?: boolean;

	// 📍 POSITION
	position?: "left" | "center" | "right";

	// ⚡ STATE
	disabled?: boolean;

	// 🐞 DEBUG
	/**
	 * `true` enables automatic debug selection. Use the object form to opt into
	 * `box`, `grid`, or `rails` explicitly.
	 */
	debug?: boolean | DebugValueType;

	// 🎯 OBSERVATION
	observe?: boolean | ObserveOptions;

	// 📜 SCROLL
	scroll?: boolean;
	persist?: PersistInput;
	persistContext?: PersistContext;
	persistGetValue?: () => unknown;
	persistSetValue?: (value: unknown) => void;
	value?: unknown;
	checked?: boolean;

	// 🧱 LAYOUT
	tag?: ComponentTag;
	style?: string;
	grid?: GridValue;
	/**
	 * Places this component inside an existing rails container without enabling
	 * rails mode on the component itself. Prefer short canonical names such as
	 * `content`, `xs`, `sm`, `lg`, `xl`, `xxl`, `full`, `gutter-lg`, `left`,
	 * and `right`; older long names remain compatibility aliases.
	 */
	rail?: string;
	/**
	 * Enables the rails container runtime. The canonical set includes the
	 * content rails, the `gutter-*` pull-in family, `full`, and directional
	 * rails. Values such as `md`, `content-md`, `content-xl`, `bleed-left`,
	 * `inset-md`, and `full-inset-md` normalize back to that canonical set.
	 */
	rails?: string;
	ratio?: string;
	mode?: PlacementMode;
	items?: PlacementValue;
	content?: PlacementValue;
	rows?: string;
	cols?: string;
	gap?: string;
	/**
	 * Modifies a rail instead of naming a rail family. On `content`, `inset`
	 * adjusts the safe edge. On `full`, it creates a one-off pull-in. Token
	 * aliases such as `1`, `2`, `3`, `4`, `5`, `6`, `sm`, `md`, `lg`, and `xl`
	 * map to inset spacing, while reusable pull-ins should use `gutter-*` rails.
	 */
	inset?: string;
	snippets?: Partial<Record<string, RootSnippetConfig>>;
	component?: Snippet<[ComponentRenderArgs]>;

	// 🎯 CUSTOMIZATION
	class?: string;

	/** Internal Additional HTML attributes passed through */
	[key: string]: any;
}

export interface ComponentReturn {
	class: string;
	disabled?: boolean;
	[key: string]: any;
}

/**
 * Props interface for the Component wrapper that extends ComponentProps
 * with snippet-specific functionality
 */
export interface ComponentWrapperProps extends ComponentProps {
}

export function normalizeComponentTag(
	tag: ComponentTag | undefined,
): ComponentTag {
	return tag ?? "div";
}

export function createComponent(
	props: Partial<ComponentProps> = {},
): ComponentReturn {
	const {
		// states
		disabled = false,
		debug = false,
		observe: observeProp = false,
		scroll: scrollProp = false,
		// unstyled
		unstyled = false,
		// color
		color = undefined,
		base = false,
		neutral = false,
		primary = false,
		secondary = false,
		accent = false,
		// appearance
		appearance = undefined,
		heavy = false,
		lite = false,
		outline = false,
		ghost = false,
		glass = false,
		gradient = false,
		// controls
		invert = false,
		// position
		position = undefined,
		// size
		size = undefined,
		xxs = false,
		xs = false,
		sm = false,
		md = false,
		lg = false,
		xl = false,
		xxl = false,
		// user class
		class: userClass = "",
		children,
		total,
		// Keep HTML attributes like href, type, etc. in ...rest
		...rest
	} = props;

	// Build class list using ClassBuilder for cleaner conditional logic
	const classes = createClasses();

	/* STYLES
	:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: */
	if (unstyled) {
		return {
			class: userClass,
			...rest,
		};
	} else {
		/* STATES
		:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: */
		classes
			.is(
				disabled,
				"opacity-50 cursor-not-allowed pointer-events-none select-none",
			);

		/* STYLES
		:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: */
		// color
		const isBase = color === "base" || base;
		const isNeutral = color === "neutral" || neutral;
		const isPrimary = color === "primary" || primary;
		const isSecondary = color === "secondary" || secondary;
		const isAccent = color === "accent" || accent;
		// variants
		const isHeavy = appearance === "heavy" || heavy;
		const isLite = appearance === "lite" || lite;
		const isOutline = appearance === "outline" || outline;
		const isGhost = appearance === "ghost" || ghost;
		const isGlass = appearance === "glass" || glass;
		const isGradient = appearance === "gradient" || gradient;
		// position
		const isLeft = position === "left";
		const isCenter = position === "center";
		const isRight = position === "right";
		// size
		const isXxs = size === "xxs" || xxs;
		const isXs = size === "xs" || xs;
		const isSm = size === "sm" || sm;
		const isMd = size === "md" || md;
		const isLg = size === "lg" || lg;
		const isXl = size === "xl" || xl;
		const isXxl = size === "xxl" || xxl;

		// Helper function to apply theme preset classes for a color
		const colorThemes = (colorName: string) => {
			classes
				.is(isHeavy && invert, `theme-heavy-${colorName}-invert`)
				.is(isHeavy && !invert, `theme-heavy-${colorName}`)
				.is(isLite && invert, `theme-lite-${colorName}-invert`)
				.is(isLite && !invert, `theme-lite-${colorName}`)
				.is(isOutline && invert, `theme-outline-${colorName}-invert`)
				.is(isOutline && !invert, `theme-outline-${colorName}`)
				.is(isGhost && invert, `theme-ghost-${colorName}-invert`)
				.is(isGhost && !invert, `theme-ghost-${colorName}`)
				.is(
					!isHeavy && !isLite && !isOutline && !isGhost && !isGlass && invert,
					`theme-heavy-${colorName}-invert`,
				)
				.is(
					!isHeavy && !isLite && !isOutline && !isGhost && !isGlass && !invert,
					`theme-heavy-${colorName}`,
				);
		};

		// Apply color theme presets with mutual exclusivity
		if (isPrimary) colorThemes("primary");
		else if (isSecondary) colorThemes("secondary");
		else if (isAccent) colorThemes("accent");
		else if (isNeutral) colorThemes("neutral");
		else if (isBase) colorThemes("base");
		// If no color specified but we have heavy/lite/outline variants, default to "base"
		else if (isHeavy || isLite || isOutline) colorThemes("base");

		// Always apply base invert class when invert is used
		classes.is(invert, "theme-invert");

		// Apply ghost theme preset independently (can work without color)
		classes
			.is(isGhost && invert, "theme-ghost-invert")
			.is(isGhost && !invert, "theme-ghost");

		// Apply glass theme preset independently (not tied to color)
		classes
			.is(isGlass && invert, "theme-glass-invert")
			.is(isGlass && !invert, "theme-glass");

		// Apply gradient theme preset independently (not tied to color)
		classes.is(isGradient, "theme-gradient");

		// Position styles
		classes
			.is(isLeft, "text-left")
			.is(isCenter, "text-center")
			.is(isRight, "text-right");

		// Size styles
		classes
			.is(isXxs, "xxs")
			.is(isXs, "xs")
			.is(isSm, "sm")
			.is(isMd, "md")
			.is(isLg, "lg")
			.is(isXl, "xl")
			.is(isXxl, "xxl");
	}

	// Combine base classes with user classes
	const baseClasses = classes.toString();
	const finalClasses = userClass ? `${baseClasses} ${userClass}` : baseClasses;

	// Include disabled in the returned props if it's true
	const returnProps: ComponentReturn = {
		class: finalClasses,
		...rest,
	};

	// Add disabled attribute for buttons (but not for links with disabled styling)
	if (disabled && !rest.href) {
		returnProps.disabled = disabled;
	}

	return returnProps;
}

export function createComponentWithStyles(
	props: Partial<ComponentProps & Record<string, any>> = {},
	options: {
		defaults?: Partial<ComponentProps>;
		componentClass?: string;
		getComponentClasses?: (props: any) => string[];
	} = {},
) {
	const { defaults = {}, componentClass = "", getComponentClasses } = options;

	// Extract user class from props to handle separately
	const { class: userClass = "", ...propsWithoutClass } = props;

	// Merge defaults with props (without user class)
	const base = createComponent({ ...defaults, ...propsWithoutClass });

	// Generate component-specific classes
	const componentClasses = getComponentClasses
		? getComponentClasses(props).filter(Boolean).join(" ")
		: "";

	// Combine classes with user class LAST for proper CSS cascade
	const allClasses = [base.class, componentClass, componentClasses, userClass]
		.filter(
			Boolean,
		).join(" ");

	// Extract class from base to avoid duplication, then add final classes
	const { class: baseClass, ...componentProps } = base;

	return {
		base: componentProps,
		classes: allClasses,
	};
}

/**
 * Helper function to create properly typed $props() for components that extend ComponentProps
 * This eliminates the need to manually define Props interfaces in each component
 *
 * Usage in component:
 * let { componentSpecificProp, children, ...props } = createProps<{ componentSpecificProp?: string }>();
 */
export function createProps<T = {}>(): ComponentProps & T & {
	children?: import("svelte").Snippet;
} {
	// This function never actually runs - it's purely for TypeScript inference
	throw new Error(
		"createProps() is for TypeScript inference only - use $props() instead",
	);
}
