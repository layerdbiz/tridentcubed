<script lang="ts">
	/**
	 * @tags number, typography, count
	 */
	import { Component, type ComponentProps } from '@layerd/ui';

	interface NumberProps extends ComponentProps {
		number?: number;
		disabled?: boolean;
		children?: any;
	}

	let { number = 100, disabled = false, children, ...props }: NumberProps = $props();
</script>

<Component
	{...props}
	class="number {props.class}"
	{children}
>
	{#snippet component({ props, content })}
		<span {...props}>{@render content()}</span>
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#ui.css";

	.number {
		@apply inline-block;
	}
</style>
