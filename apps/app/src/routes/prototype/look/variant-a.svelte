<script lang="ts">
	// PROTOTYPE (#161) Variant A, "ScavengerBot": icon rail that expands for sub-pages on desktop,
	// fixed bottom bar with a raised + on the phone, Workspace as its own page with Edit / Preview tabs.
	import { NAV, PANELS, PANEL_STATUS, STATUS } from './look.data';
	import type { LookState } from './look.state.svelte';
	import NewProject from './new-project.svelte';
	import PanelInputs from './panel-inputs.svelte';
	import ProjectList from './project-list.svelte';
	import ReportPreview from './report-preview.svelte';

	let { look }: { look: LookState } = $props();

	const section = $derived(NAV.find((item) => item.id === look.navSection));
	const isExpanded = $derived(Boolean(section?.children) && look.screen === 'dashboard');
	const panel = $derived(PANELS.find((item) => item.id === look.panelId) ?? PANELS[0]);

	function go(id: string) {
		look.navSection = id;
		look.screen = 'dashboard';
	}
</script>

<div class="min-h-dvh bg-slate-50">
	<!-- Desktop rail: the same items as the phone bar -->
	<nav
		class="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-200 bg-white transition-[width] duration-[220ms] ease-in-out md:flex {isExpanded
			? 'w-60'
			: 'w-[88px]'}"
	>
		<button
			class="flex h-20 items-center justify-center gap-2"
			onclick={() => go('dashboard')}
		>
			<img
				src="/logo-color.svg"
				alt="Trident Cubed"
				class="transition-all duration-[220ms] {isExpanded ? 'size-10' : 'size-9'}"
			/>
			{#if isExpanded}<span class="text-sm font-bold tracking-wide text-slate-900"
					>TRIDENT CUBED</span
				>{/if}
		</button>
		<div class="flex-1 space-y-1 px-3">
			{#each NAV as item (item.id)}
				{@const isOn = look.navSection === item.id && look.screen === 'dashboard'}
				<div>
					<button
						class="flex w-full items-center rounded-2xl transition duration-[220ms] {isExpanded
							? 'gap-3 px-3 py-2.5'
							: 'flex-col gap-1 py-3'} {isOn
							? 'text-primary'
							: 'text-slate-400 hover:text-slate-700'}"
						aria-current={isOn ? 'page' : undefined}
						aria-expanded={item.children ? isOn : undefined}
						onclick={() => go(item.id)}
					>
						<span
							class="{isOn ? item.active : item.icon} size-7 transition {isOn
								? 'drop-shadow-[0_0_10px_color-mix(in_oklch,var(--color-primary)_55%,transparent)]'
								: ''}"
						></span>
						<span
							class={isExpanded
								? 'text-sm font-medium'
								: 'text-[10px] font-semibold tracking-wide uppercase'}>{item.label}</span
						>
					</button>
					{#if isExpanded && isOn && item.children}
						<div class="mt-1 mb-2 ml-12 space-y-1">
							{#each item.children as child, index (child)}
								<p
									class="cursor-pointer text-sm {index === 0
										? 'font-medium text-slate-900'
										: 'text-slate-500 hover:text-slate-900'}"
								>
									{child}
								</p>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
		<div class="space-y-3 p-3">
			<span
				class="mx-auto block w-fit rounded-lg border-2 border-amber-400 px-2 py-0.5 text-[11px] font-semibold text-amber-600"
				>dev</span
			>
			<button
				class="mx-auto flex size-10 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
				>AR</button
			>
		</div>
	</nav>

	<main
		class="pb-28 transition-[padding] duration-[220ms] ease-in-out md:pb-10 {isExpanded
			? 'md:pl-60'
			: 'md:pl-[88px]'}"
	>
		{#if look.screen === 'dashboard'}
			<div class="mx-auto max-w-6xl px-4 pt-14 md:px-10 md:pt-12">
				<div class="mb-6 flex items-center justify-between md:hidden">
					<img
						src="/logo-color.svg"
						alt="Trident Cubed"
						class="size-9"
					/>
					<span
						class="flex size-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
						>AR</span
					>
				</div>
				<ProjectList
					{look}
					title={section?.children ? section.children[0] : 'Projects'}
				/>
			</div>
		{:else}
			<!-- Workspace: its own page, full width on the phone -->
			<header class="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
				<div class="mx-auto flex max-w-6xl items-center gap-3 px-4 pt-12 pb-3 md:px-10 md:pt-4">
					<button
						class="flex size-9 items-center justify-center rounded-full hover:bg-slate-100"
						aria-label="Back to Dashboard"
						onclick={() => look.home()}
					>
						<span class="icon-[mdi--arrow-left] size-5"></span>
					</button>
					<div class="min-w-0 flex-1">
						<p class="truncate font-semibold text-slate-900">{look.project.title}</p>
						<p class="flex items-center gap-1 text-xs {STATUS[look.project.status].tone}">
							<span class="{STATUS[look.project.status].icon} size-3.5"></span>{look.project.status} ·
							<span class="text-slate-400">{look.project.number}</span>
						</p>
					</div>
					<div class="flex rounded-full bg-slate-100 p-1 text-sm">
						{#each ['edit', 'preview'] as const as tab (tab)}
							<button
								class="rounded-full px-4 py-1.5 font-medium capitalize transition {look.tab === tab
									? 'bg-white text-slate-900 shadow'
									: 'text-slate-500'}"
								onclick={() => (look.tab = tab)}>{tab}</button
							>
						{/each}
					</div>
				</div>
			</header>
			{#if look.tab === 'edit'}
				<div class="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[320px_1fr] md:px-10">
					<ul class="space-y-1">
						{#each PANELS as item (item.id)}
							{@const isOn = look.panelId === item.id}
							<li>
								<button
									class="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition {isOn
										? 'bg-primary text-white shadow-md shadow-primary/25'
										: 'hover:bg-white'}"
									onclick={() => (look.panelId = item.id)}
								>
									<span class="{item.icon} size-6 {isOn ? 'text-white' : 'text-slate-400'}"></span>
									<span class="flex-1 text-sm font-medium {isOn ? '' : 'text-slate-700'}"
										>{item.name}</span
									>
									<span
										class="{PANEL_STATUS[item.status].icon} size-4 {isOn
											? 'text-white/80'
											: PANEL_STATUS[item.status].tone}"
									></span>
								</button>
								{#if isOn}
									<div class="mt-2 mb-4 rounded-3xl border border-slate-200 bg-white p-5 md:hidden">
										<PanelInputs
											panel={item}
											isCompact
										/>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
					<div class="hidden self-start rounded-3xl border border-slate-200 bg-white p-6 md:block">
						<PanelInputs {panel} />
					</div>
				</div>
			{:else}
				<div class="h-[calc(100dvh-120px)] md:h-[calc(100dvh-73px)]"><ReportPreview {look} /></div>
			{/if}
		{/if}
	</main>

	<!-- Phone bar: same items, docked at the bottom; hidden inside a project (full width) -->
	{#if look.screen === 'dashboard'}
		<nav
			class="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 items-center border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
		>
			{#each [NAV[0], NAV[1]] as item (item.id)}
				{@const isOn = look.navSection === item.id}
				<button
					class="flex flex-col items-center gap-0.5 {isOn ? 'text-primary' : 'text-slate-400'}"
					onclick={() => go(item.id)}
				>
					<span class="{isOn ? item.active : item.icon} size-6"></span><span
						class="text-[10px] font-semibold uppercase">{item.label}</span
					>
				</button>
			{/each}
			<button
				class="mx-auto flex size-14 -translate-y-3 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40"
				aria-label="New project"
				onclick={() => (look.isNewOpen = true)}
			>
				<span class="icon-[mdi--plus] size-7"></span>
			</button>
			{#each [NAV[2], { id: 'me', label: 'Me', icon: 'icon-[mdi--account-outline]', active: 'icon-[mdi--account]' }] as item (item.id)}
				{@const isOn = look.navSection === item.id}
				<button
					class="flex flex-col items-center gap-0.5 {isOn ? 'text-primary' : 'text-slate-400'}"
					onclick={() => go(item.id)}
				>
					<span class="{isOn ? item.active : item.icon} size-6"></span><span
						class="text-[10px] font-semibold uppercase">{item.label}</span
					>
				</button>
			{/each}
		</nav>
	{/if}

	<NewProject {look} />
</div>
