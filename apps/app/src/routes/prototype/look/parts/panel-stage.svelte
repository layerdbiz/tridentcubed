<script lang="ts">
	// PROTOTYPE (#161) run 28: one panel of the open project on its own, with everything a tap inside it can open:
	// the + sheet ("Add new" in a dropdown), a record's Edit (a dropdown's pencil), the delete question and the
	// toast. The standalone page (panels/+page.svelte) and the artifact built from it show the Transport Mode panel
	// this way, so Justin can click through it and write on it. `parts` lists the prototype parts to put switches
	// for above the panel, so their letters can be flipped without the app's own selector.
	import AddSheet from './add-sheet.svelte';
	import Confirm from './confirm.svelte';
	import type { PanelKindType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import PanelBody from './panel-body.svelte';
	import RecordPage from './record-page.svelte';
	import { recordOf } from './records.data';
	import { partOf } from './variants.data';

	let {
		look,
		kind = 'transport',
		parts = []
	}: { look: LookState; kind?: PanelKindType; parts?: string[] } = $props();

	const switches = $derived(parts.map(partOf).filter((item) => item !== undefined));

	const panel = $derived(look.panels.find((item) => item.kind === kind));
	const record = $derived(
		look.record ? recordOf(look, look.record.page, look.record.key) : undefined
	);
</script>

{#if switches.length}
	<div class="mb-3 space-y-2 rounded-3xl bg-slate-900 p-3 text-left text-white">
		<p class="px-1 text-[11px] font-semibold tracking-[0.14em] text-white/60 uppercase">
			Prototypes
		</p>
		{#each switches as part (part.id)}
			{@const current = look.variant(part.id)}
			<div class="flex items-start gap-2 px-1">
				<span class="min-w-0 flex-1">
					<span class="block text-[13px] text-white/90">{part.label}</span>
					<span class="block text-[10px] leading-snug text-white/45">{part.note}</span>
				</span>
				<span
					class="flex shrink-0 gap-1"
					role="radiogroup"
					aria-label={part.label}
				>
					{#each part.variants as letter (letter)}
						<button
							type="button"
							role="radio"
							aria-checked={current === letter}
							class="flex size-7 items-center justify-center rounded-full text-xs font-semibold transition {current ===
							letter
								? 'bg-primary text-white'
								: 'bg-white/10 text-white/60 hover:bg-white/20'}"
							onclick={() => look.pickVariant(part.id, letter)}>{letter}</button
						>
					{/each}
				</span>
			</div>
		{/each}
	</div>
{/if}
<div class="rounded-[28px] bg-white p-4 text-left shadow-[0_1px_2px_rgb(15_23_42/0.05)]">
	{#if panel}
		{#key look.projectId}
			<PanelBody
				{look}
				{panel}
			/>
		{/key}
	{:else}
		<p class="text-sm text-slate-400">This project has no such panel.</p>
	{/if}
</div>
{#if look.screen === 'record' && record}
	<div class="fixed inset-0 z-50 bg-slate-100">
		<RecordPage
			{look}
			{record}
			isWide={false}
		/>
	</div>
{/if}
<AddSheet {look} />
<Confirm {look} />
{#if look.toast}
	<div class="fixed inset-x-0 bottom-6 z-[90] flex justify-center px-4">
		<p class="rounded-full bg-slate-900 px-4 py-2.5 text-sm text-white shadow-xl">{look.toast}</p>
	</div>
{/if}
