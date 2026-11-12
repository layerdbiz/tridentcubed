<script lang="ts">
	// Not saved (#183): why the last changes did not reach the server, and Retry. A lost connection is retried by
	// itself, so Retry only sends it now. A refused change is held back while other changes still save; Retry sends
	// it again with the rest, and if the server refuses it again it is put back to what the server has (story 36).
	import BottomSheet from './bottom-sheet.svelte';
	import type { LookState } from './look.state.svelte';

	let { look }: { look: LookState } = $props();

	function retry() {
		look.isSaveSheetOpen = false;
		look.sync.retry();
	}
</script>

{#if look.isSaveSheetOpen && look.sync.state === 'failed'}
	<BottomSheet
		label="Not saved"
		onclose={() => (look.isSaveSheetOpen = false)}
	>
		<div class="flex items-center gap-3">
			<span
				class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-danger/10 text-danger"
				><span class="icon-[mdi--cloud-alert-outline] size-6"></span></span
			>
			<p>
				<b class="block text-lg leading-snug text-slate-900">Not saved</b>
				<span class="text-sm text-slate-500">{look.sync.reason}</span>
			</p>
		</div>
		<div class="mt-6 grid grid-cols-2 gap-2">
			<button
				type="button"
				class="rounded-full bg-slate-100 py-3 text-sm font-semibold text-slate-700"
				onclick={() => (look.isSaveSheetOpen = false)}>Close</button
			>
			<button
				type="button"
				class="rounded-full bg-primary py-3 text-sm font-semibold text-white"
				onclick={retry}>Retry</button
			>
		</div>
	</BottomSheet>
{/if}
