<script lang="ts">
	// What's New (#363, #396, #399, #400), the one window for what the app has brought, kept plain (Justin, 2026-11-27):
	// each day of work under its date in bold (history.utils.ts), newest first, each a section of the library Accordion
	// in the look the page hands it (`fold`). A day shows the release that brought it and how many features and fixes it
	// holds; open, those changes in everyday words and the link to that release's notes on GitHub. The head names the
	// newest version; opened on a new release, it is a glow of that release's own colours from edge to edge, "New
	// release" and the version, ending on the library's wave. With no release yet the days are the same, with no
	// version. What landed since this device last pressed the button says New, and its days start open with the newest.
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
	import { Accordion, Button, Chip, Dialog, Divider, Glow, type AccordionProps } from '@layerd/ui';
	import { UpdateState } from '../update/update.state.svelte';
	import { noteReload, takeLastResort } from '../update/rescue';
	import { downloadWorker, forgetWorker, takeOver } from '../update/update.utils';
	import ChangeList from './change-list.svelte';
	import { CHECK_EVERY, HAS_POP_UP } from './releases.constants';
	import { whatsNew } from './releases.state.svelte';
	import { toReleaseGlow, toTag } from './releases.utils';
	import { toBatchCounts, type HistoryBatchType } from './history.utils';
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
	const version = $derived(whatsNew.history?.version ?? '');
	// A new release, newer than what this person last saw (Justin, 2026-11-27): the window opens on a glow of its own
	// colours with the version, in place of the plain head. The glow fills the sheet to its edges, over the sheet's
	// own grab handle (it draws its own), and its wave is the sheet's colour rising into it.
	const isRelease = $derived(Boolean(version) && (whatsNew.isNewer || freshCount > 0));
	const glow = $derived(toReleaseGlow(version));
	const note = $derived(
		freshCount === 1
			? '1 new since you last looked'
			: freshCount > 1
				? `${freshCount} new since you last looked`
				: whatsNew.isNewer
					? 'A new version is ready'
					: 'Every update, newest first'
	);

	const BUTTON = {
		none: 'Got it',
		offered: 'Reload to update',
		waiting: 'Will update once saved',
		switching: 'Updating…'
	};

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
			{#if isRelease}
				<header class="relative -mx-5 -mt-[2.125rem] shrink-0 md:-mt-5">
					<Glow
						color={glow.color}
						blend={glow.blend}
						class="rounded-t-[28px] text-center"
					>
						<span
							class="mx-auto mt-3 block h-1.5 w-10 rounded-full bg-on-shade/30 md:hidden"
							aria-hidden="true"
						></span>
						<div class="px-12 pt-5 md:pt-8">
							<p
								class="inline-flex items-center gap-1.5 rounded-full bg-on-shade/10 px-3 py-1 text-[11px] font-bold tracking-[0.18em] uppercase ring-1 ring-on-shade/20"
							>
								<span class="icon-[mdi--star-four-points] size-3.5"></span>New release
							</p>
							<h2
								class="mt-3 bg-linear-to-r from-on-shade from-40% to-(--glow-c) bg-clip-text text-4xl leading-tight font-black tracking-tight text-transparent"
							>
								{version}
							</h2>
							<p class="mt-1 text-sm text-on-shade/75">What's New · {note}</p>
						</div>
						<!-- Down a pixel past the glow's edge, so no line of the dark shows under the wave. -->
						<Divider
							shape="waves"
							color="text-surface"
							bleed={false}
							height="64px"
							class="-mb-px"
						/>
					</Glow>
					<Button
						ghost
						md
						icon="icon-[mdi--close]"
						aria-label="Close"
						class="absolute! top-4 left-3 text-on-shade! hover:bg-on-shade/10!"
						onclick={dismiss}
					/>
				</header>
			{:else}
				<WindowHead
					title="What's New"
					note={version ? `${version} · ${note}` : note}
					onclose={dismiss}
				/>
			{/if}
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
										<span
											class="block text-[15px] leading-snug font-bold text-slate-800 tabular-nums"
											>{batch.day}</span
										>
										<span class="mt-0.5 block text-xs leading-snug text-slate-500">
											{#if batch.release}<span
													class="font-semibold whitespace-nowrap text-slate-600"
													>{toTag(batch.release.version)}</span
												>{/if}{#each toBatchCounts(batch) as count, at (count)}<span
													class="whitespace-nowrap"
													>{batch.release || at > 0 ? ' · ' : ''}{count}</span
												>{/each}
										</span>
									</span>
									{#if fresh > 0}
										<Chip
											label="{fresh} new"
											class="bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white"
										/>
									{/if}
								{/snippet}
								<div>
									<ChangeList
										changes={batch.changes}
										seenAt={whatsNew.seenAt}
									/>
								</div>
								{#if batch.release}
									<Button
										secondary
										ghost
										sm
										href={batch.release.url}
										external
										icon="icon-[mdi--github]"
										label="{toTag(batch.release.version)} release notes"
										class="mt-3 -ml-2"
									/>
								{/if}
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
