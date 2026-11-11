<script lang="ts">
	// PROTOTYPE (#161) run 12: a customer, team member, transport or facility on its own screen, opened from its row
	// the way a project opens (Justin's run 12 note 18), with two tabs, Page (how it reads, first) and Edit, swiped
	// between or picked on the floating bar. Run 13 (2026-11-07 22:21): the Page is built like the dashboard
	// (page-view.svelte): its picture or a map of where it is on top, its name and labels over the picture, and the
	// rest in the sheet below. On a desktop the Edit form sits in the floating column on the left and the Page fills
	// the rest.
	import { pinOfRecord, pinsAt } from './chart.data';
	import Chips from './chips.svelte';
	import { DATASETS } from './look.data';
	import type { LookState } from './look.state.svelte';
	import MoreMenu from './more-menu.svelte';
	import PageView from './page-view.svelte';
	import RecordForm from './record-form.svelte';
	import RecordMark from './record-mark.svelte';
	import RecordView from './record-view.svelte';
	import { customerOf, photosOf, type RecordType } from './records.data';
	import { ROLE_LABELS } from './team.data';

	let { look, record, isWide }: { look: LookState; record: RecordType; isWide: boolean } = $props();

	const FLOAT =
		'rounded-[28px] bg-white/85 shadow-[0_2px_6px_rgb(15_23_42/0.05),0_24px_60px_-24px_rgb(15_23_42/0.35)] ring-1 ring-white/70 backdrop-blur-xl';

	const city = $derived(
		record.page === 'customers' ? customerOf(look, record.key).city : record.location
	);
	const pins = $derived(pinsAt(look.places, [pinOfRecord(look, record, city)]));

	let swiper: HTMLDivElement | undefined = $state();
	let isLanded = false;

	function onscroll() {
		if (!swiper?.clientWidth) return;
		look.tabProgress = swiper.scrollLeft / swiper.clientWidth;
		look.tab = look.tabProgress > 0.5 ? 'edit' : 'page';
	}

	// The bar's Page and Edit: the panes slide to the one picked; the first time they are simply there.
	$effect(() => {
		if (!swiper) return;
		const left = look.tab === 'edit' ? swiper.clientWidth : 0;
		if (!isLanded) {
			isLanded = true;
			swiper.scrollLeft = left;
		} else if (Math.abs(swiper.scrollLeft - left) > swiper.clientWidth / 2)
			swiper.scrollTo({ left, behavior: 'smooth' });
	});
</script>

{#snippet header()}
	<div class="flex items-center gap-2">
		<button
			class="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-900/5"
			aria-label="Back to {DATASETS[record.page].label}"
			onclick={() => look.home()}><span class="icon-[mdi--arrow-left] size-6"></span></button
		>
		<RecordMark
			{record}
			size={36}
			hasBadge={false}
		/>
		<span class="min-w-0 flex-1">
			<span class="block truncate font-semibold text-slate-900">{record.key}</span>
			<span class="block truncate text-xs text-slate-500">{DATASETS[record.page].one}</span>
		</span>
		<MoreMenu
			{look}
			page={record.page}
			id={record.key}
		/>
	</div>
{/snippet}

{#snippet page(left: number)}
	<PageView
		photos={photosOf(record)}
		{pins}
		isBlurred={record.page === 'team'}
		{isWide}
		{left}
		onback={() => look.home()}
		backLabel="Back to {DATASETS[record.page].label}"
	>
		{#snippet actions()}
			<MoreMenu
				{look}
				page={record.page}
				id={record.key}
				tone="bare"
			/>
		{/snippet}
		{#snippet overlay(isLight)}
			<div class="flex items-center gap-3">
				<RecordMark
					{record}
					size={64}
					hasBadge={false}
				/>
				<div class="min-w-0 flex-1 space-y-1.5">
					<h1
						class="line-clamp-2 text-2xl leading-tight font-semibold {isLight
							? 'text-white'
							: 'text-slate-900'}"
					>
						{record.key}
					</h1>
					{#if record.member}
						<p class="truncate text-sm {isLight ? 'text-white/80' : 'text-slate-500'}">
							{[record.member.title, ROLE_LABELS[record.member.role]].filter(Boolean).join(' · ')}
						</p>
					{/if}
					<Chips
						labels={record.sub ? [...record.labels, record.sub] : record.labels}
						isWrapped
						{isLight}
					/>
					{#if city}
						<p
							class="flex items-center gap-0.5 text-sm {isLight
								? 'text-white/85'
								: 'text-slate-600'}"
						>
							<span class="icon-[mdi--map-marker] size-4 shrink-0 {record.tone.text}"></span>
							<span class="truncate"
								>{record.page === 'transport' ? `Last seen in ${city}` : city}</span
							>
						</p>
					{/if}
				</div>
			</div>
		{/snippet}
		<RecordView
			{look}
			{record}
		/>
	</PageView>
{/snippet}

{#if isWide}
	<div class="fixed inset-0 bg-slate-100">{@render page(444)}</div>
	<aside class="fixed top-3 bottom-3 left-3 z-40 flex w-[420px] flex-col overflow-hidden {FLOAT}">
		<div class="pt-4 pr-3 pb-4 pl-4">{@render header()}</div>
		<div class="flex-1 overflow-y-auto px-4 pb-4">
			<RecordForm
				{look}
				{record}
			/>
		</div>
	</aside>
{:else}
	<div class="relative h-dvh overflow-hidden bg-slate-100">
		<div
			bind:this={swiper}
			class="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
			{onscroll}
		>
			<div class="h-full w-full shrink-0 snap-start">{@render page(0)}</div>
			<div
				class="h-full w-full shrink-0 snap-start overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+96px)]"
			>
				<header
					class="sticky top-0 z-20 bg-white/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150"
				>
					<div class="px-1.5 py-2">{@render header()}</div>
				</header>
				<div class="px-4 pt-3">
					<RecordForm
						{look}
						{record}
					/>
				</div>
			</div>
		</div>
	</div>
{/if}
