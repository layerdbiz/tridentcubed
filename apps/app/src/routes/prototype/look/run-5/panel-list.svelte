<script lang="ts">
	// PROTOTYPE (#161): the panels of the open project, in report order, spaced apart. Photo panels drag to reorder
	// by the whole card, and the preview follows the new order. Add panel sits after the last panel (back in place,
	// Justin's run 9 note 18).
	import { flip } from 'svelte/animate';
	import type { LookState } from './look.state.svelte';
	import PanelItem from './panel-item.svelte';
	import { sortable } from './sortable';

	let { look, style = 'soft' }: { look: LookState; style?: 'soft' | 'flat' | 'ring' } = $props();
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
<button
	type="button"
	class="mt-4 flex w-full items-center justify-center gap-2 rounded-3xl bg-primary/[0.06] py-3.5 text-sm font-semibold text-primary transition hover:bg-primary/10"
	onclick={() => look.addPanel()}
>
	<span class="icon-[mdi--plus-box-multiple-outline] size-5"></span> Add panel
</button>
