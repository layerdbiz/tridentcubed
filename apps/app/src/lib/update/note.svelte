<script lang="ts">
	// The update note (#202, ADR 0007): "New version, tap to update", shown in an open app once SvelteKit's own
	// version check finds a new version. A tap switches to it and reloads the page on the same address; while a
	// change is Saving or Not saved the tap is kept, the note says so, and the switch follows once everything is
	// Saved (update.state.svelte.ts). It floats under the header, in the middle, on a phone and a desktop alike: the
	// header's row holds a page's title and the save cloud, and the floating bar and the + are at the bottom. It is
	// over the pages and the bar, and under the menus and the sheets.
	import { updated } from '$app/state';
	import type { SaveStatusType } from '#lib/rows/rows.state.svelte.js';
	import { UpdateState, type UpdateStepType } from './update.state.svelte';
	import { downloadWorker, takeOver } from './update.utils';

	let { save }: { save: Pick<SaveStatusType, 'state'> } = $props();

	const LABELS: Record<Exclude<UpdateStepType, 'none'>, string> = {
		offered: 'New version, tap to update',
		waiting: 'Will update once saved',
		switching: 'Updating…'
	};

	const update = new UpdateState({
		isNew: () => updated.current,
		save: () => save.state,
		takeOver,
		reload: () => location.reload()
	});
	const step = $derived(update.step);

	// The new version downloads quietly while the note is offered, so the tap has it ready.
	$effect(() => {
		if (updated.current) void downloadWorker();
	});

	$effect(() => update.follow());
</script>

<!-- Always there, so a screen reader hears the note when it comes. -->
<div
	class="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.75rem)] z-[56] flex justify-center px-4"
	role="status"
>
	{#if step !== 'none'}
		<button
			type="button"
			class="pointer-events-auto flex h-9 items-center gap-2 rounded-full bg-slate-900 pr-4 pl-3 font-sans text-[13px] font-medium text-white shadow-xl transition enabled:hover:bg-slate-800"
			disabled={step !== 'offered'}
			onclick={() => update.tap()}
		>
			<span
				class="size-[18px] shrink-0 {step === 'offered'
					? 'icon-[mdi--arrow-up-circle-outline]'
					: 'icon-[svg-spinners--ring-resize]'}"
				aria-hidden="true"
			></span>
			{LABELS[step]}
		</button>
	{/if}
</div>
