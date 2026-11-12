<script lang="ts">
	// PROTOTYPE (#161) run 28: one panel of the open project on its own, with everything a tap inside it can open:
	// the + sheet ("Add new" in a dropdown), a record's Edit (a dropdown's pencil), the delete question and the
	// toast. The standalone page (panels/+page.svelte) and the artifact built from it show the Transport Mode panel
	// this way, so Justin can click through it and write on it.
	import AddSheet from './add-sheet.svelte';
	import Confirm from './confirm.svelte';
	import type { PanelKindType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import PanelBody from './panel-body.svelte';
	import RecordPage from './record-page.svelte';
	import { recordOf } from './records.data';

	let { look, kind = 'transport' }: { look: LookState; kind?: PanelKindType } = $props();

	const panel = $derived(look.panels.find((item) => item.kind === kind));
	const record = $derived(
		look.record ? recordOf(look, look.record.page, look.record.key) : undefined
	);
</script>

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
