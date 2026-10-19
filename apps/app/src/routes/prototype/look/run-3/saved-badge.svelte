<script lang="ts">
	// PROTOTYPE (#161): every input saves on its own (auto-save is V1); this shows it happening.
	import type { LookState } from './look.state.svelte';

	let { look }: { look: LookState } = $props();
</script>

<span
	class="inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap transition {look.isSaving
		? 'text-slate-400'
		: 'text-success'}"
	aria-live="polite"
>
	{#if look.isSaving}
		<span class="icon-[mdi--loading] size-4 animate-spin"></span>Saving…
	{:else}
		<span class="icon-[mdi--cloud-check-outline] size-4"></span>Saved
	{/if}
</span>
