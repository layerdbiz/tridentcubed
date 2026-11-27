<script lang="ts">
	// What's New (#363, #396, #399, #400), the one window for what the app has brought, kept plain (Justin, 2026-11-27):
	// each release's day of work under its date in bold (history.utils.ts), newest first, each a section of the library
	// Accordion in the look the page hands it (`fold`), every one open. A section shows its release and how many
	// features and fixes it holds, those changes in everyday words, all alike, and the link to the release's notes on
	// GitHub. The head is the release in view on a glow of its own colours from edge to edge, ending on the library's
	// wave: v1.0.0-next.6 at the top, and as the list scrolls down, next.5, next.4 and on, the colours moving with it. On
	// the newest release, when it holds something this person has not seen, it says New release. With no release yet the
	// sections are the same, with no version.
	//
	// It opens by itself (releases.state.svelte.ts): on opening the app on something new, and the moment a new version
	// is out, the one way the app offers it (Justin, 2026-11-27: no "New version, tap to update" note anywhere). With a
	// newer version out, the button reloads onto it (update.state.svelte.ts): never while a change is Saving or Not
	// saved, and then the button says it waits. With a newer version out, the X, a tap outside and Escape do the same,
	// so nobody stays on an old version (Justin, 2026-11-26, #401); a reload that still brings an older page takes the
	// last resort once (rescue.ts): the service worker and its files are cleared and the page loads again.
	import { onMount, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fly } from 'svelte/transition';
	import { updated } from '$app/state';
	import type { SaveStatusType } from '#lib/rows/rows.state.svelte.js';
	import { Accordion, Button, Dialog, Divider, Glow, type AccordionProps } from '@layerd/ui';
	import { UpdateState } from '../update/update.state.svelte';
	import { noteReload, takeLastResort } from '../update/rescue';
	import { downloadWorker, forgetWorker, takeOver } from '../update/update.utils';
	import ChangeList from './change-list.svelte';
	import { CHECK_EVERY } from './releases.constants';
	import { whatsNew } from './releases.state.svelte';
	import { toReleaseGlow, toTag } from './releases.utils';
	import { toBatchCounts, toSectionInView } from './history.utils';

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
	// The head is the release in view on a glow of its own colours, every time it opens (Justin, 2026-11-27). On a phone
	// the window fills the whole screen with no grab handle, the glow across its top; the glow fills the sheet to its
	// edges, and its wave is the sheet's colour rising into it. The list fades out under it and above the button as it
	// scrolls (the library Scroller, through the Dialog's `fade`).
	const isFresh = $derived(whatsNew.isNewer || freshCount > 0);
	let shownAt = $state(0);
	const shown = $derived(batches[shownAt] ?? batches[0]);
	const shownVersion = $derived(
		shown?.release ? toTag(shown.release.version) : shown === batches[0] ? version : ''
	);
	const badge = $derived(
		!shownVersion
			? ''
			: shownVersion !== version
				? 'Earlier release'
				: isFresh
					? 'New release'
					: 'Latest release'
	);
	const glow = $derived(toReleaseGlow(shownVersion || version));
	const note = $derived(
		shown ? [shown.day, ...toBatchCounts(shown)].join(' · ') : 'Every update, newest first'
	);
	// A section names the head once its top is this far down the scroll, or the last once the scroll ends.
	const LINE = 64;

	/** Follows the scroll the list sits in, so the head names the section in view. */
	function followScroll(list: HTMLElement) {
		let area = list.parentElement;
		while (area && !/auto|scroll/.test(getComputedStyle(area).overflowY)) area = area.parentElement;
		if (!area) return;
		const scroller = area;
		let frame = 0;
		function read() {
			frame = 0;
			const top = scroller.getBoundingClientRect().top;
			const tops = [...list.children].map((item) => item.getBoundingClientRect().top - top);
			const isAtEnd =
				scroller.scrollTop > 0 &&
				scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
			shownAt = toSectionInView(tops, LINE, isAtEnd);
		}
		function wait() {
			if (!frame) frame = requestAnimationFrame(read);
		}
		scroller.addEventListener('scroll', wait, { passive: true });
		return () => {
			scroller.removeEventListener('scroll', wait);
			cancelAnimationFrame(frame);
		};
	}

	const BUTTON = {
		none: 'Got it',
		offered: 'Reload to update',
		waiting: 'Will update once saved',
		switching: 'Updating…'
	};

	onMount(() => {
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
		variant="full"
		fade="y"
		onclose={dismiss}
	>
		{#snippet header()}
			<!-- On a phone the glow fills the screen's top, under the status bar too, its words below it, with no light
			     edge along the top of the screen; the box from tablet width keeps it. -->
			<header class="relative -mx-5 -mt-[env(safe-area-inset-top)] shrink-0 md:-mt-5">
				<Glow
					color={glow.color}
					blend={glow.blend}
					class="text-center max-md:shadow-none md:rounded-t-[28px]"
				>
					<!-- Room under the words, so they never sit on the wave. The words change with the release in view. -->
					<div class="px-12 pt-[calc(env(safe-area-inset-top)+1.75rem)] pb-10 md:pt-8 md:pb-14">
						{#key shownVersion}
							<div in:fly={{ y: 10, duration: prefersReducedMotion.current ? 0 : 280 }}>
								{#if badge}
									<p
										class="mb-3 inline-flex items-center gap-1.5 rounded-full bg-on-shade/10 px-3 py-1 text-[11px] font-bold tracking-[0.18em] uppercase ring-1 ring-on-shade/20"
									>
										<span class="icon-[mdi--star-four-points] size-3.5"></span>{badge}
									</p>
								{/if}
								<h2
									class="bg-linear-to-r from-on-shade from-40% to-(--glow-c) bg-clip-text text-4xl leading-tight font-black tracking-tight text-transparent"
								>
									{shownVersion || "What's New"}
								</h2>
								<p class="mt-1 text-sm text-on-shade/75">{note}</p>
							</div>
						{/key}
					</div>
					<!-- The wave takes its own room under the words, and hangs a pixel past the glow's edge (negative margin),
					     so no thin line of the dark shows under it. -->
					<Divider
						shape="waves"
						color="text-surface"
						bleed={false}
						height="56px"
						class="-mb-px"
					/>
				</Glow>
				<Button
					ghost
					md
					icon="icon-[mdi--close]"
					aria-label="Close"
					class="absolute! top-[calc(env(safe-area-inset-top)+0.75rem)] right-3 text-on-shade! hover:bg-on-shade/10! md:top-4"
					onclick={dismiss}
				/>
			</header>
		{/snippet}

		<div class="pt-4 pb-6">
			{#if batches.length}
				<ul
					class="space-y-2"
					{@attach followScroll}
				>
					{#each batches as batch (batch.from)}
						<li>
							<Accordion
								{...fold}
								open
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
								{/snippet}
								<div>
									<ChangeList changes={batch.changes} />
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
