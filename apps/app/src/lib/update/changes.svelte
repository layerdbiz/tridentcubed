<script lang="ts">
	// The new version window (#396), in place of the short update note on the branches in CHANGE_LIST_BRANCHES
	// (next for now). It is the same tall library Dialog as What's New, listing every new feature and fix since this
	// device last pressed its button; changes.state.svelte.ts holds what it lists and when it opens. The button
	// reloads onto the newest version the way the note did (update.state.svelte.ts): never while a change is Saving or
	// Not saved, and then the note under the header says it waits. Closed without the button, the window leaves that
	// note offering it again.
	import { onMount } from 'svelte';
	import { updated } from '$app/state';
	import ChangeList from '#lib/releases/change-list.svelte';
	import WindowHead from '#lib/releases/window-head.svelte';
	import type { SaveStatusType } from '#lib/rows/rows.state.svelte.js';
	import { Dialog } from '@layerd/ui';
	import { BUILD_COMMIT, CHECK_EVERY, IDLE_AFTER } from './changes.constants';
	import { ChangesState } from './changes.state.svelte';
	import { fetchBetween, fetchNewest } from './changes.utils';
	import { UpdateState } from './update.state.svelte';
	import { downloadWorker, takeOver } from './update.utils';

	let { save }: { save: Pick<SaveStatusType, 'state'> } = $props();

	// The commit this device last pressed the button on, kept in the browser, so per device.
	const SEEN = 'trident.changes.seen';

	let lastTouch = Date.now();

	function touch() {
		lastTouch = Date.now();
	}

	const changes = new ChangesState({
		own: BUILD_COMMIT,
		store: {
			read() {
				try {
					return localStorage.getItem(SEEN) ?? undefined;
				} catch {
					return undefined;
				}
			},
			write(commit) {
				try {
					localStorage.setItem(SEEN, commit);
				} catch {
					// Not kept: the list shows again next time.
				}
			}
		},
		source: { newest: fetchNewest, between: fetchBetween },
		isIdle: () => document.hidden || Date.now() - lastTouch > IDLE_AFTER
	});

	const update = new UpdateState({
		isNew: () => updated.current || changes.isNewer,
		save: () => save.state,
		takeOver,
		reload: () => location.reload()
	});
	const step = $derived(update.step);
	const count = $derived(changes.changes?.length ?? 0);

	const NOTES = {
		waiting: 'Will update once saved',
		switching: 'Updating…'
	};

	onMount(() => {
		void changes.start();
		// While a newer version is out and unseen, ask again now and then, so one more landing joins the list; and
		// open the window once the person pauses.
		const checking = setInterval(() => {
			if (changes.isNewer) void changes.check();
		}, CHECK_EVERY);
		const opening = setInterval(() => changes.openWhenIdle(), 5000);
		return () => {
			clearInterval(checking);
			clearInterval(opening);
		};
	});

	// SvelteKit's own version check found a new version: which one, and what it brought. Its download starts quietly.
	$effect(() => {
		if (!updated.current) return;
		void changes.check();
		void downloadWorker();
	});

	$effect(() => update.follow());

	function press() {
		if (changes.acknowledge()) update.tap();
	}

	// A new version with no list to show (the same commit built again) reloads straight from the note.
	function tapNote() {
		if (changes.isNewer) changes.open();
		else update.tap();
	}
</script>

<svelte:window
	onpointerdown={touch}
	onkeydown={touch}
	onwheel={touch}
/>

<!-- Always there, so a screen reader hears the note when it comes. -->
<div
	class="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.75rem)] z-[56] flex justify-center px-4"
	role="status"
>
	{#if step !== 'none' && !changes.isOpen}
		<button
			type="button"
			class="pointer-events-auto flex h-9 items-center gap-2 rounded-full bg-slate-900 pr-4 pl-3 font-sans text-[13px] font-medium text-white shadow-xl transition enabled:hover:bg-slate-800"
			disabled={step !== 'offered'}
			onclick={tapNote}
		>
			<span
				class="size-[18px] shrink-0 {step === 'offered'
					? 'icon-[mdi--arrow-up-circle-outline]'
					: 'icon-[svg-spinners--ring-resize]'}"
				aria-hidden="true"
			></span>
			{step === 'offered'
				? changes.isNewer
					? 'New version, see what changed'
					: 'New version, tap to update'
				: NOTES[step]}
		</button>
	{/if}
</div>

{#if changes.isOpen}
	<Dialog
		label={changes.isNewer ? 'New version' : "What's new"}
		variant="tall"
		onclose={() => changes.close()}
	>
		{#snippet header()}
			<WindowHead
				title={changes.isNewer ? 'New version' : "What's new"}
				note={count === 1
					? '1 change since you last looked'
					: count > 1
						? `${count} changes since you last looked`
						: ''}
				onclose={() => changes.close()}
			/>
		{/snippet}

		<div class="pb-6">
			{#if !changes.changes}
				<p class="py-10 text-center text-[15px] leading-relaxed text-slate-500">
					A new version is ready. Its list of changes could not be read just now.
				</p>
			{:else if changes.changes.length === 0}
				<p class="py-10 text-center text-[15px] leading-relaxed text-slate-500">
					Small fixes behind the scenes.
				</p>
			{:else}
				<ChangeList changes={changes.changes} />
			{/if}
		</div>

		{#snippet footer()}
			<div class="-mx-5 border-t border-slate-200 px-5 pt-3">
				<button
					type="button"
					class="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-900 text-[15px] font-semibold text-white transition hover:bg-slate-800"
					onclick={press}
				>
					{#if changes.isNewer}<span
							class="icon-[mdi--refresh] size-5"
							aria-hidden="true"
						></span>Reload to update{:else}Got it{/if}
				</button>
			</div>
		{/snippet}
	</Dialog>
{/if}
