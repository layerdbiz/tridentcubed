<script lang="ts">
	import { Component, type ComponentProps } from '@layerd/ui';

	export interface PreviewPageProps extends ComponentProps {
		variant?: string;
	}

	let { children = undefined, ...props }: PreviewPageProps = $props();
</script>

<Component {...props}>
	{#snippet component({ props })}
		<div
			{...props}
			class="
						aspect-[8.5/11]
						h-full
						w-full
						origin-top-left
						overflow-hidden bg-surface
						outline-2
						outline-shade
						{props.class ?? ''}"
		>
			{@render children?.()}
		</div>
	{/snippet}
</Component>
