<script lang="ts">
	// The update note (#202, ADR 0007): "New version, tap to update", shown in an open app once SvelteKit's own
	// version check finds a new version. A tap switches to it and reloads the page on the same address; while a
	// change is Saving or Not saved the tap is kept, the note says so, and the switch follows once everything is
	// Saved (update.state.svelte.ts). It floats under the header, in the middle, on a phone and a desktop alike: the
	// header's row holds a page's title and the save cloud, and the floating bar and the + are at the bottom. It is
	// over the pages and the bar, and under the menus and the sheets. #392: it is the library Toast, its icon before
	// the words and the whole note the tap, held (disabled) once tapped; the Toast keeps it in a status region that
	// stays in the page, so a screen reader hears it the moment it shows.
	import { updated } from '$app/state';
	import { Toast } from '@layerd/ui';
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

<div
	class="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.75rem)] z-[56] flex justify-center px-4"
>
	<Toast
		text={step === 'none' ? '' : LABELS[step]}
		icon={step === 'offered'
			? 'icon-[mdi--arrow-up-circle-outline]'
			: 'icon-[svg-spinners--ring-resize]'}
		disabled={step !== 'offered'}
		onclick={() => update.tap()}
	/>
</div>
