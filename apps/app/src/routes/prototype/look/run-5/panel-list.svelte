<script lang="ts">
	// PROTOTYPE (#161): the panels of the open project, in report order, spaced apart. Photo panels drag to reorder
	// by the whole card, and the preview follows the new order. Add panel sticks to the bottom of the view, so a
	// custom panel is always one tap away (Justin's note 13); `bottom` is where it sticks, inside the scrolling view's
	// padding.
	import { flip } from 'svelte/animate';
	import type { LookState } from './look.state.svelte';
	import PanelItem from './panel-item.svelte';
	import { sortable } from './sortable';

	let {
		look,
		style = 'soft',
		bottom = 'bottom-4'
	}: { look: LookState; style?: 'soft' | 'flat' | 'ring'; bottom?: string } = $props();
</script>

<div
	class="space-y-4"
	{@attach sortable('panels', (from, to) => look.movePanel(from, to))}
>
	{#each look.panels as panel, index (panel.id)}
		<div
			class="transition-[opacity,scale]"
			animate:flip={{ duration: 220 }}
		>
			<PanelItem
				{look}
				{panel}
				{index}
				{style}
			/>
		</div>
	{/each}
</div>
<div class="sticky z-10 mt-4 {bottom}">
	<button
		type="button"
		class="flex w-full items-center justify-center gap-2 rounded-full bg-white/85 py-3.5 text-sm font-semibold text-primary shadow-lg ring-1 shadow-slate-900/10 ring-primary/15 backdrop-blur-xl transition hover:bg-white"
		onclick={() => look.addPanel()}
	>
		<span class="icon-[mdi--plus-box-multiple-outline] size-5"></span> Add panel
	</button>
</div>
