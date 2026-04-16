<script lang="ts">
	import { Component, type ComponentProps } from '@layerd/ui';

	export interface PreviewPageProps extends ComponentProps {
		variant?: string;
	}

	let {
		children = undefined,
		...props
	}: PreviewPageProps = $props();
</script>

<Component {...props}>
	{#snippet component({ props })}
		<div {...props} 
					class="
						bg-white 
						outline-black 
						outline-2 
						aspect-[8.5/11] 
						w-full h-full
						origin-top-left 
						overflow-hidden 
						{props.class ?? ''}"
		>
			{@render children?.()}
		</div>
	{/snippet}
</Component>
