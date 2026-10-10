<script lang="ts">
	// PROTOTYPE (#161) Variant C, "Floating": glass navigation you can see behind. On the phone a floating pill
	// that hides while you scroll down and comes back when you scroll up ("breathable"); on desktop a floating rail.
	// Inside a project everything else gets out of the way: full screen, one panel at a time, icons as the stepper.
	import { fade, fly } from 'svelte/transition';
	import { NAV, PANELS, PANEL_STATUS, STATUS } from './look.data';
	import type { LookState } from './look.state.svelte';
	import NewProject from './new-project.svelte';
	import PanelInputs from './panel-inputs.svelte';
	import ProjectList from './project-list.svelte';
	import ReportPreview from './report-preview.svelte';

	let { look }: { look: LookState } = $props();

	let isBarHidden = $state(false);
	let lastY = 0;
	const index = $derived(
		Math.max(
			0,
			PANELS.findIndex((item) => item.id === look.panelId)
		)
	);
	const panel = $derived(PANELS[index]);

	function onscroll() {
		const y = window.scrollY;
		isBarHidden = y > lastY && y > 80;
		lastY = y;
	}

	function step(by: number) {
		look.panelId = PANELS[(index + by + PANELS.length) % PANELS.length].id;
	}
</script>

<svelte:window {onscroll} />

<div
	class="min-h-dvh bg-slate-50 bg-[radial-gradient(60rem_40rem_at_10%_-10%,color-mix(in_oklch,var(--color-primary)_14%,white),transparent),radial-gradient(40rem_30rem_at_100%_20%,#e0f2fe,transparent)]"
>
	{#if look.screen === 'dashboard'}
		<!-- Desktop floating rail -->
		<nav
			class="fixed top-4 bottom-4 left-4 z-40 hidden w-16 flex-col items-center gap-2 rounded-[28px] border border-white/60 bg-white/60 py-4 shadow-xl shadow-slate-900/5 backdrop-blur-xl md:flex"
			transition:fly={{ x: -90, duration: 220 }}
		>
			<img
				src="/logo-color.svg"
				alt="Trident Cubed"
				class="mb-3 size-9"
			/>
			{#each NAV as item (item.id)}
				{@const isOn = look.navSection === item.id}
				<button
					class="group relative flex size-11 items-center justify-center rounded-2xl transition {isOn
						? 'bg-primary text-white shadow-lg shadow-primary/30'
						: 'text-slate-500 hover:bg-white'}"
					aria-label={item.label}
					onclick={() => (look.navSection = item.id)}
				>
					<span class="{isOn ? item.active : item.icon} size-6"></span>
					<span
						class="pointer-events-none absolute left-14 rounded-lg bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition group-hover:opacity-100"
						>{item.label}</span
					>
				</button>
			{/each}
			<button
				class="mt-2 flex size-11 items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 text-primary"
				aria-label="New project"
				onclick={() => (look.isNewOpen = true)}
				><span class="icon-[mdi--plus] size-6"></span></button
			>
			<span
				class="mt-auto flex size-10 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
				>AR</span
			>
		</nav>

		<main class="mx-auto max-w-6xl px-4 pt-14 pb-32 md:pt-12 md:pr-10 md:pl-28">
			<div class="mb-6 flex items-center gap-3 md:hidden">
				<img
					src="/logo-color.svg"
					alt=""
					class="size-9"
				/>
				<p class="flex-1 text-lg font-semibold text-slate-900">Good morning</p>
				<span
					class="flex size-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
					>AR</span
				>
			</div>
			<ProjectList {look} />
		</main>

		<!-- Phone floating pill + separate round + -->
		<div
			class="fixed inset-x-0 bottom-5 z-40 flex items-center justify-center gap-3 transition-transform duration-300 md:hidden {isBarHidden
				? 'translate-y-28'
				: ''}"
		>
			<nav
				class="flex items-center gap-1 rounded-full border border-white/60 bg-white/60 p-1.5 shadow-xl shadow-slate-900/10 backdrop-blur-xl"
			>
				{#each [...NAV.slice(0, 3), { id: 'me', label: 'Me', icon: 'icon-[mdi--account-outline]', active: 'icon-[mdi--account]' }] as item (item.id)}
					{@const isOn = look.navSection === item.id}
					<button
						class="flex h-11 items-center gap-1.5 rounded-full px-3.5 transition-all {isOn
							? 'bg-slate-900 text-white'
							: 'text-slate-500'}"
						aria-label={item.label}
						onclick={() => (look.navSection = item.id)}
					>
						<span class="{isOn ? item.active : item.icon} size-6"></span>
						{#if isOn}<span
								class="text-sm font-medium"
								in:fade={{ duration: 150 }}>{item.label}</span
							>{/if}
					</button>
				{/each}
			</nav>
			<button
				class="flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/40"
				aria-label="New project"
				onclick={() => (look.isNewOpen = true)}
				><span class="icon-[mdi--plus] size-7"></span></button
			>
		</div>
	{:else}
		<!-- Workspace: full screen, floating toolbar -->
		<div
			class="fixed inset-x-0 top-12 z-40 flex justify-center px-3 md:top-4"
			in:fly={{ y: -20, duration: 220 }}
		>
			<div
				class="flex w-full max-w-3xl items-center gap-2 rounded-full border border-white/60 bg-white/70 p-1.5 shadow-xl shadow-slate-900/5 backdrop-blur-xl"
			>
				<button
					class="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white"
					aria-label="Back"
					onclick={() => look.home()}><span class="icon-[mdi--arrow-left] size-5"></span></button
				>
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-semibold text-slate-900">{look.project.title}</p>
					<p class="truncate text-[11px] {STATUS[look.project.status].tone}">
						{look.project.status}
					</p>
				</div>
				<div class="flex rounded-full bg-slate-900/5 p-1 text-sm">
					<button
						class="flex items-center gap-1 rounded-full px-3 py-1.5 {look.tab === 'edit'
							? 'bg-slate-900 text-white'
							: 'text-slate-500'}"
						onclick={() => (look.tab = 'edit')}
						><span class="icon-[mdi--pencil-outline] size-4"></span><span class="hidden sm:inline"
							>Edit</span
						></button
					>
					<button
						class="flex items-center gap-1 rounded-full px-3 py-1.5 {look.tab === 'preview'
							? 'bg-slate-900 text-white'
							: 'text-slate-500'}"
						onclick={() => (look.tab = 'preview')}
						><span class="icon-[mdi--file-eye-outline] size-4"></span><span class="hidden sm:inline"
							>Preview</span
						></button
					>
				</div>
			</div>
		</div>

		{#if look.tab === 'edit'}
			<main class="mx-auto max-w-3xl px-4 pt-32 pb-28 md:pt-24">
				<!-- Icons are the stepper: one per panel, ring shows its status -->
				<div
					class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 md:mx-0 md:flex-wrap md:justify-center md:px-0"
				>
					{#each PANELS as item (item.id)}
						{@const isOn = look.panelId === item.id}
						<button
							class="relative flex size-12 shrink-0 items-center justify-center rounded-2xl transition {isOn
								? 'bg-primary text-white shadow-lg shadow-primary/30'
								: 'bg-white/70 text-slate-500 ring-1 ring-slate-200 hover:bg-white'}"
							title={item.name}
							aria-label={item.name}
							onclick={() => (look.panelId = item.id)}
						>
							<span class="{item.icon} size-6"></span>
							<span
								class="absolute -right-1 -bottom-1 rounded-full bg-white {PANEL_STATUS[item.status]
									.icon} size-4 {PANEL_STATUS[item.status].tone}"
							></span>
						</button>
					{/each}
				</div>
				{#key panel.id}
					<div
						class="mt-4 rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur"
						in:fly={{ x: 30, duration: 220 }}
					>
						<PanelInputs {panel} />
					</div>
				{/key}
				<div class="mt-4 flex justify-between">
					<button
						class="flex items-center gap-1 rounded-full px-4 py-2 text-sm text-slate-500 hover:bg-white"
						onclick={() => step(-1)}
						><span class="icon-[mdi--chevron-left] size-5"></span>{PANELS[
							(index - 1 + PANELS.length) % PANELS.length
						].name}</button
					>
					<button
						class="flex items-center gap-1 rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
						onclick={() => step(1)}
						>{PANELS[(index + 1) % PANELS.length].name}<span
							class="icon-[mdi--chevron-right] size-5"
						></span></button
					>
				</div>
			</main>
		{:else}
			<main class="h-dvh pt-28 md:pt-20"><ReportPreview {look} /></main>
		{/if}
	{/if}

	<NewProject {look} />
</div>
