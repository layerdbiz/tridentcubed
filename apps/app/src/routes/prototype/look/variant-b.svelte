<script lang="ts">
	// PROTOTYPE (#161) Variant B, "AI app": a ChatGPT-style sidebar. On the Dashboard it holds the navigation and recent
	// projects; inside a project the same sidebar turns into the panels, and the live preview fills the right.
	// Phone: no permanent bar; a menu button opens the sidebar as a drawer, and a project swipes between Panels and Preview.
	import { fly } from 'svelte/transition';
	import { NAV, PANELS, PANEL_STATUS, PROJECTS, STATUS } from './look.data';
	import type { LookState } from './look.state.svelte';
	import NewProject from './new-project.svelte';
	import PanelInputs from './panel-inputs.svelte';
	import ProjectList from './project-list.svelte';
	import ReportPreview from './report-preview.svelte';

	let { look }: { look: LookState } = $props();

	let isDrawerOpen = $state(false);
	let swiper: HTMLDivElement | undefined = $state();

	function show(tab: 'edit' | 'preview') {
		look.tab = tab;
		swiper?.scrollTo({ left: tab === 'edit' ? 0 : swiper.clientWidth, behavior: 'smooth' });
	}

	function onswipe() {
		if (!swiper) return;
		look.tab = swiper.scrollLeft > swiper.clientWidth / 2 ? 'preview' : 'edit';
	}

	// Land on the Preview pane when the URL asks for it.
	$effect(() => {
		if (swiper && look.tab === 'preview' && swiper.scrollLeft === 0)
			swiper.scrollLeft = swiper.clientWidth;
	});

	function openProject(id: string) {
		look.open(id);
		isDrawerOpen = false;
	}
</script>

{#snippet sidebar()}
	{#if look.screen === 'dashboard'}
		<div
			class="flex h-full flex-col"
			in:fly={{ x: -24, duration: 220 }}
		>
			<div class="flex items-center gap-2 px-4 pt-5 pb-4">
				<img
					src="/logo-color.svg"
					alt=""
					class="size-8"
				/>
				<span class="text-sm font-bold tracking-wide text-slate-900">TRIDENT CUBED</span>
			</div>
			<div class="px-3">
				<button
					class="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:border-primary/40"
					onclick={() => (look.isNewOpen = true)}
				>
					<span class="icon-[mdi--square-edit-outline] size-5 text-primary"></span> New project
				</button>
			</div>
			<nav class="mt-4 space-y-0.5 px-3">
				{#each NAV as item (item.id)}
					{@const isOn = look.navSection === item.id}
					<button
						class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition {isOn
							? 'bg-slate-200/70 font-medium text-slate-900'
							: 'text-slate-600 hover:bg-slate-100'}"
						onclick={() => (look.navSection = item.id)}
					>
						<span class="{isOn ? item.active : item.icon} size-5"></span>{item.label}
					</button>
				{/each}
			</nav>
			<p class="mt-6 px-6 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
				Recent
			</p>
			<div class="mt-1 flex-1 space-y-0.5 overflow-y-auto px-3">
				{#each PROJECTS.slice(0, 6) as project (project.id)}
					<button
						class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
						onclick={() => openProject(project.id)}
					>
						<span class="size-2 shrink-0 rounded-full {STATUS[project.status].dot}"></span>
						<span class="truncate">{project.title}</span>
					</button>
				{/each}
			</div>
			<div class="flex items-center gap-3 border-t border-slate-200 p-4">
				<span
					class="flex size-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
					>AR</span
				>
				<span class="text-sm"
					><b class="block font-medium text-slate-900">A. Rivera</b><span
						class="text-xs text-slate-500">Admin</span
					></span
				>
				<span class="ml-auto icon-[mdi--cog-outline] size-5 text-slate-400"></span>
			</div>
		</div>
	{:else}
		<!-- Same sidebar, now the panels -->
		<div
			class="flex h-full flex-col"
			in:fly={{ x: 24, duration: 220 }}
		>
			<button
				class="flex items-center gap-2 px-4 pt-5 pb-3 text-sm text-slate-500 hover:text-slate-900"
				onclick={() => look.home()}
			>
				<span class="icon-[mdi--arrow-left] size-5"></span> All projects
			</button>
			<div class="px-4 pb-4">
				<p class="font-semibold text-slate-900">{look.project.title}</p>
				<p class="flex items-center gap-1 text-xs {STATUS[look.project.status].tone}">
					<span class="{STATUS[look.project.status].icon} size-3.5"></span>{look.project.status}
				</p>
			</div>
			<div class="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
				{#each PANELS as item (item.id)}
					{@const isOn = look.panelId === item.id}
					<div
						class="rounded-2xl transition {isOn ? 'bg-white shadow-sm ring-1 ring-slate-200' : ''}"
					>
						<button
							class="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm {isOn
								? 'font-medium text-slate-900'
								: 'text-slate-600 hover:bg-slate-100'}"
							onclick={() => (look.panelId = isOn ? '' : item.id)}
						>
							<span class="{item.icon} size-5 {isOn ? 'text-primary' : 'text-slate-400'}"></span>
							<span class="flex-1">{item.name}</span>
							<span class="{PANEL_STATUS[item.status].icon} size-4 {PANEL_STATUS[item.status].tone}"
							></span>
						</button>
						{#if isOn}
							<div
								class="px-3 pt-1 pb-4"
								in:fly={{ y: -6, duration: 180 }}
							>
								<PanelInputs
									panel={item}
									isCompact
								/>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
{/snippet}

<div class="min-h-dvh bg-white">
	<!-- Desktop sidebar -->
	<aside
		class="fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 bg-slate-50 transition-[width] duration-[220ms] md:block {look.screen ===
		'workspace'
			? 'w-[380px]'
			: 'w-72'}"
	>
		{@render sidebar()}
	</aside>

	<!-- Phone drawer -->
	{#if isDrawerOpen}
		<div
			class="fixed inset-0 z-50 bg-slate-900/30 md:hidden"
			role="presentation"
			onclick={() => (isDrawerOpen = false)}
		></div>
		<aside
			class="fixed inset-y-0 left-0 z-50 w-[85%] max-w-xs bg-slate-50 shadow-2xl md:hidden"
			transition:fly={{ x: -320, duration: 220 }}
		>
			{@render sidebar()}
		</aside>
	{/if}

	<main
		class="transition-[padding] duration-[220ms] {look.screen === 'workspace'
			? 'md:pl-[380px]'
			: 'md:pl-72'}"
	>
		<!-- Phone top bar: the only chrome -->
		<header
			class="sticky top-0 z-30 flex items-center gap-2 bg-white/90 px-3 pt-12 pb-2 backdrop-blur md:hidden"
		>
			{#if look.screen === 'dashboard'}
				<button
					class="flex size-10 items-center justify-center rounded-full hover:bg-slate-100"
					aria-label="Open menu"
					onclick={() => (isDrawerOpen = true)}
					><span class="icon-[mdi--menu] size-6"></span></button
				>
				<p class="flex-1 text-center font-semibold text-slate-900">Dashboard</p>
				<button
					class="flex size-10 items-center justify-center rounded-full hover:bg-slate-100"
					aria-label="New project"
					onclick={() => (look.isNewOpen = true)}
					><span class="icon-[mdi--square-edit-outline] size-6"></span></button
				>
			{:else}
				<button
					class="flex size-10 items-center justify-center rounded-full hover:bg-slate-100"
					aria-label="Back"
					onclick={() => look.home()}><span class="icon-[mdi--arrow-left] size-6"></span></button
				>
				<p class="min-w-0 flex-1 truncate text-center font-semibold text-slate-900">
					{look.project.title}
				</p>
				<button
					class="flex size-10 items-center justify-center rounded-full hover:bg-slate-100"
					aria-label="Open menu"
					onclick={() => (isDrawerOpen = true)}
					><span class="icon-[mdi--dots-horizontal] size-6"></span></button
				>
			{/if}
		</header>

		{#if look.screen === 'dashboard'}
			<div class="mx-auto max-w-5xl px-4 pt-4 pb-16 md:px-10 md:pt-14">
				<ProjectList {look} />
			</div>
		{:else}
			<!-- Desktop: live preview on the right, highlighting the page the open panel feeds -->
			<div class="hidden h-dvh md:block">
				<ReportPreview
					{look}
					highlight={look.panelId}
				/>
			</div>
			<!-- Phone: swipe between Panels and Preview -->
			<div class="md:hidden">
				<div class="sticky top-[100px] z-20 flex justify-center bg-white pb-2">
					<div class="flex rounded-full bg-slate-100 p-1 text-sm">
						<button
							class="rounded-full px-5 py-1.5 font-medium {look.tab === 'edit'
								? 'bg-white shadow'
								: 'text-slate-500'}"
							onclick={() => show('edit')}>Panels</button
						>
						<button
							class="rounded-full px-5 py-1.5 font-medium {look.tab === 'preview'
								? 'bg-white shadow'
								: 'text-slate-500'}"
							onclick={() => show('preview')}>Preview</button
						>
					</div>
				</div>
				<div
					bind:this={swiper}
					class="flex h-[calc(100dvh-148px)] snap-x snap-mandatory overflow-x-auto"
					onscroll={onswipe}
				>
					<div class="w-full shrink-0 snap-start overflow-y-auto px-4 pb-10">
						{#each PANELS as item (item.id)}
							{@const isOn = look.panelId === item.id}
							<div class="border-b border-slate-100">
								<button
									class="flex w-full items-center gap-3 py-3 text-left"
									onclick={() => (look.panelId = isOn ? '' : item.id)}
								>
									<span class="{item.icon} size-6 {isOn ? 'text-primary' : 'text-slate-400'}"
									></span>
									<span class="flex-1 font-medium text-slate-800">{item.name}</span>
									<span
										class="{PANEL_STATUS[item.status].icon} size-4 {PANEL_STATUS[item.status].tone}"
									></span>
								</button>
								{#if isOn}<div class="pb-5">
										<PanelInputs
											panel={item}
											isCompact
										/>
									</div>{/if}
							</div>
						{/each}
					</div>
					<div class="w-full shrink-0 snap-start">
						<ReportPreview
							{look}
							highlight={look.panelId}
						/>
					</div>
				</div>
			</div>
		{/if}
	</main>

	<NewProject {look} />
</div>
