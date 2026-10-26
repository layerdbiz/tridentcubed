<script lang="ts">
	// PROTOTYPE (#161) run 5: the frame, from look G. Plain grey (note 3). No bottom bar: a menu
	// button top left opens the sidebar as a flat drawer (note 15), a bell sits top right. The dashboard is one screen
	// split 35/65 on the phone and the desktop alike (note 34): the edge-to-edge chart and the three cards on top, the
	// list below, scrolling on its own; on a desktop the cards and list sit in a narrower column. Inside a project
	// the phone gets WorkspacePhone; the desktop the panels in a floating column over the pages. Run 9 (note 21): a
	// project slides in from the right over the dashboard, which stays underneath, so a swipe back can uncover it.
	// 2026-10-26 16:34: the list sits in a sheet whose top drags down to grow the chart (like Airbnb's map and list);
	// the phone menu pulls out from the left edge and pushes back the same way; the desktop sidebar's right edge drags
	// it narrower, down to the icons alone, or wider, up to a limit. Run 11 (2026-10-26 19:22): one floating bar at the
	// bottom for the pages, the + and, in a project, Panels and Preview (nav-bar.svelte); a finger swipes the list
	// sideways to the next page; the sheet has rounder corners and a deep shadow that falls under the cards.
	import type { Attachment } from 'svelte/attachments';
	import { cubicOut } from 'svelte/easing';
	import { fly, scale } from 'svelte/transition';
	import Avatar from './avatar.svelte';
	import ClientLogo from './client-logo.svelte';
	import DashboardList from './dashboard-list.svelte';
	import HeroChart from './hero-chart.svelte';
	import AddSheet from './add-sheet.svelte';
	import { PAGE_ICONS, PAGES, RECENT } from './look.data';
	import type { LookState } from './look.state.svelte';
	import NavBar from './nav-bar.svelte';
	import PanelList from './panel-list.svelte';
	import ProjectBar from './project-bar.svelte';
	import ReportPreview from './report-preview.svelte';
	import Sidebar from './sidebar.svelte';
	import StatCards from './stat-cards.svelte';
	import WorkspacePhone from './workspace-phone.svelte';

	let { look }: { look: LookState } = $props();

	let innerWidth = $state(0);
	let innerHeight = $state(0);
	let isBellOpen = $state(false);
	let bell: HTMLDivElement | undefined = $state();
	let seen = $state(false);
	const isWide = $derived(innerWidth >= 768);

	const CANVAS = 'bg-slate-100';
	const COLUMN = 'mx-auto w-full max-w-5xl';
	const FLOAT =
		'rounded-[28px] bg-white/85 shadow-[0_2px_6px_rgb(15_23_42/0.05),0_24px_60px_-24px_rgb(15_23_42/0.35)] ring-1 ring-white/70 backdrop-blur-xl';
	const ROUND =
		'flex size-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-900/[0.05]';
	const PREVIEW = {
		days: 'timeline',
		surface: CANVAS
	} as const;

	function onpointerdown(event: PointerEvent) {
		if (isBellOpen && bell && !bell.contains(event.target as Node)) isBellOpen = false;
	}

	function ring() {
		isBellOpen = !isBellOpen;
		seen = true;
	}

	function clamp(value: number, min: number, max: number) {
		return Math.min(max, Math.max(min, value));
	}

	// The phone menu: 0 shut, 1 open, in between under a finger. From the left-edge strip it follows the finger at
	// once; on the open menu a sideways push to the left closes it, while an up or down move still scrolls Recent.
	let drawer = $state(0);
	let isPulling = $state(false);
	let drawerBox: HTMLElement | undefined = $state();
	let pull = { x: 0, y: 0, t: 0, from: 0, isDown: false, isOn: false, isDragged: false };

	function pullStart(event: PointerEvent, isEdge: boolean) {
		pull = {
			x: event.clientX,
			y: event.clientY,
			t: event.timeStamp,
			from: drawer,
			isDown: true,
			isOn: isEdge,
			isDragged: false
		};
		if (!isEdge) return;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		isPulling = true;
	}

	function pullMove(event: PointerEvent) {
		if (!pull.isDown) return;
		const dx = event.clientX - pull.x;
		if (!pull.isOn) {
			if (dx > -8 || Math.abs(dx) < Math.abs(event.clientY - pull.y)) return;
			pull.isOn = true;
			isPulling = true;
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		}
		pull.isDragged = Math.abs(dx) > 4;
		drawer = clamp(pull.from + dx / (drawerBox?.offsetWidth || 300), 0, 1);
	}

	function pullEnd(event: PointerEvent) {
		pull.isDown = false;
		if (!pull.isOn) return;
		pull.isOn = false;
		isPulling = false;
		const speed = (event.clientX - pull.x) / Math.max(1, event.timeStamp - pull.t);
		drawer = speed > 0.4 ? 1 : speed < -0.4 ? 0 : Math.round(drawer);
	}

	// A push that closed the menu ends on whatever was under the finger; that tap is not a pick.
	function swallowClick(event: MouseEvent) {
		if (!pull.isDragged) return;
		pull.isDragged = false;
		event.stopPropagation();
		event.preventDefault();
	}

	// The list's sheet rests at three heights: the list at its 65%, half way, or folded down to its heading. Drag its top
	// (the handle or the heading row) and the part above, chart and cards, follows; a flick moves one rest.
	let rest = $state(0);
	let sheetTop = $state<number>();
	let sheetFrom = { y: 0, t: 0, top: 0 };
	const rests = $derived.by(() => {
		const first = Math.max(innerHeight * 0.35, isWide ? 368 : 256);
		const last = Math.max(first, innerHeight - (isWide ? 116 : 108));
		return [first, (first + last) / 2, last];
	});
	const top = $derived(sheetTop ?? rests[rest]);

	function sheetDown(event: PointerEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('[data-sheet-handle], [data-sheet-grip]')) return;
		if (target.closest('button, a, input, select, textarea, [role="listbox"]')) return;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		sheetFrom = { y: event.clientY, t: event.timeStamp, top };
		sheetTop = top;
	}

	function sheetMove(event: PointerEvent) {
		if (sheetTop === undefined) return;
		sheetTop = clamp(sheetFrom.top + event.clientY - sheetFrom.y, rests[0], rests[2]);
	}

	function sheetUp(event: PointerEvent) {
		if (sheetTop === undefined) return;
		const at = sheetTop;
		const speed = (event.clientY - sheetFrom.y) / Math.max(1, event.timeStamp - sheetFrom.t);
		const nearest = rests.reduce(
			(best, value, index) => (Math.abs(value - at) < Math.abs(rests[best] - at) ? index : best),
			0
		);
		rest =
			speed > 0.5
				? Math.max(
						nearest,
						rests.findIndex((value) => value > at + 1)
					)
				: speed < -0.5
					? Math.min(
							nearest,
							rests.findLastIndex((value) => value < at - 1)
						)
					: nearest;
		if (rest < 0) rest = nearest;
		sheetTop = undefined;
	}

	const sheetDrag: Attachment<HTMLElement> = (node) => {
		node.addEventListener('pointerdown', sheetDown);
		node.addEventListener('pointermove', sheetMove);
		node.addEventListener('pointerup', sheetUp);
		node.addEventListener('pointercancel', sheetUp);
		return () => {
			node.removeEventListener('pointerdown', sheetDown);
			node.removeEventListener('pointermove', sheetMove);
			node.removeEventListener('pointerup', sheetUp);
			node.removeEventListener('pointercancel', sheetUp);
		};
	};

	// Swipe the list sideways for the page before or after (Justin, 2026-10-26 19:22): the list follows the finger with
	// the next page peeking in beside it and, past a quarter of its width or on a flick, the two slide the rest of the
	// way together; at either end it only gives a little. Only a finger: a mouse selects and drags as usual. Photo
	// strips and the board scroll sideways themselves (data-swipe-ignore), and the heading row drags the sheet.
	let swipeX = $state(0);
	let isSwiping = $state(false);
	// How far the pages still have to slide when a swipe lets go; 0 when a page is picked by a tap (a whole width).
	let flight = $state(0);
	let swipe = { x: 0, y: 0, t: 0, id: -1, isOn: false, isDragged: false };
	const neighbour = $derived(
		swipeX ? PAGES[PAGES.indexOf(look.dataset) + (swipeX < 0 ? 1 : -1)] : undefined
	);

	const pageSwipe: Attachment<HTMLElement> = (node) => {
		function down(event: PointerEvent) {
			swipe.isDragged = false;
			if (event.pointerType !== 'touch' || look.screen !== 'dashboard') return;
			if ((event.target as HTMLElement).closest('[data-swipe-ignore], [data-sheet-grip]')) return;
			swipe = {
				x: event.clientX,
				y: event.clientY,
				t: event.timeStamp,
				id: event.pointerId,
				isOn: false,
				isDragged: false
			};
		}
		function move(event: PointerEvent) {
			if (event.pointerId !== swipe.id) return;
			const dx = event.clientX - swipe.x;
			const dy = event.clientY - swipe.y;
			if (!swipe.isOn) {
				if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) swipe.id = -1;
				if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
				swipe.isOn = true;
				isSwiping = true;
				node.setPointerCapture(event.pointerId);
			}
			swipe.isDragged = true;
			const index = PAGES.indexOf(look.dataset);
			const isEnd = (dx > 0 && index === 0) || (dx < 0 && index === PAGES.length - 1);
			swipeX = isEnd ? dx * 0.25 : dx;
		}
		function up(event: PointerEvent) {
			if (event.pointerId !== swipe.id) return;
			swipe.id = -1;
			if (!swipe.isOn) return;
			isSwiping = false;
			const dx = event.clientX - swipe.x;
			const speed = dx / Math.max(1, event.timeStamp - swipe.t);
			const next = PAGES.indexOf(look.dataset) + (dx < 0 ? 1 : -1);
			const isFar = Math.abs(dx) > node.clientWidth / 4 || Math.abs(speed) > 0.5;
			if (event.type === 'pointerup' && isFar && next >= 0 && next < PAGES.length) {
				flight = node.clientWidth - Math.abs(swipeX);
				setTimeout(() => (flight = 0), 400);
				look.pick(PAGES[next]);
			}
			swipeX = 0;
		}
		// The swipe ends on whatever was under the finger; that tap is not a pick.
		function click(event: MouseEvent) {
			if (!swipe.isDragged) return;
			swipe.isDragged = false;
			event.stopPropagation();
			event.preventDefault();
		}
		node.addEventListener('pointerdown', down);
		node.addEventListener('pointermove', move);
		node.addEventListener('pointerup', up);
		node.addEventListener('pointercancel', up);
		node.addEventListener('click', click, true);
		return () => {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', up);
			node.removeEventListener('click', click, true);
		};
	};

	// The desktop sidebar's width: its right edge drags from the icons alone (RAIL) up to SIDE_MAX, the words sliding
	// out as it widens; let go nearer the icons than SIDE_MIN and it snaps to the icons. A double-click toggles.
	const RAIL = 80;
	const SIDE_MIN = 232;
	const SIDE_MAX = 340;
	let side = $state(288);
	let isSizing = $state(false);
	let sizeFrom = { x: 0, width: 0 };

	function sizeDown(event: PointerEvent) {
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		isSizing = true;
		sizeFrom = { x: event.clientX, width: side };
	}

	function sizeMove(event: PointerEvent) {
		if (isSizing) side = clamp(sizeFrom.width + event.clientX - sizeFrom.x, RAIL, SIDE_MAX);
	}

	function sizeUp() {
		if (!isSizing) return;
		isSizing = false;
		side = side < (RAIL + SIDE_MIN) / 2 ? RAIL : Math.max(SIDE_MIN, side);
	}
</script>

<svelte:window
	bind:innerWidth
	bind:innerHeight
	{onpointerdown}
	onkeydown={(event) => {
		if (event.key !== 'Escape') return;
		isBellOpen = false;
		drawer = 0;
	}}
/>

{#snippet bellButton()}
	<div
		class="relative"
		bind:this={bell}
	>
		<button
			class="{ROUND} relative"
			aria-label="Notifications"
			aria-expanded={isBellOpen}
			onclick={ring}
		>
			<span class="icon-[mdi--bell-outline] size-6"></span>
			{#if !seen}
				<span class="absolute top-2 right-2.5 size-2.5 rounded-full bg-danger ring-2 ring-slate-100"
				></span>
			{/if}
		</button>
		{#if isBellOpen}
			<div
				class="absolute top-full right-0 z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] origin-top-right rounded-3xl bg-white p-2 shadow-[0_2px_6px_rgb(15_23_42/0.06),0_24px_50px_-12px_rgb(15_23_42/0.3)]"
				transition:scale={{ start: 0.95, duration: 140 }}
			>
				<p class="px-3 pt-2 pb-1 text-sm font-semibold text-slate-900">Notifications</p>
				{#each RECENT as item (item.name)}
					<button
						class="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left hover:bg-slate-900/[0.04]"
						onclick={() => {
							isBellOpen = false;
							if (item.id) look.open(item.id);
						}}
					>
						{#if item.kind === 'person'}
							<Avatar
								name={item.name}
								size={36}
							/>
						{:else if item.kind === 'customer'}
							<ClientLogo
								name={item.name}
								size={36}
								shape="circle"
							/>
						{:else}
							<span
								class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
								><span class="{PAGE_ICONS.projects.active} size-[18px]"></span></span
							>
						{/if}
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm text-slate-800">{item.name}</span>
							<span class="block truncate text-xs text-slate-400">{item.note}</span>
						</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<div class="min-h-dvh {CANVAS}">
	<div
		inert={look.screen !== 'dashboard'}
		style="--side: {side}px"
	>
		<aside
			class="group/side fixed top-3 bottom-3 left-3 z-40 hidden overflow-hidden md:block {FLOAT} {isSizing
				? ''
				: 'transition-[width] duration-200 ease-out'}"
			style="width: {side}px"
		>
			<Sidebar
				{look}
				recent="logos"
				isCollapsed={side < 150}
			/>
			<div
				class="absolute inset-y-6 right-0 flex w-3 cursor-col-resize touch-none items-center justify-center"
				title="Drag to resize, double-click to fold"
				aria-hidden="true"
				onpointerdown={sizeDown}
				onpointermove={sizeMove}
				onpointerup={sizeUp}
				onpointercancel={sizeUp}
				ondblclick={() => (side = side > RAIL ? RAIL : 288)}
			>
				<span
					class="h-10 w-1 rounded-full bg-slate-400/60 opacity-0 transition group-hover/side:opacity-100 {isSizing
						? 'opacity-100'
						: ''}"
				></span>
			</div>
		</aside>

		<!-- The phone menu stays in place, off screen while shut, so a finger can pull it out part way. -->
		<button
			class="fixed inset-0 z-[60] bg-slate-950/30 md:hidden {drawer
				? ''
				: 'pointer-events-none'} {isPulling ? '' : 'transition-opacity duration-200'}"
			style="opacity: {drawer}"
			aria-label="Close menu"
			tabindex={drawer ? 0 : -1}
			onclick={() => (drawer = 0)}
		></button>
		<aside
			bind:this={drawerBox}
			class="fixed inset-y-0 left-0 z-[61] w-[84%] max-w-xs touch-pan-y overflow-hidden bg-white md:hidden {drawer
				? 'shadow-2xl'
				: ''} {isPulling ? '' : 'transition-transform duration-[260ms] ease-out'}"
			style="transform: translateX({(drawer - 1) * 100}%)"
			inert={!drawer}
			onpointerdown={(event) => pullStart(event, false)}
			onpointermove={pullMove}
			onpointerup={pullEnd}
			onpointercancel={pullEnd}
			onclickcapture={swallowClick}
		>
			<Sidebar
				{look}
				recent="logos"
				onnavigate={() => (drawer = 0)}
			/>
		</aside>
		<div
			class="fixed inset-y-0 left-0 z-30 w-4 touch-none md:hidden"
			aria-hidden="true"
			onpointerdown={(event) => pullStart(event, true)}
			onpointermove={pullMove}
			onpointerup={pullEnd}
			onpointercancel={pullEnd}
		></div>

		<main
			class="flex h-dvh flex-col overflow-hidden md:pl-[calc(var(--side)+24px)] {isSizing
				? ''
				: 'transition-[padding] duration-200 ease-out'}"
		>
			<section
				class="relative z-10 flex shrink-0 flex-col {sheetTop === undefined
					? 'transition-[height] duration-300 ease-out'
					: ''}"
				style="height: {top}px"
			>
				<header
					class="flex shrink-0 items-center justify-between px-2 pt-[max(0.25rem,env(safe-area-inset-top))] md:justify-end md:px-6 md:pt-5"
				>
					<button
						class="{ROUND} md:hidden"
						aria-label="Open menu"
						onclick={() => (drawer = 1)}><span class="icon-[mdi--menu] size-6"></span></button
					>
					{@render bellButton()}
				</header>
				<div class="min-h-0 flex-1 pt-1 md:pt-0">
					<HeroChart {look} />
				</div>
				<div class="shrink-0 px-4 pt-2 pb-3 md:px-8 md:pt-3 md:pb-4">
					<div class={COLUMN}><StatCards {look} /></div>
				</div>
			</section>
			<section
				class="flex min-h-0 flex-1 flex-col rounded-t-[40px] bg-white shadow-[0_-24px_70px_-8px_rgb(15_23_42/0.28)] md:px-8"
				{@attach sheetDrag}
			>
				<div
					class="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
					data-sheet-handle
					aria-hidden="true"
				>
					<span class="h-1.5 w-10 rounded-full bg-slate-300"></span>
				</div>
				<!-- One page at a time; on a change the new one slides in from its side and the old one out the other. -->
				<div
					class="{COLUMN} grid min-h-0 flex-1 touch-pan-y grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] overflow-clip"
					{@attach pageSwipe}
				>
					{#key look.dataset}
						<div
							class="min-h-0 [grid-area:1/1] {isSwiping
								? ''
								: 'transition-transform duration-300 ease-out'}"
							style:transform={swipeX ? `translateX(${swipeX}px)` : undefined}
							in:fly={{
								x: flight ? look.slide * flight : `${look.slide * 100}%`,
								opacity: 1,
								duration: flight ? 240 : 320,
								easing: cubicOut
							}}
							out:fly={{
								x: flight ? -look.slide * flight : `${-look.slide * 100}%`,
								opacity: 1,
								duration: flight ? 240 : 320,
								easing: cubicOut
							}}
						>
							<DashboardList
								{look}
								isSplit
							/>
						</div>
					{/key}
					{#if neighbour}
						<div
							class="pointer-events-none min-h-0 [grid-area:1/1]"
							style:transform="translateX(calc({swipeX}px {swipeX < 0 ? '+' : '-'} 100%))"
							inert
							aria-hidden="true"
						>
							<DashboardList
								{look}
								isSplit
								page={neighbour}
							/>
						</div>
					{/if}
				</div>
			</section>
		</main>
	</div>

	{#if look.screen !== 'dashboard'}
		<div
			class="fixed inset-0 z-50"
			transition:fly={{ x: '100%', opacity: 1, duration: 320, easing: cubicOut }}
		>
			<WorkspacePhone
				{look}
				panels="ring"
				surface={CANVAS}
				preview={{ ...PREVIEW, start: 'column' }}
			/>
			{#if isWide}
				<div class="fixed inset-0">
					<ReportPreview
						{look}
						highlight={look.panelId}
						{...PREVIEW}
						start="spread"
						left={444}
					/>
				</div>
				<aside
					class="fixed top-3 bottom-3 left-3 z-40 flex w-[420px] flex-col overflow-hidden {FLOAT}"
				>
					<div class="pt-4 pr-3 pb-4 pl-4">
						<ProjectBar
							{look}
							isCloud
						/>
					</div>
					<div class="flex-1 overflow-y-auto px-4 pb-4">
						<PanelList
							{look}
							style="ring"
						/>
					</div>
				</aside>
			{/if}
		</div>
	{/if}

	<NavBar
		{look}
		left={isWide ? `calc(${side + 24}px + (100vw - ${side + 24}px) / 2)` : '50%'}
	/>
	<AddSheet {look} />
</div>
