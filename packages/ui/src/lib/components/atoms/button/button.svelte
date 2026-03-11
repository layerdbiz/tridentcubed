<script lang="ts">
	/**
	 * @tags button, form
	 * @type multi
	 * @layout horizontal
	 */
	import { Icon, Component } from '@layerd/ui';
	import type { ComponentProps, ComponentReturn } from '@layerd/ui';
	import type { Snippet } from 'svelte';

	export interface ButtonProps extends ComponentProps {
		href?: string;
		/** External link indicator */
		external?: boolean;
		/** Link target attribute */
		target?: '_blank' | '_self' | '_parent' | '_top';
		/** Link rel attribute */
		rel?: string;
		/**
		 * Icon configuration - supports multiple formats:
		 * - String: "person" or "icon-[mdi--person]" or "mdi--person"
		 * - Object: { name: "person", theme: "mdi", class: "custom" }
		 * - Snippet: Custom SVG or HTML content
		 */
		icon?:
			| string
			| {
					name?: string;
					theme?: 'mdi' | 'heroicons' | 'carbon' | 'solar' | string;
					class?: string;
			  }
			| Snippet;
		label?: string;
		type?: 'button' | 'submit' | 'reset' | 'radio' | 'checkbox';
		/** For radio/checkbox types: the name attribute for grouping */
		name?: string;
		/** For radio/checkbox types: the value attribute */
		value?: string;
		/** For radio/checkbox types: whether initially checked */
		checked?: boolean;
		/** Whether to reverse the icon and text order (icon on right instead of left) */
		reverse?: boolean;
		/** Icon to show when button is clicked/toggled */
		iconToggle?:
			| string
			| {
					name?: string;
					theme?: 'mdi' | 'heroicons' | 'carbon' | 'solar' | string;
					class?: string;
			  }
			| Snippet;
		/** Icon to show on hover */
		iconHover?:
			| string
			| {
					name?: string;
					theme?: 'mdi' | 'heroicons' | 'carbon' | 'solar' | string;
					class?: string;
			  }
			| Snippet;
		/** Whether the button is currently in toggled state (controlled) */
		toggled?: boolean;
		/** Callback when toggle state changes */
		onToggle?: (toggled: boolean) => void;

		// NEW: Variant system (optional, for new usage)
		variant?: 'text' | 'icon' | 'icon text' | 'text icon' | 'icon text icon';

		// NEW: Layout control (optional, for new usage)
		width?: 'auto' | 'full';
		padding?: 'default' | 'none';
		align?: 'center' | 'start' | 'end' | 'between' | 'around';

		// NEW: Secondary icon system (for 'icon text icon' variant)
		iconEnd?:
			| string
			| {
					name?: string;
					theme?: 'mdi' | 'heroicons' | 'carbon' | 'solar' | string;
					class?: string;
			  }
			| Snippet;
		iconEndHover?:
			| string
			| {
					name?: string;
					theme?: 'mdi' | 'heroicons' | 'carbon' | 'solar' | string;
					class?: string;
			  }
			| Snippet;
		iconEndToggle?:
			| string
			| {
					name?: string;
					theme?: 'mdi' | 'heroicons' | 'carbon' | 'solar' | string;
					class?: string;
			  }
			| Snippet;
	}

	let {
		href = undefined,
		external = false,
		target = undefined,
		rel = undefined,
		type = 'button',
		icon = undefined,
		label = undefined,
		name = undefined,
		value = undefined,
		checked = false,
		reverse = false,
		iconToggle = undefined,
		iconHover = undefined,
		toggled = undefined,
		onToggle = undefined,
		variant = undefined, // Keep undefined to detect legacy usage
		width = 'auto',
		padding = 'default',
		align = 'center',
		iconEnd = undefined,
		iconEndHover = undefined,
		iconEndToggle = undefined,
		unstyled = false,
		children = undefined,
		class: className = '',
		...props
	}: ButtonProps = $props();

	// Auto-set target and rel for external links
	const finalTarget = $derived(external ? '_blank' : target);
	const finalRel = $derived(external ? 'noopener noreferrer' : rel);

	// Determine if this is a form control button (radio/checkbox)
	const isFormControl = $derived(type === 'radio' || type === 'checkbox');

	// Internal hover state
	let isHovered = $state(false);

	// Internal toggle state (used when not controlled)
	let internalToggled = $state(false);

	// Use external toggled prop or internal state
	const isToggled = $derived(toggled !== undefined ? toggled : internalToggled);

	// Helper function to check if a value is a snippet
	// Snippets are functions, icon configs are objects with {name, theme, class}
	function isSnippet(value: any): value is Snippet {
		// Snippets are functions
		if (typeof value === 'function') {
			return true;
		}

		// Everything else (strings, objects) are icon configs
		return false;
	}

	// Determine which icons to show based on state (primary icon)
	// When toggled, always show iconToggle and ignore hover state
	const currentIcon = $derived(
		isToggled && iconToggle ? iconToggle : isHovered && iconHover ? iconHover : icon
	);

	// Determine which icons to show based on state (end icon)
	// When toggled, always show iconEndToggle and ignore hover state
	const currentIconEnd = $derived(
		isToggled && iconEndToggle ? iconEndToggle : isHovered && iconEndHover ? iconEndHover : iconEnd
	);

	// Auto-detect variant for backward compatibility
	const effectiveVariant = $derived(() => {
		// If variant is explicitly set, use it
		if (variant) {
			return reverse && variant === 'text' ? 'text icon' : variant;
		}

		// Legacy mode: auto-detect based on props
		const hasIcon = !!currentIcon;
		const hasIconEnd = !!currentIconEnd;
		const hasText = !!(label || children);

		if (hasIcon && hasIconEnd && hasText) {
			return 'icon text icon';
		} else if (hasIcon && hasText) {
			return reverse ? 'text icon' : 'icon text';
		} else if (hasIcon && !hasText) {
			return 'icon';
		} else {
			return 'text';
		}
	});

	// Legacy compatibility: detect if this is using old patterns
	const isLegacyUsage = $derived(variant === undefined);

	// Determine what content to display (for legacy compatibility)
	let hasChildren = $derived(children !== undefined);
	let displayText = $derived(label || (!hasChildren && !currentIcon ? 'Button' : undefined));
	let showIcon = $derived(!!currentIcon);
	let showText = $derived(!!displayText || hasChildren);
	let isIconOnly = $derived(showIcon && !showText);

	// Handle toggle click
	function handleToggle() {
		const newToggled = !isToggled;

		// Update internal state if not controlled
		if (toggled === undefined) {
			internalToggled = newToggled;
		}

		// Call external handler if provided
		onToggle?.(newToggled);
	}

	// Build dynamic CSS classes
	const buttonClasses = $derived(() => {
		const classes = [];

		if (!unstyled) {
			classes.push('btn');

			if (isLegacyUsage) {
				// Legacy CSS classes for backward compatibility
				if (showIcon && showText) classes.push('btn-wrapper');
				if (isIconOnly) classes.push('btn-icon-only');
				if (reverse) classes.push('btn-reverse');
			} else {
				// New variant-based classes
				classes.push(`btn-variant-${effectiveVariant().replace(/\s+/g, '-')}`);

				// Width classes
				if (width === 'full') classes.push('btn-width-full');

				// Padding classes
				if (padding === 'none') classes.push('btn-padding-none');

				// Alignment classes (for full width buttons)
				if (width === 'full' && align !== 'center') {
					classes.push(`btn-align-${align}`);
				}
			}
		}

		if (className) classes.push(className);

		return classes.join(' ');
	});
</script>

<!-- ⬜ default ⬛ prop 🟪 snippet 🟦 children -->

<!-- Legacy Compatibility Snippet (maintains exact original behavior)
::::::::::::::::::::::::::::::::::::::::::::: -->
{#snippet legacyButtonContent(elementType: string)}
	{#snippet textContent(elementType: string)}
		{#if hasChildren}
			{@render children()}
		{:else}
			{displayText}
		{/if}
	{/snippet}

	{#if showIcon && currentIcon}
		{#if isSnippet(currentIcon)}
			<span class={!unstyled ? 'btn-icon' : ''}>
				{@render currentIcon()}
			</span>
		{:else}
			<Icon
				class={!unstyled ? 'btn-icon' : ''}
				icon={currentIcon}
			/>
		{/if}
	{/if}
	{#if showText}
		<span class={!unstyled ? 'btn-label' : ''}>
			{@render textContent(elementType)}
		</span>
	{/if}
{/snippet}

<!-- New Variant Snippets 
::::::::::::::::::::::::::::::::::::::::::::: -->
<!-- Text Only -->
{#snippet text()}
	{#if children}
		{@render children()}
	{:else}
		<span class={!unstyled ? 'btn-label' : ''}>{label || 'Button'}</span>
	{/if}
{/snippet}

<!-- Icon Only -->
{#snippet iconOnly()}
	{#if currentIcon}
		{#if isSnippet(currentIcon)}
			<span class={!unstyled ? 'btn-icon' : ''}>
				{@render currentIcon()}
			</span>
		{:else}
			<Icon
				class={!unstyled ? 'btn-icon' : ''}
				icon={currentIcon}
			/>
		{/if}
	{/if}
{/snippet}

<!-- Icon + Text -->
{#snippet iconText()}
	{#if currentIcon}
		{#if isSnippet(currentIcon)}
			<span class={!unstyled ? 'btn-icon' : ''}>
				{@render currentIcon()}
			</span>
		{:else}
			<Icon
				class={!unstyled ? 'btn-icon' : ''}
				icon={currentIcon}
			/>
		{/if}
	{/if}
	{#if children}
		<span class={!unstyled ? 'btn-label' : ''}>
			{@render children()}
		</span>
	{:else if label}
		<span class={!unstyled ? 'btn-label' : ''}>{label}</span>
	{/if}
{/snippet}

<!-- Text + Icon -->
{#snippet textIcon()}
	{#if children}
		<span class={!unstyled ? 'btn-label' : ''}>
			{@render children()}
		</span>
	{:else if label}
		<span class={!unstyled ? 'btn-label' : ''}>{label}</span>
	{/if}
	{#if currentIcon}
		{#if isSnippet(currentIcon)}
			<span class={!unstyled ? 'btn-icon' : ''}>
				{@render currentIcon()}
			</span>
		{:else}
			<Icon
				class={!unstyled ? 'btn-icon' : ''}
				icon={currentIcon}
			/>
		{/if}
	{/if}
{/snippet}

<!-- Icon + Text + Icon -->
{#snippet iconTextIcon()}
	{#if currentIcon}
		{#if isSnippet(currentIcon)}
			<span class={!unstyled ? 'btn-icon' : ''}>
				{@render currentIcon()}
			</span>
		{:else}
			<Icon
				class={!unstyled ? 'btn-icon' : ''}
				icon={currentIcon}
			/>
		{/if}
	{/if}
	{#if children}
		<span class={!unstyled ? 'btn-label' : ''}>
			{@render children()}
		</span>
	{:else if label}
		<span class={!unstyled ? 'btn-label' : ''}>{label}</span>
	{/if}
	{#if currentIconEnd}
		{#if isSnippet(currentIconEnd)}
			<span class={!unstyled ? 'btn-icon btn-icon-end' : ''}>
				{@render currentIconEnd()}
			</span>
		{:else}
			<Icon
				class={!unstyled ? 'btn-icon btn-icon-end' : ''}
				icon={currentIconEnd}
			/>
		{/if}
	{/if}
{/snippet}

<!-- Template 
::::::::::::::::::::::::::::::::::::::::::::: -->
{#if isLegacyUsage}
	<!-- Legacy Component Structure (preserves original behavior exactly) -->
	<Component
		{...props}
		{unstyled}
		base={!unstyled}
		class="{!unstyled ? 'btn' : ''} 
			{showIcon && showText && !unstyled ? 'btn-wrapper' : ''} 
			{isIconOnly && !unstyled ? 'btn-icon-only' : ''} 
			{reverse && !unstyled ? 'btn-reverse' : ''} 
			{className}"
	>
		{#snippet component({
			props,
			content
		}: {
			props: ComponentReturn;
			content: import('svelte').Snippet<[string?]>;
		})}
			{#if isFormControl}
				<!-- Form Control (Radio/Checkbox) - Input inside label for better structure -->
				<label
					class="{!unstyled ? 'btn w-full' : ''} {showIcon && showText && !unstyled
						? 'btn-wrapper w-full'
						: ''} {isIconOnly && !unstyled ? 'btn-icon-only' : ''} {reverse && !unstyled
						? 'btn-reverse w-full'
						: ''} {className}"
					onmouseenter={() => (isHovered = true)}
					onmouseleave={() => (isHovered = false)}
				>
					<input
						{type}
						{name}
						{value}
						{checked}
						class="sr-only"
						onchange={(e) => {
							const target = e.target as HTMLInputElement;
							onToggle?.(target.checked);
						}}
					/>
					{@render legacyButtonContent('Label')}
				</label>
			{:else if href}
				<!-- Link Button -->
				<a
					{href}
					target={finalTarget}
					rel={finalRel}
					{...props}
					onmouseenter={() => (isHovered = true)}
					onmouseleave={() => (isHovered = false)}
					onclick={(e) => {
						if (iconToggle || onToggle) {
							e.preventDefault();
							handleToggle();
						}
						props.onclick?.(e);
					}}
				>
					{@render legacyButtonContent('Link')}
				</a>
			{:else}
				<!-- Regular Button -->
				<button
					type={type === 'radio' || type === 'checkbox' ? 'button' : type}
					{...props}
					onmouseenter={() => (isHovered = true)}
					onmouseleave={() => (isHovered = false)}
					onclick={(e) => {
						if (iconToggle || onToggle) {
							handleToggle();
						}
						props.onclick?.(e);
					}}
				>
					{@render legacyButtonContent('Button')}
				</button>
			{/if}
		{/snippet}
	</Component>
{:else}
	<!-- New Variant System -->
	<Component
		{...props}
		{unstyled}
		base={!unstyled}
		class={buttonClasses()}
	>
		{#snippet component({ props }: { props: ComponentReturn })}
			{#if isFormControl}
				<!-- Form Control (Radio/Checkbox) -->
				<label
					{...props}
					onmouseenter={() => (isHovered = true)}
					onmouseleave={() => (isHovered = false)}
				>
					<input
						{type}
						{name}
						{value}
						{checked}
						class="sr-only"
						onchange={(e) => {
							const target = e.target as HTMLInputElement;
							onToggle?.(target.checked);
						}}
					/>
					{#if effectiveVariant() === 'icon'}
						{@render iconOnly()}
					{:else if effectiveVariant() === 'icon text'}
						{@render iconText()}
					{:else if effectiveVariant() === 'text icon'}
						{@render textIcon()}
					{:else if effectiveVariant() === 'icon text icon'}
						{@render iconTextIcon()}
					{:else}
						{@render text()}
					{/if}
				</label>
			{:else if href}
				<!-- Link Button -->
				<a
					{href}
					target={finalTarget}
					rel={finalRel}
					{...props}
					onmouseenter={() => (isHovered = true)}
					onmouseleave={() => (isHovered = false)}
					onclick={(e) => {
						if (iconToggle || iconEndToggle || onToggle) {
							e.preventDefault();
							handleToggle();
						}
						props.onclick?.(e);
					}}
				>
					{#if effectiveVariant() === 'icon'}
						{@render iconOnly()}
					{:else if effectiveVariant() === 'icon text'}
						{@render iconText()}
					{:else if effectiveVariant() === 'text icon'}
						{@render textIcon()}
					{:else if effectiveVariant() === 'icon text icon'}
						{@render iconTextIcon()}
					{:else}
						{@render text()}
					{/if}
				</a>
			{:else}
				<!-- Regular Button -->
				<button
					type={type === 'radio' || type === 'checkbox' ? 'button' : type}
					{...props}
					onmouseenter={() => (isHovered = true)}
					onmouseleave={() => (isHovered = false)}
					onclick={(e) => {
						if (iconToggle || iconEndToggle || onToggle) {
							handleToggle();
						}
						props.onclick?.(e);
					}}
				>
					{#if effectiveVariant() === 'icon'}
						{@render iconOnly()}
					{:else if effectiveVariant() === 'icon text'}
						{@render iconText()}
					{:else if effectiveVariant() === 'text icon'}
						{@render textIcon()}
					{:else if effectiveVariant() === 'icon text icon'}
						{@render iconTextIcon()}
					{:else}
						{@render text()}
					{/if}
				</button>
			{/if}
		{/snippet}
	</Component>
{/if}

<style lang="postcss">
	@reference "#ui.css";

	.btn {
		--btn-gap: 0.625em;
		--btn-p: 0.75em;
		--btn-px: 1em;
		--btn-py: var(--btn-p);
		--btn-icon: 2cap;

		@apply rounded-button relative isolate inline-flex w-auto cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap text-center font-medium leading-none transition-colors ease-in-out;
		@apply gap-(--btn-gap) px-(--btn-px) py-(--btn-py);

		@variant before {
			@apply -z-1 bg-dark-light absolute inset-0 opacity-0 transition content-[''];
		}

		&:is(:hover, :focus-visible, :active) {
			&::before {
				@apply opacity-20;
			}
		}

		/* Disable state effects for ghost buttons */
		&:where([class*='theme-ghost']) {
			&:is(:hover, :focus-visible, :active) {
				&::before {
					@apply opacity-0;
				}
			}
		}

		/* NEW: Variant-specific styles - inherit base styles, only modify layout */
		&:where(.btn-variant-text) {
			/* Text buttons keep default center alignment */
		}

		&:where(.btn-variant-icon) {
			/* Icon-only buttons: square padding, no gap */
			@apply min-w-[unset] gap-0 p-(--btn-p);
		}

		&:where(.btn-variant-icon-text) {
			/* Icon + text: left aligned like legacy btn-wrapper */
			@apply items-center justify-start pr-4 text-left;
		}

		&:where(.btn-variant-text-icon) {
			@apply items-center justify-start pl-5 text-left md:pl-10;
		}

		&:where(.btn-variant-icon-text-icon) {
			/* Icon + text + icon: space between like legacy btn-reverse */
			@apply items-center justify-between text-left;
		}

		/* NEW: Width control */
		&:where(.btn-width-full) {
			@apply w-full;
		}

		/* NEW: Padding control */
		&:where(.btn-padding-none) {
			@apply p-0;
		}

		/* NEW: Alignment control (for full width buttons) */
		&:where(.btn-align-start) {
			@apply justify-start;
		}

		&:where(.btn-align-end) {
			@apply justify-end;
		}

		&:where(.btn-align-between) {
			@apply justify-between;
		}

		&:where(.btn-align-around) {
			@apply justify-around;
		}

		/* LEGACY: Keep existing classes for backward compatibility */

		/* both icon + label */
		&:where(.btn-wrapper) {
			@apply items-center justify-start text-left;
		}

		/* keep this per your note */
		&:where(.btn-reverse) {
			@apply flex-row-reverse items-center justify-between;
		}

		/* sizes (md stays text-md) */
		&:where(.xxs) {
			@apply text-[10px];
		}
		&:where(.xs) {
			@apply text-xs;
		}
		&:where(.sm) {
			@apply text-sm;
		}
		&:where(.md) {
			@apply text-md;
		}
		&:where(.lg) {
			@apply text-lg;
		}
		&:where(.xl) {
			@apply text-2xl;
		}
	}

	/* Apply button styles to labels when used as form controls */
	label.btn {
		@apply cursor-pointer;
	}

	/* keep text-trim inline */
	.btn-label {
		@apply w-full;
	}

	/* bigger icon, still cap-aligned so centering stays true */
	:global(.btn .btn-icon) {
		@apply block size-(--btn-icon) shrink-0 leading-none;

		/* Ensure SVG children inherit the size */
		& > :global(svg) {
			@apply size-full;
		}
	}

	/* Special styling for end icons in dual-icon variants */
	:global(.btn .btn-icon-end) {
		@apply block size-(--btn-icon) shrink-0 leading-none;

		/* Ensure SVG children inherit the size */
		& > :global(svg) {
			@apply size-full;
		}
	}

	/* label-only: match the icon’s visual box using a zero-width spacer */
	.btn:not(:has(.btn-icon)) {
		@apply gap-0 after:inline-block after:h-(--btn-icon) after:w-0 after:align-middle after:content-[''];
	}

	/* (optional, unchanged) icon-only buttons stay square via equal padding */
	.btn:not(:has(.btn-label)) {
		@apply min-w-[unset] gap-0 p-(--btn-p);
	}
</style>
