<script lang="ts">
	// PROTOTYPE (#161) look G: the save status as one cloud right after the project title (Justin's note 16), in
	// place of the "Saved" row: a pulsing cloud while it saves, a green tick cloud once it has.
	import type { LookState } from './look.state.svelte';

	let { look }: { look: LookState } = $props();
</script>

<span
	class="size-[18px] shrink-0 transition {look.isSaving
		? 'icon-[mdi--cloud-sync-outline] animate-pulse text-slate-400'
		: 'icon-[mdi--cloud-check-outline] text-success'}"
	title={look.isSaving ? 'Saving…' : 'Saved'}
	aria-label={look.isSaving ? 'Saving' : 'Saved'}
	role="status"
></span>
