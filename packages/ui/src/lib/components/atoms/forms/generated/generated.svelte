<script lang="ts">
	/**
	 * @tags forms, generated, value, help
	 * @layout horizontal
	 */
	// A Generated value (glossary) shown as a line rather than an input: a value the app makes that nobody types, such
	// as the project number under the inputs it is made of (#284, #300). It wears the look every Generated value shares,
	// the input's included (forms.css): bright blue with the wand, and its own ? when it has Help text.
	import { Component, type ComponentProps, type ComponentReturn, Help } from '@layerd/ui';

	export interface GeneratedProps extends ComponentProps {
		/** What the value is: read out before it, and the name of its ?. */
		label: string;
		/** The value the app made. */
		value: string;
		/** Its Help text, which a ? after it opens. */
		help?: string;
	}

	let { label, value, help = undefined, ...props }: GeneratedProps = $props();
</script>

<Component {...props}>
	{#snippet component({ props }: { props: ComponentReturn })}
		<p
			{...props}
			class={`${props.class ?? ''} generated-line`.trim()}
		>
			<span
				class="generated-mark icon-[mdi--auto-fix]"
				title="Made by the app"
			></span>
			<span class="sr-only">{label}:</span>
			<span class="generated-value">{value}</span>
			{#if help}<Help
					{label}
					text={help}
				/>{/if}
		</p>
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#ui.css";

	.generated-line {
		@apply m-0 flex min-w-0 items-center gap-[0.4em] px-1 font-medium text-info-500 tabular-nums;
		font-size: 0.875rem;
	}

	.generated-mark {
		@apply block size-[1.15em] shrink-0;
	}

	.generated-value {
		@apply min-w-0 truncate;
	}

	/* Its ? reads like an input's with a value: grey, blue under a mouse. */
	.generated-line :global(.help) {
		@apply text-base-500;
	}

	@media (hover: hover) {
		.generated-line :global(.help:hover) {
			@apply text-info-500;
		}
	}
</style>
