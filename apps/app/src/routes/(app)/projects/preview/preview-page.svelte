<script lang="ts">
	import { Component, type ComponentProps } from '@layerd/ui';

	export interface PreviewPageProps extends ComponentProps {
		innerClass?: string;
		pageClass?: string;
		contentClass?: string;
	}

	let {
		innerClass = '',
		pageClass = '',
		contentClass = '',
		children = undefined,
		...props
	}: PreviewPageProps = $props();
</script>

<Component
	{...props}
	class={`relative shrink-0 w-[calc(var(--preview-page-width)*var(--preview-zoom,1))] h-[calc(var(--preview-page-height)*var(--preview-zoom,1))] ${props.class ?? ''}`.trim()}
>
	{#snippet component({ props: innerProps })}
		<div {...innerProps}>
			<div
				class={`preview-page box-border aspect-[8.5/11] h-264 w-204 origin-top-left overflow-hidden rounded-[14px] border-2 border-[#d2d8e2] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)] scale-(--preview-zoom,1) will-change-transform md:rounded-2xl md:shadow-none ${pageClass}`.trim()}
			>
				<div class={`preview-page-inner box-border h-full max-w-full overflow-hidden p-18 ${innerClass} ${contentClass}`.trim()}>
					{@render children?.()}
				</div>
			</div>
		</div>
	{/snippet}
</Component>
