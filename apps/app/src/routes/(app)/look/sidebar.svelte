<script lang="ts">
	// PROTOTYPE (#161) run 5: the sidebar and phone menu: logo, the sections, Recent, and the user with settings at
	// the bottom. Run 11 (2026-10-26 19:22): no Home and no New project button; the floating bar's + adds things. Every icon sits in one centred column (note 16): the logo twice its old size,
	// the section icons half again bigger, filled (note 17; since run 11 the pages' own icons, the same as on the floating
	// bar). The person at the bottom is whoever is signed in, with their role (#185; note 19 had it fixed to Cezary). `isCollapsed` fades the words, leaving the icons: the desktop sidebar keeps one layout at every
	// width and clips it, so the words slide out as it is dragged wider (2026-10-26 16:34). `onnavigate` runs after any
	// pick, so the phone drawer can close itself, even when the pick is the page already open. Run 12 (2026-11-07,
	// notes 14 to 16): Recent is the same list as the bell's notifications (recent-list.svelte), with round icons, and
	// fades out at its bottom before the profile; the section names and TRIDENT CUBED are bold. Run 13: the pages not
	// on show have black icons and lighter words. Run 15 (2026-11-10): the logo and name are the organization's own,
	// and the cog and Admin both open Settings. Run 18 (Justin, 2026-11-10): Admin is out of the menu for now; the
	// signed-in person's row and the cog both open Settings, where the organization is edited. #212 (Justin,
	// 2026-11-18): Recent is "Recents", a panel that slides open and shut (menu-panel.svelte), with Online under it.
	// #346 (Justin, 2026-11-25): Pinned sits above them, what this person pinned from a ⋮ menu (pins.ts). #345: the search icon at
	// the far right of the logo opens the search pop-up (`onsearch`, search-popup.svelte; a section row until 2026-11-26).
	import { Avatar, Button, Scroller } from '@layerd/ui';
	import type { Snippet } from 'svelte';
	import AccountMenu from './account-menu.svelte';
	import { DATASETS, NAV, type DatasetType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import { faceOf } from './marks';
	import MenuPanel from './menu-panel.svelte';
	import OnlineList from './online-list.svelte';
	import { pinnedOf } from './pins';
	import RecentList from './recent-list.svelte';
	import { ROLE_LABELS } from './team.data';

	let {
		look,
		isCollapsed = false,
		onnavigate,
		onsearch,
		bell
	}: {
		look: LookState;
		isCollapsed?: boolean;
		onnavigate?: () => void;
		// Opens the search pop-up (#345).
		onsearch?: () => void;
		// The phone's menu: the notification bell, at the top right beside the name (Justin, 2026-11-16).
		bell?: Snippet;
	} = $props();

	// The signed-in person's Team record; until it has loaded, their role alone.
	const me = $derived(look.me ?? { name: '', role: look.role });
	const pinned = $derived(pinnedOf(look));
	// The one column every icon centres in.
	const COLUMN = 'flex w-14 shrink-0 justify-center';
	// Words never wrap while the sidebar narrows; folded to icons they fade out.
	const WORDS = $derived(
		`whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'pointer-events-none opacity-0' : ''}`
	);
	function settings() {
		look.openSettings();
		onnavigate?.();
	}

	// The keys that open search on a desktop, as that keyboard says them.
	const SHORTCUT = /Mac|iPhone|iPad/.test(globalThis.navigator?.userAgent ?? '') ? '⌘ K' : 'Ctrl K';

	function go(id: string) {
		if (id === 'admin') return settings();
		if (look.screen !== 'dashboard') look.home();
		look.navSection = id;
		if (id in DATASETS) look.pick(id as DatasetType);
		onnavigate?.();
	}
</script>

<div class="flex h-full flex-col">
	<div class="flex w-full items-center px-3 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4">
		<button
			class="flex min-w-0 flex-1 items-center gap-1"
			onclick={() => go('projects')}
		>
			<span class={COLUMN}
				>{#if look.organization.logo}<img
						src={look.organization.logo}
						alt={look.organization.name}
						class="size-14 object-contain"
					/>{/if}</span
			>
			<span class="text-[15px] font-extrabold tracking-wide text-slate-900 uppercase {WORDS}"
				>{look.organization.name}</span
			>
		</button>
		{#if bell}<div class="shrink-0">{@render bell()}</div>{/if}
		{#if onsearch}
			<!-- Search, at the far right of the logo (Justin, 2026-11-26: out of the sections, an icon beside the name). -->
			<span class="shrink-0 {WORDS}"
				><Button
					ghost
					icon="icon-[mdi--magnify]"
					aria-label="Search"
					title="Search ({SHORTCUT})"
					lg
					class="text-slate-900"
					onclick={onsearch}
				/></span
			>
		{/if}
	</div>
	<nav class="w-full space-y-0.5 px-3">
		{#each NAV.filter((item) => item.id !== 'admin') as item (item.id)}
			{@const isOn =
				(look.screen === 'workspace' || look.screen === 'record' ? look.place : look.navSection) ===
				item.id}
			<button
				class="flex w-full items-center gap-1 overflow-hidden rounded-xl py-1.5 text-[15px] font-bold transition {isOn
					? 'bg-slate-900/[0.06] text-slate-900'
					: 'text-slate-500 hover:bg-slate-900/[0.04]'}"
				title={item.label}
				aria-current={isOn ? 'page' : undefined}
				onclick={() => go(item.id)}
			>
				<span class={COLUMN}
					><span class="{item.icon} size-[30px] {isOn ? 'text-primary' : 'text-slate-900'}"
					></span></span
				>
				<span class={WORDS}>{item.label}</span>
			</button>
		{/each}
	</nav>

	<Scroller
		fade="y"
		class="mt-4 w-full flex-1 px-3 pb-6"
	>
		<MenuPanel
			title="Pinned"
			isOpen={look.menuPanels.pinned}
			ontoggle={() => look.toggleMenuPanel('pinned')}
			words={WORDS}
		>
			{#if pinned.length}
				<RecentList
					{look}
					items={pinned}
					size={32}
					width={56}
					words={WORDS}
					onpick={onnavigate}
				/>
			{:else}
				<p class="px-4 pt-0.5 pb-1.5 text-xs text-slate-400 {WORDS}">
					Pin anything from its ⋮ menu.
				</p>
			{/if}
		</MenuPanel>
		<MenuPanel
			title="Recents"
			isOpen={look.menuPanels.recents}
			ontoggle={() => look.toggleMenuPanel('recents')}
			words={WORDS}
		>
			<RecentList
				{look}
				size={32}
				width={56}
				words={WORDS}
				onpick={onnavigate}
			/>
		</MenuPanel>
		<MenuPanel
			title="Online"
			isOpen={look.menuPanels.online}
			ontoggle={() => look.toggleMenuPanel('online')}
			words={WORDS}
		>
			<OnlineList
				{look}
				size={32}
				width={56}
				words={WORDS}
				onpick={onnavigate}
			/>
		</MenuPanel>
	</Scroller>

	<div class="flex w-full items-center gap-1 px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
		<div class="min-w-0 flex-1">
			<AccountMenu
				{look}
				isWide
				{onnavigate}
			>
				{#snippet picture(isOpen)}
					<span
						class="flex w-full min-w-0 items-center gap-1 rounded-2xl text-left transition {isOpen
							? 'bg-slate-900/[0.05]'
							: 'hover:bg-slate-900/[0.04]'}"
					>
						<span class={COLUMN}
							><Avatar
								{...faceOf(me.name)}
								size={40}
								ring="ring-2 ring-slate-200"
							/></span
						>
						<span class="min-w-0 flex-1 text-sm {WORDS}"
							><b class="block truncate font-medium text-slate-900"
								>{me.name.replace('Capt. ', '')}</b
							><span class="text-xs text-slate-500"
								>{look.isSuperAdmin ? 'Super admin' : me.role ? ROLE_LABELS[me.role] : ''}</span
							></span
						>
						<span
							class="mr-2 icon-[mdi--unfold-more-horizontal] size-5 shrink-0 text-slate-400 {WORDS}"
						></span>
					</span>
				{/snippet}
			</AccountMenu>
		</div>
	</div>
</div>
