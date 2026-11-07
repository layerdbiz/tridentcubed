<script lang="ts">
	// PROTOTYPE (#161) run 12: a customer, team member, transport or facility on its own screen, opened from its row
	// the way a project opens (Justin's run 12 note 18). On a phone it slides in over the dashboard with two tabs,
	// Page (how it reads, first) and Edit, swiped between or picked on the floating bar; on a desktop the Edit form
	// sits in the floating column on the left and the Page fills the rest. The header has back, its icon and name, and
	// the same ⋮ as its row.
	import type { LookState } from './look.state.svelte';
	import MoreMenu from './more-menu.svelte';
	import RecordForm from './record-form.svelte';
	import RecordMark from './record-mark.svelte';
	import RecordView from './record-view.svelte';
	import type { RecordType } from './records.data';
	import { DATASETS } from './look.data';

	let { look, record, isWide }: { look: LookState; record: RecordType; isWide: boolean } = $props();

	const FLOAT =
		'rounded-[28px] bg-white/85 shadow-[0_2px_6px_rgb(15_23_42/0.05),0_24px_60px_-24px_rgb(15_23_42/0.35)] ring-1 ring-white/70 backdrop-blur-xl';

	let swiper: HTMLDivElement | undefined = $state();
	let top = $state(0);
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

{#if isWide}
	<div class="fixed inset-0 overflow-y-auto bg-slate-100 pl-[444px]">
		<div class="mx-auto max-w-2xl px-8 py-8">
			<RecordView
				{look}
				{record}
			/>
		</div>
	</div>
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
		<header
			class="absolute inset-x-0 top-0 z-20 bg-white/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150"
			bind:clientHeight={top}
		>
			<div class="px-1.5 py-2">{@render header()}</div>
		</header>
		<div
			bind:this={swiper}
			class="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
			{onscroll}
		>
			{#each ['page', 'edit'] as pane (pane)}
				<div
					class="w-full shrink-0 snap-start overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+96px)]"
					style="padding-top: {top + 12}px"
				>
					{#if pane === 'page'}
						<RecordView
							{look}
							{record}
						/>
					{:else}
						<RecordForm
							{look}
							{record}
						/>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}
