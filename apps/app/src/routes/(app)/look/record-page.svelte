<script lang="ts">
	// PROTOTYPE (#161) run 12: a customer, team member, transport or facility on its own screen, opened from its row
	// the way a project opens (Justin's run 12 note 18), with two tabs, Page (how it reads, first) and Edit, swiped
	// between or picked on the floating bar. Run 13 (2026-11-07 22:21): the Page is built like the dashboard
	// (page-view.svelte): its picture or a map of where it is on top, its name and labels over the picture, and the
	// rest in the sheet below. On a desktop the Edit form sits in the floating column on the left and the Page fills
	// the rest. Run 24 (Justin, 2026-11-11): with Header B the phone's top is page-header.svelte, the one a project
	// uses, over both tabs: a bare back arrow and ⋮ on the Page, and the bar with the name from Edit on.
	// #354 (Justin, 2026-11-28: "I want to include the email signature into the main edit page of the team member"):
	// a Team member whose Email Signature the signed-in person may see (their own, or anyone's for an Admin) has its
	// Photo and Banners on Edit, under their details, and a third tab, Preview, the signature on the report's canvas
	// with Copy in the zoom bar.
	// 2026-11-28 (Justin: "I want the exact same page setup that we have in the project edit panels for the team member
	// edit panels"): a Team member's Edit is their panels, drawn as a project's are (team-edit.svelte), under the bar a
	// project's Edit has, with how complete their profile is (project-bar.svelte on a desktop, the page header's
	// percent and bar on a phone). A tap on that percent lists everything still empty.
	import { Email } from '@layerd/ui';
	import { cityStateOf } from './location';
	import { pinOfRecord, pinsAt } from './chart.data';
	import Back from './back.svelte';
	import Chips from './chips.svelte';
	import { DATASETS } from './look.data';
	import { metricsFrom, type LookState } from './look.state.svelte';
	import MoreMenu from './more-menu.svelte';
	import PageHeader from './page-header.svelte';
	import SaveCloud from './save-cloud.svelte';
	import PageView from './page-view.svelte';
	import ProjectBar from './project-bar.svelte';
	import RecordForm from './record-form.svelte';
	import RecordMark from './record-mark.svelte';
	import RecordView from './record-view.svelte';
	import { customerOf, photosOf, type RecordType } from './records.data';
	import SignatureCanvas from './signature-canvas.svelte';
	import { SignatureState } from './signature.svelte';
	import { teamPanelsOf } from './tally';
	import TeamEdit from './team-edit.svelte';
	import { ROLE_LABELS } from './team.data';

	let { look, record, isWide }: { look: LookState; record: RecordType; isWide: boolean } = $props();

	const FLOAT =
		'rounded-[28px] bg-white/85 shadow-[0_2px_6px_rgb(15_23_42/0.05),0_24px_60px_-24px_rgb(15_23_42/0.35)] ring-1 ring-white/70 backdrop-blur-xl';

	const city = $derived(
		record.page === 'customers' ? customerOf(look, record.key).city : record.location
	);
	// The header shows only the city and state (#320); a company's whole address is in its Details.
	const pins = $derived(pinsAt(look.places, [pinOfRecord(look, record, city)]));

	const isShared = $derived(look.variant('header') !== 'A');
	let isPhoto = $state(false);
	let top = $state(0);
	// How tall the Edit tab's own header is, with Header A: a panel that glides to the top stops under it (#412).
	let headerHeight = $state(0);

	// A Team member's Email Signature, when it may be shown: its Edit and its Preview read the one state.
	const hasSignature = $derived(look.isSignatureOpen);
	// svelte-ignore state_referenced_locally
	const signature = new SignatureState(() => (hasSignature ? (record.member?.id ?? '') : ''));
	const tabs = $derived(look.recordTabs);
	// A Team member's panels and how complete their profile is: the Email Signature's counts once it has loaded.
	const panels = $derived(
		record.member ? teamPanelsOf(record.member, hasSignature ? signature.draft : undefined) : []
	);
	const profile = $derived(metricsFrom(panels.flatMap((panel) => panel.sections)));
	// Whose empty inputs the toast lists (team-edit.svelte): a panel's, or `all` from the header's percent.
	let emptyFor = $state('');

	function showEmpty() {
		if (profile.percent >= 100) return look.say('Everything in this profile is filled in');
		emptyFor = 'all';
	}

	let swiper: HTMLDivElement | undefined = $state();
	let isLanded = false;

	function onscroll() {
		if (!swiper?.clientWidth) return;
		look.tabProgress = swiper.scrollLeft / swiper.clientWidth;
		look.tab = tabs[Math.round(look.tabProgress)] ?? 'page';
	}

	// The bar's tabs: the panes slide to the one picked; the first time they are simply there.
	$effect(() => {
		if (!swiper) return;
		const left = Math.max(0, tabs.indexOf(look.tab)) * swiper.clientWidth;
		if (!isLanded) {
			isLanded = true;
			swiper.scrollLeft = left;
		} else if (Math.abs(swiper.scrollLeft - left) > swiper.clientWidth / 2)
			swiper.scrollTo({ left, behavior: 'smooth' });
	});

	// On Preview the canvas takes every drag, so a strip on the left edge swipes back to Edit, as on a project.
	let edge: { x: number; left: number } | undefined;

	function edgeDown(event: PointerEvent) {
		if (!swiper) return;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		edge = { x: event.clientX, left: swiper.scrollLeft };
		swiper.style.scrollSnapType = 'none';
	}

	function edgeMove(event: PointerEvent) {
		if (!edge || !swiper) return;
		swiper.scrollLeft = edge.left - Math.max(0, event.clientX - edge.x);
	}

	function edgeUp(event: PointerEvent) {
		if (!edge || !swiper) return;
		const isBack = event.clientX - edge.x > swiper.clientWidth * 0.2;
		edge = undefined;
		swiper.style.scrollSnapType = '';
		look.tab = isBack ? 'edit' : 'preview';
		swiper.scrollTo({ left: tabs.indexOf(look.tab) * swiper.clientWidth, behavior: 'smooth' });
	}
</script>

{#snippet header()}
	{#if record.member}
		<ProjectBar
			{look}
			title={record.key}
			kind={DATASETS[record.page].one}
			percent={profile.percent}
			status={profile.status}
			whose="this profile"
			page={record.page}
			id={record.key}
			onprogress={showEmpty}
		>
			{#snippet mark()}
				<RecordMark
					{record}
					size={36}
					hasBadge={false}
				/>
			{/snippet}
		</ProjectBar>
	{:else}
		<div class="flex items-center gap-2">
			<Back
				label="Back to {DATASETS[record.page].label}"
				class="shrink-0"
				onclick={() => look.home()}
			/>
			<RecordMark
				{record}
				size={36}
				hasBadge={false}
			/>
			<span class="min-w-0 flex-1">
				<span class="block truncate font-semibold text-slate-900">{record.key}</span>
				<span class="block truncate text-xs text-slate-500">{DATASETS[record.page].one}</span>
			</span>
			<!-- The save cloud is up here, not in the bar. -->
			<SaveCloud {look} />
			<MoreMenu
				{look}
				page={record.page}
				id={record.key}
			/>
		</div>
	{/if}
{/snippet}

<!-- Drawn out of sight: the library Email writes the signature's HTML, which Preview shows and copies. -->
{#if signature.signature}
	<div class="hidden">
		<Email
			data={signature.signature}
			onMount={(instance) => (signature.email = instance)}
		/>
	</div>
{/if}

{#snippet form()}
	{#if record.member}
		<RecordForm
			{look}
			{record}
		>
			<TeamEdit
				{look}
				{record}
				{panels}
				{signature}
				bind:emptyFor
			/>
		</RecordForm>
	{:else}
		<RecordForm
			{look}
			{record}
		/>
	{/if}
{/snippet}

<!-- Preview: the Email Signature on the canvas, or why there is none yet. -->
{#snippet preview(top: number)}
	{#if signature.html}
		<SignatureCanvas
			{look}
			html={signature.html}
			{top}
		/>
	{:else}
		<div class="flex h-full items-center justify-center bg-slate-100 px-6 text-center">
			{#if signature.isLoading}
				<span
					class="icon-[svg-spinners--ring-resize] size-8 text-slate-400"
					role="status"
					aria-label="Loading the email signature"
				></span>
			{:else}
				<p class="text-sm text-slate-500">
					{signature.found && !signature.found.isAllowed
						? signature.found.reason
						: 'The email signature could not load. Check the connection and open it again.'}
				</p>
			{/if}
		</div>
	{/if}
{/snippet}

{#snippet page(left: number)}
	<PageView
		photos={photosOf(record)}
		{pins}
		isBlurred={record.page === 'team'}
		{isWide}
		{left}
		buttons={!isShared ? 'glass' : isWide ? 'ghost' : 'none'}
		picture={look.variant('page-picture')}
		isDarkMap={look.variant('page-map') === 'B'}
		hasChevron={look.variant('header') === 'C'}
		onphoto={(value) => (isPhoto = value)}
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
								>{record.page === 'transport'
									? `Last seen in ${cityStateOf(city)}`
									: cityStateOf(city)}</span
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

{#if isWide && look.tab === 'preview' && hasSignature}
	<div class="fixed inset-0">{@render preview(0)}</div>
{:else if isWide && look.tab !== 'edit'}
	<!-- A desktop's Page: the record as it reads, alone (Justin, 2026-11-16: Page and Edit are two views). -->
	<div class="fixed inset-0 bg-slate-100">{@render page(0)}</div>
{:else if isWide}
	<div class="fixed inset-0 bg-slate-100">{@render page(444)}</div>
	<aside class="fixed top-3 bottom-3 left-3 z-40 flex w-[420px] flex-col overflow-hidden {FLOAT}">
		<div class="pt-4 pr-3 pb-4 pl-4">{@render header()}</div>
		<div class="flex-1 overflow-y-auto px-4 pb-4">{@render form()}</div>
	</aside>
{:else}
	<!-- Clipped, not hidden: a clipped box can never be slid sideways by the browser. -->
	<div class="relative h-dvh overflow-clip bg-slate-100">
		{#if isShared}
			<PageHeader
				{look}
				page={record.page}
				id={record.key}
				title={record.key}
				kind={DATASETS[record.page].one}
				progress={record.member ? profile.percent : undefined}
				status={record.member ? profile.status : undefined}
				whose="this profile"
				onprogress={record.member ? showEmpty : undefined}
				reveal={look.tabProgress}
				isLight={isPhoto}
				hasCloud
				hasChevron={look.variant('header') === 'C'}
				bind:height={top}
			>
				{#snippet mark()}
					<RecordMark
						{record}
						size={36}
						hasBadge={false}
					/>
				{/snippet}
			</PageHeader>
		{/if}
		<div
			bind:this={swiper}
			class="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
			{onscroll}
		>
			<div class="h-full w-full shrink-0 snap-start">{@render page(0)}</div>
			<!-- A panel that glides to the top (#412) stops under the header, where the first one starts. -->
			<div
				class="h-full w-full shrink-0 snap-start overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+96px)]"
				style:padding-top={isShared ? `${top}px` : undefined}
				style:scroll-padding-top="{(isShared ? top : headerHeight) + 12}px"
			>
				{#if !isShared}
					<header
						class="sticky top-0 z-20 bg-white/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150"
						bind:clientHeight={headerHeight}
					>
						<div class="px-1.5 py-2">{@render header()}</div>
					</header>
				{/if}
				<div class="px-4 pt-3">{@render form()}</div>
			</div>
			{#if hasSignature}
				<div class="relative h-full w-full shrink-0 snap-start">
					{@render preview(top)}
					<div
						class="absolute bottom-0 left-0 z-10 w-6 touch-none"
						style="top: {top}px"
						aria-hidden="true"
						onpointerdown={edgeDown}
						onpointermove={edgeMove}
						onpointerup={edgeUp}
						onpointercancel={edgeUp}
					></div>
				</div>
			{/if}
		</div>
	</div>
{/if}
