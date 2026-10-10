<script lang="ts">
	// PROTOTYPE (#161): the inputs of one panel. Read-only stand-ins; nothing saves.
	import { PANEL_STATUS, type PanelType } from './look.data';

	let { panel, isCompact = false }: { panel: PanelType; isCompact?: boolean } = $props();
</script>

<div class="space-y-4">
	{#if !isCompact}
		<div class="flex items-center gap-3">
			<span class="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"
				><span class="{panel.icon} size-6"></span></span
			>
			<div class="flex-1">
				<p class="text-lg font-semibold text-slate-900">{panel.name}</p>
				<p class="flex items-center gap-1 text-xs {PANEL_STATUS[panel.status].tone}">
					<span class="{PANEL_STATUS[panel.status].icon} size-3.5"></span>{panel.status}
				</p>
			</div>
			<span class="flex items-center gap-1 text-[11px] text-emerald-600"
				><span class="icon-[mdi--cloud-check-outline] size-4"></span>Saved</span
			>
		</div>
	{/if}
	{#each panel.inputs as input (input.label)}
		<label class="block">
			<span class="mb-1 block text-xs font-medium text-slate-500">{input.label}</span>
			<input
				class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-primary"
				value={input.value}
				placeholder="Tap to fill in"
			/>
		</label>
	{/each}
	{#if panel.id === 'inspection' || panel.id === 'damages' || panel.id === 'discharge'}
		<div class="grid grid-cols-3 gap-2">
			{#each [1, 2, 3, 4, 5] as tile (tile)}
				<div class="aspect-square rounded-xl bg-gradient-to-br from-slate-200 to-slate-300"></div>
			{/each}
			<button
				class="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400"
			>
				<span class="icon-[mdi--camera-plus-outline] size-7"></span>
				<span class="text-[11px]">Add</span>
			</button>
		</div>
	{/if}
</div>
