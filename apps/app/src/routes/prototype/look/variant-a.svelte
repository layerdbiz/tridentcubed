<script lang="ts">
	// PROTOTYPE (#161) Variant A, "ScavengerBot rail": icon rail that expands for sub-pages on desktop, fixed bottom bar
	// with a raised + on the phone. Inside a project: the app prototype's layout, restyled. Desktop keeps the rail and
	// shows the panel cards beside the live preview; the phone switches between Edit and Preview.
	import { NAV, STATUS } from './look.data';
	import type { LookState } from './look.state.svelte';
	import NewProject from './new-project.svelte';
	import PanelList from './panel-list.svelte';
	import ProgressRing from './progress-ring.svelte';
	import ProjectList from './project-list.svelte';
	import ReportPreview from './report-preview.svelte';
	import SavedBadge from './saved-badge.svelte';

	let { look }: { look: LookState } = $props();

	const section = $derived(NAV.find((item) => item.id === look.navSection));
	const isExpanded = $derived(Boolean(section?.children) && look.screen === 'dashboard');
	const enabled = $derived(look.panels.filter((panel) => panel.isEnabled).length);

	function go(id: string) {
		if (look.screen === 'workspace') look.home();
		look.navSection = id;
	}
</script>

<div class="min-h-dvh bg-slate-50">
	<!-- Desktop rail: the same items as the phone bar; it stays, collapsed, inside a project -->
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
				{@const isOn =
					look.screen === 'dashboard' ? look.navSection === item.id : item.id === 'projects'}
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
		<div class="p-3">
			<img
				src="https://randomuser.me/api/portraits/women/52.jpg"
				alt="Riley Ford"
				class="mx-auto size-10 rounded-full object-cover ring-2 ring-white"
			/>
		</div>
	</nav>

	<main
		class="transition-[padding] duration-[220ms] ease-in-out {isExpanded
			? 'md:pl-60'
			: 'md:pl-[88px]'}"
	>
		{#if look.screen === 'dashboard'}
			<div class="mx-auto max-w-6xl px-4 pt-14 pb-28 md:px-10 md:pt-12 md:pb-10">
				<div class="mb-6 flex items-center justify-between md:hidden">
					<img
						src="/logo-color.svg"
						alt="Trident Cubed"
						class="size-9"
					/>
					<img
						src="https://randomuser.me/api/portraits/women/52.jpg"
						alt="Riley Ford"
						class="size-9 rounded-full object-cover"
					/>
				</div>
				<ProjectList
					{look}
					title={section?.children ? section.children[0] : 'Projects'}
				/>
			</div>
		{:else}
			<!-- Workspace header -->
			<header
				class="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 pt-12 pb-3 backdrop-blur md:px-6 md:pt-3"
			>
				<button
					class="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-slate-100"
					aria-label="Back to Dashboard"
					onclick={() => look.home()}
				>
					<span class="icon-[mdi--arrow-left] size-5"></span>
				</button>
				<div class="min-w-0 flex-1">
					<p class="truncate font-semibold text-slate-900">{look.project.title}</p>
					<p class="flex items-center gap-2 text-xs">
						<span class="flex items-center gap-1 {STATUS[look.project.status].tone}"
							><span class="{STATUS[look.project.status].icon} size-3.5"></span>{look.project
								.status}</span
						>
						<span class="text-slate-400">{look.project.number}</span>
						<SavedBadge {look} />
					</p>
				</div>
				<div class="md:hidden">
					<ProgressRing
						percent={look.overall}
						size={44}
						stroke={5}
					/>
				</div>
			</header>

			<!-- Phone: Edit / Preview switch, as in the app prototype -->
			<div
				class="sticky top-[105px] z-20 flex gap-2 bg-slate-50/90 px-4 py-3 backdrop-blur md:hidden"
			>
				{#each ['edit', 'preview'] as const as tab (tab)}
					<button
						class="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold capitalize transition {look.tab ===
						tab
							? 'bg-primary text-white shadow-lg shadow-primary/25'
							: 'bg-white text-slate-500 ring-1 ring-slate-200'}"
						onclick={() => (look.tab = tab)}
					>
						<span
							class="{tab === 'edit'
								? 'icon-[mdi--pencil-outline]'
								: 'icon-[mdi--file-eye-outline]'} size-4"
						></span>{tab}
					</button>
				{/each}
			</div>

			<div class="md:grid md:h-[calc(100dvh-65px)] md:grid-cols-[minmax(380px,460px)_1fr]">
				<section
					class="px-4 pt-2 pb-16 md:overflow-y-auto md:border-r md:border-slate-200 md:px-6 md:pt-6 {look.tab ===
					'edit'
						? ''
						: 'hidden md:block'}"
				>
					<div
						class="mb-6 hidden items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 md:flex"
					>
						<ProgressRing percent={look.overall} />
						<div class="min-w-0">
							<p class="text-2xl font-semibold tracking-tight text-slate-900">Edit</p>
							<p class="text-sm text-slate-500">
								{enabled} panels in the report{look.panels.length - enabled
									? `, ${look.panels.length - enabled} off`
									: ''}. Fill them in any order.
							</p>
						</div>
					</div>
					<PanelList {look} />
				</section>
				<section
					class="h-[calc(100dvh-170px)] md:h-full {look.tab === 'preview' ? '' : 'hidden md:block'}"
				>
					<ReportPreview
						{look}
						highlight={look.panelId}
					/>
				</section>
			</div>
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
