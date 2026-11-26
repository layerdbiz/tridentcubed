<script lang="ts">
	// PROTOTYPE (#161): the one "Are you sure?" before anything is deleted (Justin, 2026-10-25): a project, a panel, a
	// transport stop, a photo group or photo, a time log day or entry. Cancel keeps it.
	import { Button, Dialog } from '@layerd/ui';
	import type { LookState } from './look.state.svelte';

	let { look }: { look: LookState } = $props();

	function yes() {
		const ask = look.asking;
		look.asking = undefined;
		ask?.onyes();
	}
</script>

{#if look.asking}
	{@const ask = look.asking}
	<Dialog
		label={ask.title}
		onclose={() => (look.asking = undefined)}
	>
		<div class="flex items-center gap-3">
			<span
				class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-danger/10 text-danger"
				><span class="icon-[mdi--trash-can-outline] size-6"></span></span
			>
			<p>
				<b class="block text-lg leading-snug text-slate-900">{ask.title}</b>
				<span class="text-sm text-slate-500">{ask.note ?? 'This cannot be undone.'}</span>
			</p>
		</div>
		<div class="mt-6 grid grid-cols-2 gap-2">
			<Button
				neutral
				lite
				sm
				width="full"
				label="Cancel"
				onclick={() => (look.asking = undefined)}
			/>
			<Button
				danger
				heavy
				sm
				width="full"
				label="Delete"
				onclick={yes}
			/>
		</div>
	</Dialog>
{/if}
