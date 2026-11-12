<script lang="ts">
	// PROTOTYPE (#161): the panels of the open project, in report order, spaced apart. Photo panels drag to reorder
	// by the whole card, and the preview follows the new order. Add panel sits after the last panel (back in place,
	// Justin's run 9 note 18). Run 11 (2026-10-26 19:22): a Sent or Complete project is read only; a line at the top
	// says so in the state's colour, with Unsend on a Sent one, and Add panel goes.
	import { flip } from 'svelte/animate';
	import { STATUS } from './look.data';
	import type { LookState } from './look.state.svelte';
	import PanelItem from './panel-item.svelte';
	import { sortable } from './sortable';

	let { look, style = 'soft' }: { look: LookState; style?: 'soft' | 'flat' | 'ring' } = $props();
</script>

{#if look.isFrozen}
	{@const status = look.project.status}
	<div
		class="mb-4 flex items-center gap-3 rounded-3xl py-2.5 pr-2.5 pl-4 text-sm {STATUS[status]
			.pill}"
		data-frozen-note
	>
		<span class="icon-[mdi--lock] size-5 shrink-0"></span>
		<span class="min-w-0 flex-1"
			><b class="font-semibold">{status}</b> · read only{status === 'Sent'
				? '. Unsend it to make changes.'
				: '.'}</span
		>
		{#if status === 'Sent'}
			<button
				type="button"
				class="flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm"
				onclick={() => look.unsend(look.project)}
				><span class="icon-[mdi--undo-variant] size-4"></span>Unsend</button
			>
		{/if}
	</div>
{/if}
<div
	class="space-y-4"
	data-frozen={look.isFrozen || undefined}
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
{#if !look.isFrozen}
	<button
		type="button"
		class="mt-4 flex w-full items-center justify-center gap-2 rounded-3xl bg-primary/[0.06] py-3.5 text-sm font-semibold text-primary transition hover:bg-primary/10"
		onclick={() => look.addPanel()}
	>
		<span class="icon-[mdi--plus-box-multiple-outline] size-5"></span> Add panel
	</button>
{/if}
