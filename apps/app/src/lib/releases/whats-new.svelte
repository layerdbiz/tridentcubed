<script lang="ts">
	// What's New (#363, #396, #399, #400), the one window for what the app has brought, kept plain (Justin, 2026-11-27):
	// each release's day of work under its date in bold (history.utils.ts), newest first, each a section of the library
	// Accordion in the look the page hands it (`fold`), only the newest open each time it opens and one open at a time
	// (Justin, 2026-11-27: the Accordion's `group`); one opened by a tap glides to the top as the one before slides shut,
	// all one move (the Accordion's `snap`), so the head names it, with nothing of the section above it showing; the open
	// section's header never fades (the Scroller's `keep`). A section shows its release and how many features and fixes it
	// holds, each count after a dot of its kind's colour (KIND_COLORS), those changes in everyday words, all alike,
	// and the link to the release's notes on GitHub. The head is the release in view on a glow of its own colours from edge to edge, ending on the library's
	// wave: v1.0.0-next.6 at the top, and as the list scrolls down, next.5, next.4 and on, the colours moving with it. On
	// the newest release, when it holds something this person has not seen, it says New release. With no release yet the
	// sections are the same, with no version. A release on dev shows its highlights (highlights.ts), each feature under a
	// short bold title (change-list.svelte). next.app shows two lists on two tabs (Justin, 2026-11-28): Release notes, as
	// dev.app will tell them, the release to come on top as Coming to dev once its highlights are written, so they are
	// read there before next moves to dev, with no link to notes not yet made, then each release on dev; and Every change,
	// every line of the work. It opens on the one last picked on this device, Release notes the first time, and on Every
	// change for a version tapped in the bell. dev.app has one list, its release notes, and no tabs.
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
	import { Accordion, Button, Dialog, Divider, Glow, Tabs, type AccordionProps } from '@layerd/ui';
	import { UpdateState } from '../update/update.state.svelte';
	import { noteReload, takeLastResort } from '../update/rescue';
	import { downloadWorker, forgetWorker, takeOver } from '../update/update.utils';
	import ChangeList from './change-list.svelte';
	import { CHECK_EVERY, KIND_COLORS } from './releases.constants';
	import { whatsNew } from './releases.state.svelte';
	import { toReleaseGlow, toTag } from './releases.utils';
	import {
		toBatchCounts,
		toBatchTallies,
		toSectionInView,
		type HistoryBatchType
	} from './history.utils';

	let {
		save,
		fold = {}
	}: {
		save: Pick<SaveStatusType, 'state'>;
		/** The look of each batch's folding section, as the page wears its folds. */
		fold?: Partial<AccordionProps>;
	} = $props();

	/** next.app's two lists: its release notes, or every change. */
	type ViewType = 'notes' | 'changes';
	const VIEWS: ViewType[] = ['notes', 'changes'];
	const VIEW_LABELS: Record<ViewType, string> = {
		notes: 'Release notes',
		changes: 'Every change'
	};
	// The tab last picked, in the browser's storage, so per device; a private window or blocked storage starts on
	// Release notes.
	const VIEW = 'trident.whats-new.view';

	function readView(): ViewType {
		try {
			return localStorage.getItem(VIEW) === 'changes' ? 'changes' : 'notes';
		} catch {
			return 'notes';
		}
	}

	function writeView(next: ViewType) {
		try {
			localStorage.setItem(VIEW, next);
		} catch {
			// Not kept.
		}
	}

	const update = new UpdateState({
		isNew: () => whatsNew.isNewer,
		save: () => save.state,
		takeOver,
		reload
	});
	const step = $derived(update.step);
	// next.app's two lists, on two tabs; dev.app has every change alone, which is its release notes.
	const notes = $derived(whatsNew.history?.notes ?? []);
	const hasViews = $derived(notes.length > 0);
	let view = $state<ViewType>(readView());
	const isNotes = $derived(hasViews && view === 'notes');
	const batches = $derived(isNotes ? notes : (whatsNew.history?.batches ?? []));
	const freshCount = $derived(whatsNew.fresh.length);
	const version = $derived(whatsNew.history?.version ?? '');
	// The head is the release in view on a glow of its own colours, every time it opens (Justin, 2026-11-27). On a phone
	// the window fills the whole screen with no grab handle, the glow across its top; the glow fills the sheet to its
	// edges, and its wave is the sheet's colour rising into it. The list fades out under it and above the button as it
	// scrolls (the library Scroller, through the Dialog's `fade`).
	const isFresh = $derived(whatsNew.isNewer || freshCount > 0);
	// The section it opens at: the newest, or the release tapped in the bell (Justin, 2026-11-28), open and in view.
	const startAt = $derived(
		Math.max(
			0,
			batches.findIndex((batch) => batch.from === whatsNew.openOn)
		)
	);
	let shownAt = $state(0);
	// The open section, newest first: the one it opens at each time What's New opens, then the one a tap opened; -1
	// with none.
	let openAt = $state(0);
	$effect(() => {
		if (!whatsNew.isOpen) return;
		const at = untrack(() => {
			// A version tapped in the bell is one of every change.
			if (whatsNew.openOn) view = 'changes';
			return startAt;
		});
		openAt = at;
		shownAt = at;
	});

	/** A tab picked: its list, from its top, its newest open; the pick kept for the next time on this device. */
	function pick(next: ViewType) {
		view = next;
		writeView(next);
		whatsNew.openOn = '';
		openAt = 0;
		shownAt = 0;
		toTop();
	}

	/** The section it opened at, when it is not the first: brought to the top of the list once drawn. */
	function bringIntoView(section: HTMLElement) {
		const frame = requestAnimationFrame(() => section.scrollIntoView({ block: 'start' }));
		return () => cancelAnimationFrame(frame);
	}
	const shown = $derived(batches[shownAt] ?? batches[0]);
	const shownVersion = $derived(
		shown?.release ? toTag(shown.release.version) : shown === batches[0] ? version : ''
	);
	const badge = $derived(
		!shownVersion
			? ''
			: shown?.isUpcoming
				? 'Coming to dev'
				: isNotes
					? shown === notes.find((each) => !each.isUpcoming)
						? 'On dev now'
						: 'Earlier release'
					: shownVersion !== version
						? 'Earlier release'
						: isFresh
							? 'New release'
							: 'Latest release'
	);
	const glow = $derived(toReleaseGlow(shownVersion || version));
	const note = $derived(
		shown ? [toTitle(shown), ...toBatchCounts(shown)].join(' · ') : 'Every update, newest first'
	);

	/** A section's title: its day, or Coming to dev for the release to come. */
	function toTitle(batch: HistoryBatchType) {
		return batch.isUpcoming ? 'Coming to dev' : batch.day;
	}
	// A section names the head once its top is this far down the scroll; at the scroll's end the open one names it while
	// on screen, else the last.
	const LINE = 64;
	// What the scroll is read again with, after a tap opens a section, and brought back to its top with, after a tab is
	// picked: the ones following the scroll there is.
	let reread = () => {};
	let toTop = () => {};

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
			const isAtBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
			// A list too short to scroll is at its end only once a tap has opened a section in it.
			const isAtEnd = isAtBottom && (scroller.scrollTop > 0 || openAt > 0);
			shownAt = toSectionInView(tops, LINE, isAtEnd, openAt);
		}
		function wait() {
			if (!frame) frame = requestAnimationFrame(read);
		}
		scroller.addEventListener('scroll', wait, { passive: true });
		reread = wait;
		toTop = () => scroller.scrollTo({ top: 0 });
		return () => {
			scroller.removeEventListener('scroll', wait);
			cancelAnimationFrame(frame);
			reread = () => {};
			toTop = () => {};
		};
	}

	// A tap opened or shut a section: once it has slid (and scrolled, where it could), the head names what is in view,
	// even where nothing scrolled.
	$effect(() => {
		void openAt;
		const timer = setTimeout(() => reread(), 400);
		return () => clearTimeout(timer);
	});

	function follow(at: number, isOpen: boolean) {
		if (isOpen) openAt = at;
		else if (openAt === at) openAt = -1;
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
		scroller={{ keep: '[aria-expanded="true"]' }}
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
				{#if hasViews}
					<div class="px-5 pt-1">
						<Tabs
							class="grid grid-cols-2 rounded-full bg-slate-900/[0.05] p-1"
							label="Show"
							options={VIEWS}
							value={isNotes ? 'notes' : 'changes'}
							onpick={pick}
						>
							{#snippet option({ value: item, isOn, props })}
								<button
									{...props}
									type="button"
									class="flex h-9 items-center justify-center rounded-full text-sm font-semibold transition {isOn
										? 'bg-white text-slate-900 shadow-sm'
										: 'text-slate-500'}">{VIEW_LABELS[item]}</button
								>
							{/snippet}
						</Tabs>
					</div>
				{/if}
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
				<!-- A new list for each tab, its sections drawn afresh. -->
				{#key isNotes}
					<ul
						class="space-y-2"
						{@attach followScroll}
					>
						{#each batches as batch, at (batch.isUpcoming ? 'upcoming' : batch.from)}
							<li {@attach at === startAt && at > 0 ? bringIntoView : undefined}>
								<!-- A section a tap opens stands at the top as the first does with nothing scrolled: the list's
							     own room above it, nothing of the one before it showing. -->
								<Accordion
									{...fold}
									class="{fold.class ?? ''} scroll-mt-4"
									open={at === startAt}
									group="whats-new"
									snap
									ontoggle={(isOpen) => follow(at, isOpen)}
								>
									{#snippet head()}
										<span class="min-w-0 flex-1">
											<span
												class="block text-[15px] leading-snug font-bold text-slate-800 tabular-nums"
												>{toTitle(batch)}</span
											>
											<span
												class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs leading-snug text-slate-500"
											>
												{#if batch.release}<span
														class="font-semibold whitespace-nowrap text-slate-600"
														>{toTag(batch.release.version)}</span
													>{/if}
												{#each toBatchTallies(batch) as tally (tally.kind)}
													<span class="inline-flex items-center gap-1.5 whitespace-nowrap">
														<span
															class="size-2 shrink-0 rounded-full {KIND_COLORS[tally.kind].dot}"
															aria-hidden="true"
														></span>{tally.text}
													</span>
												{/each}
											</span>
										</span>
									{/snippet}
									<div>
										<ChangeList changes={batch.changes} />
									</div>
									{#if batch.release && !batch.isUpcoming}
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
				{/key}
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
