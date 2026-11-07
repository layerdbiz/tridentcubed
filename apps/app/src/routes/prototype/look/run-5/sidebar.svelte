<script lang="ts">
	// PROTOTYPE (#161) run 5: the sidebar and phone menu: logo, the sections, Recent, and the user with settings at
	// the bottom. Run 11 (2026-10-26 19:22): no Home and no New project button; the floating bar's + adds things. Every icon sits in one centred column (note 16): the logo twice its old size,
	// the section icons half again bigger, filled (note 17; since run 11 the pages' own icons, the same as on the floating
	// bar). Signed in as Cezary,
	// Admin (note 19). `isCollapsed` fades the words, leaving the icons: the desktop sidebar keeps one layout at every
	// width and clips it, so the words slide out as it is dragged wider (2026-10-26 16:34). `onnavigate` runs after any
	// pick, so the phone drawer can close itself, even when the pick is the page already open. Run 12 (2026-11-07,
	// notes 14 to 16): Recent is the same list as the bell's notifications (recent-list.svelte), with round icons, and
	// fades out at its bottom before the profile; the section names and TRIDENT CUBED are bold.
	import Avatar from './avatar.svelte';
	import { DATASETS, FADE, NAV, personOf, type DatasetType } from './look.data';
	import type { LookState } from './look.state.svelte';
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

	const me = personOf('Capt. Cezary Poninski');
	// The one column every icon centres in.
	const COLUMN = 'flex w-14 shrink-0 justify-center';
	// Words never wrap while the sidebar narrows; folded to icons they fade out.
	const WORDS = $derived(
		`whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'pointer-events-none opacity-0' : ''}`
	);
	function go(id: string) {
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
			><img
				src="/logo-color.svg"
				alt="Trident Cubed"
				class="size-14"
			/></span
		>
		<span class="text-[15px] font-extrabold tracking-wide text-slate-900 {WORDS}"
			>TRIDENT CUBED</span
		>
	</button>
	<nav class="w-full space-y-0.5 px-3">
		{#each NAV as item (item.id)}
			{@const isOn = look.navSection === item.id}
			<button
				class="flex w-full items-center gap-1 overflow-hidden rounded-xl py-1.5 text-[15px] font-bold transition {isOn
					? 'bg-slate-900/[0.06] text-slate-900'
					: 'text-slate-600 hover:bg-slate-900/[0.04] hover:text-slate-900'}"
				title={item.label}
				aria-current={isOn ? 'page' : undefined}
				onclick={() => go(item.id)}
			>
				<span class={COLUMN}
					><span class="{item.icon} size-[30px] {isOn ? 'text-primary' : 'text-slate-400'}"
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
		<span class={COLUMN}
			><Avatar
				name={me.name}
				size={40}
				ring="ring-slate-200"
			/></span
		>
		<span class="min-w-0 flex-1 text-sm {WORDS}"
			><b class="block truncate font-medium text-slate-900">{me.name.replace('Capt. ', '')}</b><span
				class="text-xs text-slate-500">Admin</span
			></span
		>
		<button
			class="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-900/[0.05] hover:text-slate-700 {WORDS}"
			aria-label="Settings"
			title="Settings"
			onclick={() => look.say('Settings and profile open from here in V1.')}
			><span class="icon-[mdi--cog-outline] size-5"></span></button
		>
	</div>
</div>
