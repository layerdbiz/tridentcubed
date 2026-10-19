<script lang="ts">
	// PROTOTYPE (#161): the panels of the open project, in report order. Photo panels drag to reorder,
	// and the preview follows the new order.
	import { flip } from 'svelte/animate';
	import type { LookState } from './look.state.svelte';
	import PanelItem from './panel-item.svelte';
	import { sortable } from './sortable';

	let { look, style = 'card' }: { look: LookState; style?: 'card' | 'row' } = $props();
</script>

<div
	class={style === 'card' ? 'space-y-4' : 'space-y-0.5'}
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
<button
	type="button"
	class="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-500 transition hover:border-primary/50 hover:text-primary"
	onclick={() => look.addPanel()}
>
	<span class="icon-[mdi--plus-box-multiple-outline] size-5"></span> Add panel
</button>
