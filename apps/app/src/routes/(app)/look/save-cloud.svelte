<script lang="ts">
	// The save state as one cloud (#161 look G, Justin's note 16; real since #183): a pulsing cloud while a change is on
	// its way, a green tick cloud once the server has it, and a red cloud when it is not saved, which opens the reason
	// and Retry (save-sheet.svelte).
	import type { LookState } from './look.state.svelte';

	let { look }: { look: LookState } = $props();

	const state = $derived(look.sync.state);
</script>

{#if state === 'failed'}
	<button
		type="button"
		class="icon-[mdi--cloud-alert-outline] size-[18px] shrink-0 text-danger"
		title="Not saved: {look.sync.reason}"
		aria-label="Not saved. Show why"
		onclick={() => (look.isSaveSheetOpen = true)}
	></button>
{:else}
	<span
		class="size-[18px] shrink-0 transition {state === 'saving'
			? 'icon-[mdi--cloud-sync-outline] animate-pulse text-slate-400'
			: 'icon-[mdi--cloud-check-outline] text-success'}"
		title={state === 'saving' ? 'Saving…' : 'Saved'}
		aria-label={state === 'saving' ? 'Saving' : 'Saved'}
		role="status"
	></span>
{/if}
