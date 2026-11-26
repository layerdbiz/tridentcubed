<script lang="ts">
	// What's New (#363, #396, #399), the one window for what the app has brought: every update the branch ever took,
	// folded into batches of work (history.utils.ts) like the Activity's Grouped view, newest first, each a section of
	// the library Accordion in the look the page hands it (`fold`). A batch shows its title, its day and how many new
	// features, improvements and fixes it holds; open, its words and the changes, each kind under its heading. What
	// landed since this device last pressed the button says New, and its batches start open with the newest.
	//
	// It opens by itself (releases.state.svelte.ts): on opening the app on something new, and on the branches in
	// POP_UP_BRANCHES the moment a new version is out, in place of the update note. With a newer version out, the
	// button reloads onto it the way the note did (update.state.svelte.ts): never while a change is Saving or Not
	// saved, and then the button says it waits. With a newer version out, the X, a tap outside and Escape do the same,
	// so nobody stays on an old version (Justin, 2026-11-26, #401); a reload that still brings an older page takes the
	// last resort once (rescue.ts): the service worker and its files are cleared and the page loads again.
	import { onMount, untrack } from 'svelte';
	import { updated } from '$app/state';
	import type { SaveStatusType } from '#lib/rows/rows.state.svelte.js';
	import { Accordion, Button, Dialog, type AccordionProps } from '@layerd/ui';
	import { UpdateState } from '../update/update.state.svelte';
	import { noteReload, takeLastResort } from '../update/rescue';
	import { downloadWorker, forgetWorker, takeOver } from '../update/update.utils';
	import ChangeList from './change-list.svelte';
	import type { HistoryBatchType } from './history.utils';
	import { CHECK_EVERY, HAS_POP_UP } from './releases.constants';
	import { whatsNew } from './releases.state.svelte';
	import WindowHead from './window-head.svelte';

	let {
		save,
		fold = {}
	}: {
		save: Pick<SaveStatusType, 'state'>;
		/** The look of each batch's folding section, as the page wears its folds. */
		fold?: Partial<AccordionProps>;
	} = $props();

	const update = new UpdateState({
		isNew: () => whatsNew.isNewer,
		save: () => save.state,
		takeOver,
		reload
	});
	const step = $derived(update.step);
	const batches = $derived(whatsNew.history?.batches ?? []);
	const freshCount = $derived(whatsNew.fresh.length);

	const BUTTON = {
		none: 'Got it',
		offered: 'Reload to update',
		waiting: 'Will update once saved',
		switching: 'Updating…'
	};

	const PARTS: { from: number; label: string }[] = [
		{ from: 21, label: 'night' },
		{ from: 17, label: 'evening' },
		{ from: 12, label: 'afternoon' },
		{ from: 5, label: 'morning' },
		{ from: 0, label: 'night' }
	];

	// A batch with no words written for it is named by when it began, as people say it: Wednesday evening.
	function toTitle(batch: HistoryBatchType) {
		if (batch.title) return batch.title;
		const from = new Date(batch.from);
		const day = from.toLocaleDateString('en-US', { weekday: 'long' });
		const part = PARTS.find((each) => from.getHours() >= each.from)!.label;
		return `${day} ${part}`;
	}

	function toDay(at: string, isYear = true) {
		return new Date(at).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			...(isYear ? { year: 'numeric' } : {})
		});
	}

	// The day it was released, or the days it ran over: November 24 – 25, 2026.
	function toWhen(batch: HistoryBatchType) {
		const from = new Date(batch.from);
		const to = new Date(batch.to);
		if (toDay(batch.from) === toDay(batch.to)) return toDay(batch.to);
		if (from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()) {
			return `${toDay(batch.from, false)} – ${to.getDate()}, ${to.getFullYear()}`;
		}
		return `${toDay(batch.from, false)} – ${toDay(batch.to)}`;
	}

	function toCounts(batch: HistoryBatchType) {
		const count = (kind: string) => batch.changes.filter((change) => change.kind === kind).length;
		const parts = [
			[count('feature'), 'new'],
			[count('improved'), 'improved'],
			[count('fix'), count('fix') === 1 ? 'fix' : 'fixes']
		] as const;
		return parts.filter(([number]) => number > 0).map(([number, words]) => `${number} ${words}`);
	}

	function freshIn(batch: HistoryBatchType) {
		const seenAt = whatsNew.seenAt;
		return seenAt < 0 ? 0 : batch.changes.filter((change) => change.landed > seenAt).length;
	}

	onMount(() => {
		if (!HAS_POP_UP) return;
		// Asks about once a minute while the app is in view: SvelteKit's own check until it finds a new version,
		// then the newest history, so one more landing joins the list.
		const asking = setInterval(() => {
			if (document.hidden) return;
			if (updated.current) void whatsNew.check();
			else void updated.check();
		}, CHECK_EVERY);
		return () => clearInterval(asking);
	});

	// SvelteKit's version check found a new version: what it brought. Its download starts quietly. Once per new
	// version: the answers must not run this again, or it asks without end (#401).
	$effect(() => {
		if (!updated.current) return;
		untrack(() => {
			void whatsNew.check();
			void downloadWorker();
		});
	});

	$effect(() => update.follow());

	// The first history this page reads says whether the reload made for the newest version brought an older page.
	let isLastResortAsked = false;
	$effect(() => {
		const head = whatsNew.history?.head;
		if (!head || isLastResortAsked) return;
		isLastResortAsked = true;
		if (takeLastResort(whatsNew.isNewer, head)) void forgetWorker().then(() => location.reload());
	});

	function reload() {
		const head = whatsNew.history?.head;
		if (head) noteReload(head);
		location.reload();
	}

	function press() {
		if (whatsNew.acknowledge()) update.tap();
	}

	// The X, a tap outside or Escape: with a newer version out, the same as the button.
	function dismiss() {
		if (whatsNew.dismiss()) update.tap();
	}
</script>

{#if whatsNew.isOpen}
	<Dialog
		label="What's New"
		variant="tall"
		onclose={dismiss}
	>
		{#snippet header()}
			<WindowHead
				title="What's New"
				note={freshCount === 1
					? '1 new since you last looked'
					: freshCount > 1
						? `${freshCount} new since you last looked`
						: whatsNew.isNewer
							? 'A new version is ready'
							: 'Every update, newest first'}
				onclose={dismiss}
			/>
		{/snippet}

		<div class="pt-4 pb-6">
			{#if batches.length}
				<ul class="space-y-2">
					{#each batches as batch, index (batch.from)}
						{@const fresh = freshIn(batch)}
						<li>
							<Accordion
								{...fold}
								open={index === 0 || fresh > 0}
							>
								{#snippet head()}
									<span class="min-w-0 flex-1">
										<span class="block text-[15px] leading-snug font-semibold text-slate-800"
											>{toTitle(batch)}</span
										>
										<span class="mt-0.5 block text-xs leading-snug text-slate-500">
											<span class="whitespace-nowrap">{toWhen(batch)}</span>
											{#each toCounts(batch) as count (count)}<span class="whitespace-nowrap"
													>{' · '}{count}</span
												>{/each}
										</span>
									</span>
									{#if fresh > 0}
										<span
											class="shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white"
											>{fresh} new</span
										>
									{/if}
								{/snippet}
								{#if batch.summary}
									<p class="text-sm leading-relaxed text-slate-600">{batch.summary}</p>
								{/if}
								<div>
									<ChangeList
										changes={batch.changes}
										seenAt={whatsNew.seenAt}
									/>
								</div>
							</Accordion>
						</li>
					{/each}
				</ul>
			{:else if whatsNew.hasFailed}
				<p class="py-10 text-center text-[15px] leading-relaxed text-slate-500">
					What's New could not be read just now. Try again in a moment.
				</p>
			{:else if whatsNew.history}
				<p class="py-10 text-center text-[15px] leading-relaxed text-slate-500">
					Nothing here yet. New features and fixes will show here.
				</p>
			{:else}
				<p
					class="flex justify-center py-10"
					role="status"
				>
					<span class="icon-[svg-spinners--ring-resize] size-6 text-slate-400"></span>
					<span class="sr-only">Loading</span>
				</p>
			{/if}
		</div>

		{#snippet footer()}
			<div class="-mx-5 border-t border-slate-200 px-5 pt-3">
				<Button
					secondary
					heavy
					md
					width="full"
					label={BUTTON[step]}
					disabled={step === 'waiting' || step === 'switching'}
					onclick={press}
				/>
			</div>
		{/snippet}
	</Dialog>
{/if}
