<script lang="ts">
	// PROTOTYPE (#161): the panels of the open project, in report order, spaced apart. Photo panels drag to reorder
	// by the whole card, and the preview follows the new order. Add panel sits after the last panel (back in place,
	// Justin's run 9 note 18). Run 11 (2026-10-26 19:22): a Sent or Complete project is read only; a line at the top
	// says so in the state's colour, with Unsend on a Sent one, and Add panel goes. Its panels, shut or open, are all
	// in that colour too (themeOf, #335).
	import { flip } from 'svelte/animate';
	import { Button } from '@layerd/ui';
	import { STATUS } from './look.data';
	import { themeOf, type LookState } from './look.state.svelte';
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
			<Button
				neutral
				lite
				xs
				icon="icon-[mdi--undo-variant]"
				label="Unsend"
				class="shrink-0"
				onclick={() => look.unsend(look.project)}
			/>
		{/if}
	</div>
{/if}
<div
	class="space-y-4 {themeOf(look.project.status)}"
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
	<Button
		primary
		lite
		sm
		width="full"
		align="center"
		icon="icon-[mdi--plus-box-multiple-outline]"
		label="Add panel"
		class="mt-4"
		onclick={() => look.addPanel()}
	/>
{/if}
