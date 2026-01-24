<script lang="ts">
	/**
	 * @tags ui, template, layout
	 * @layout vertical
	 */
	import { Component, type ComponentProps } from '@layerd/ui';

	export interface TemplateProps extends ComponentProps {
		text?: string;
		variant?: 'base' | 'site' | 'docs' | 'report' | 'admin' | 'dashboard';
		fullscreen?: boolean;
		rows?: string;
		cols?: string;
	}

	let {
		text = undefined,
		variant = 'base',
		fullscreen = false,
		rows = '1fr',
		cols = '1fr',
		children = undefined,
		...props
	}: TemplateProps = $props();
</script>

<!-- ⬜ default ⬛ prop 🟪 snippet 🟦 children -->

<!-- Template 
::::::::::::::::::::::::::::::::::::::::::::: -->
<Component
	{...props}
	class="template grid h-svh {props.class}"
>
	{#snippet component(props)}
		<main
			{...props}
			style:grid-template-rows={rows}
			style:grid-template-columns={cols}
		>
			{#if children}
				{@render children()}
			{:else}
				<section class="flex h-full items-center justify-center overflow-y-auto bg-white py-8">
					<div
						class="grid w-full max-w-md grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-8"
					>
						<div class="bg-black/30 p-4">1</div>
						<div class="bg-black/30 p-4">2</div>
						<div class="bg-black/30 p-4">3</div>
						<div class="bg-black/30 p-4">4</div>
						<div class="bg-black/30 p-4">5</div>
						<div class="bg-black/30 p-4">6</div>
						<div class="bg-black/30 p-4">7</div>
						<div class="bg-black/30 p-4">8</div>
					</div>
				</section>
			{/if}
		</main>
	{/snippet}
</Component>

<style lang="postcss">
	@reference "@layerd/ui/ui.css";

	/* Dont add any style here. Always use tailwind classes in the markup. */
</style>
