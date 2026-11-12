<script lang="ts">
	// PROTOTYPE (#161) run 5: the sidebar and phone menu: logo, the sections, Recent, and the user with settings at
	// the bottom. Run 11 (2026-10-26 19:22): no Home and no New project button; the floating bar's + adds things. Every icon sits in one centred column (note 16): the logo twice its old size,
	// the section icons half again bigger, filled (note 17; since run 11 the pages' own icons, the same as on the floating
	// bar). Signed in as Cezary,
	// Admin (note 19). `isCollapsed` fades the words, leaving the icons: the desktop sidebar keeps one layout at every
	// width and clips it, so the words slide out as it is dragged wider (2026-10-26 16:34). `onnavigate` runs after any
	// pick, so the phone drawer can close itself, even when the pick is the page already open. Run 12 (2026-11-07,
	// notes 14 to 16): Recent is the same list as the bell's notifications (recent-list.svelte), with round icons, and
	// fades out at its bottom before the profile; the section names and TRIDENT CUBED are bold. Run 13: the pages not
	// on show have black icons and lighter words. Run 15 (2026-11-10): the logo and name are the organization's own,
	// and the cog and Admin both open Settings. Run 18 (Justin, 2026-11-10): Admin is out of the menu for now; the
	// signed-in person's row and the cog both open Settings, where the organization is edited.
	import Avatar from './avatar.svelte';
	import { DATASETS, FADE, ME, NAV, type DatasetType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import Menu from './menu.svelte';
	import RecentList from './recent-list.svelte';

	let {
		look,
		isCollapsed = false,
		onnavigate
	}: {
		look: LookState;
		isCollapsed?: boolean;
		onnavigate?: () => void;
	} = $props();

	const me = $derived(look.members.find((member) => member.name === ME) ?? { name: ME, role: '' });
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

	// The menu on the profile picture (run 33): your own Team page, the Organization, and Log out.
	const ACCOUNT = [
		{ id: 'profile', label: 'Profile', icon: 'icon-[mdi--account-circle-outline]' },
		{ id: 'organization', label: 'Organization', icon: 'icon-[mdi--domain]' },
		{ id: 'logout', label: 'Log out', icon: 'icon-[mdi--logout]', isDanger: true }
	];

	function account(id: string) {
		if (id === 'organization') return settings();
		if (id === 'profile') look.openRecord('team', me.name, 'page');
		else look.signOut();
		onnavigate?.();
	}

	function go(id: string) {
		if (id === 'admin') return settings();
		if (look.screen !== 'dashboard') look.home();
		look.navSection = id;
		if (id in DATASETS) look.pick(id as DatasetType);
		onnavigate?.();
	}
</script>

<div class="flex h-full flex-col">
	<button
		class="flex w-full items-center gap-1 px-3 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4"
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
	<nav class="w-full space-y-0.5 px-3">
		{#each NAV.filter((item) => item.id !== 'admin') as item (item.id)}
			{@const isOn = look.navSection === item.id}
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

	<p class="mt-6 px-7 text-[11px] font-bold tracking-wide text-slate-500 uppercase {WORDS}">
		Recent
	</p>
	<div class="mt-1 w-full flex-1 space-y-0.5 overflow-y-auto px-3 pb-6 {FADE}">
		<RecentList
			{look}
			size={32}
			width={56}
			words={WORDS}
			onpick={onnavigate}
		/>
	</div>

	<div class="flex w-full items-center gap-1 px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
		<div class="min-w-0 flex-1">
			<Menu
				label="Account"
				value=""
				options={ACCOUNT}
				align="left"
				isWide
				onpick={account}
			>
				{#snippet trigger(_, isOpen)}
					<span
						class="flex w-full min-w-0 items-center gap-1 rounded-2xl text-left transition {isOpen
							? 'bg-slate-900/[0.05]'
							: 'hover:bg-slate-900/[0.04]'}"
					>
						<span class={COLUMN}
							><Avatar
								name={me.name}
								size={40}
								ring="ring-slate-200"
							/></span
						>
						<span class="min-w-0 flex-1 text-sm {WORDS}"
							><b class="block truncate font-medium text-slate-900"
								>{me.name.replace('Capt. ', '')}</b
							><span class="text-xs text-slate-500">{me.role === 'admin' ? 'Admin' : 'Member'}</span
							></span
						>
						<span
							class="mr-2 icon-[mdi--unfold-more-horizontal] size-5 shrink-0 text-slate-400 {WORDS}"
						></span>
					</span>
				{/snippet}
			</Menu>
		</div>
	</div>
</div>
