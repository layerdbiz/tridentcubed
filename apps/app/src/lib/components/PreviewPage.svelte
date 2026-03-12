<script lang="ts">
	/**
	 * @tags preview, page, print, report
	 * @layout vertical
	 *
	 * Renders a single letter-size (8.5×11in) preview page, scaled via CSS custom properties
	 * set by the parent:
	 *   --preview-zoom          scale factor (e.g. 0.6)
	 *   --preview-page-width    page pixel width  (e.g. 816px)
	 *   --preview-page-height   page pixel height (e.g. 1056px)
	 *
	 * Usage:
	 *   <PreviewPage>content</PreviewPage>
	 *   <PreviewPage innerClass="flex flex-col items-center">content</PreviewPage>
	 */
	import { Component, type ComponentProps } from '@layerd/ui';

	export interface PreviewPageProps extends ComponentProps {
		/** Extra Tailwind classes forwarded to the inner content area */
		innerClass?: string;
	}

	let { innerClass = '', children = undefined, ...props }: PreviewPageProps = $props();
</script>

<Component
	{...props}
	class={`relative shrink-0 w-[calc(var(--preview-page-width)*var(--preview-zoom,1))] h-[calc(var(--preview-page-height)*var(--preview-zoom,1))] ${props.class ?? ''}`.trim()}
>
	{#snippet component({ props: innerProps })}
		<div {...innerProps}>
			<div
				data-export-page
				class="preview-page box-border w-204 h-264 aspect-[8.5/11] overflow-hidden border-2 border-[#d2d8e2] bg-white origin-top-left scale-(--preview-zoom,1) will-change-transform rounded-[14px] shadow-[0_12px_28px_rgba(15,23,42,0.08)] md:rounded-2xl md:shadow-none"
			>
				<div data-export-page-inner class={`box-border h-full overflow-hidden p-18 max-w-full ${innerClass}`.trim()}>
					{@render children?.()}
				</div>
			</div>
		</div>
	{/snippet}
</Component>
