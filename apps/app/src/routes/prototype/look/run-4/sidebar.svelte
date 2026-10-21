<script lang="ts">
	// PROTOTYPE (#161): B's desktop sidebar, which Justin liked whole: logo, New project, the sections, Recent, and the
	// user with settings at the bottom. Run 3 tries three answers for the Recent icons:
	// 'logos' (D) the client's logo; 'activity' (E) what happened, with a logo, a face or a project mark;
	// 'rings' (F) the client's logo inside the project's progress ring.
	// `isCollapsed` folds it to an icon rail, for the inside of a project. `onnavigate` runs after any pick, so the
	// phone drawer can close itself, even when the pick is the page already open.
	import ClientLogo from './client-logo.svelte';
	import { NAV, personOf, RECENT } from './look.data';
	import type { LookState } from './look.state.svelte';
	import ProgressRing from './progress-ring.svelte';

	let {
		look,
		recent = 'logos',
		isCollapsed = false,
		onnavigate
	}: {
		look: LookState;
		recent?: 'logos' | 'activity' | 'rings';
		isCollapsed?: boolean;
		onnavigate?: () => void;
	} = $props();

	// Look G signs in as Justin, the one super admin.
	const me = personOf('Justin ONeill');
	const projects = $derived(
		look.projects.filter((project) => project.status !== 'Archived').slice(0, 7)
	);

	function go(id: string) {
		if (look.screen === 'workspace') look.home();
		look.navSection = id;
		if (id === 'projects') look.pick('projects');
		onnavigate?.();
	}

	function openProject(id: string) {
		look.open(id);
		onnavigate?.();
	}
</script>

<div class="flex h-full flex-col {isCollapsed ? 'items-center' : ''}">
	<button
		class="flex items-center gap-2 pt-5 pb-4 {isCollapsed ? 'justify-center' : 'px-4'}"
		onclick={() => go('dashboard')}
	>
		<img
			src="/logo-color.svg"
			alt="Trident Cubed"
			class="size-8"
		/>
		{#if !isCollapsed}<span class="text-sm font-bold tracking-wide text-slate-900"
				>TRIDENT CUBED</span
			>{/if}
	</button>
	<div class={isCollapsed ? '' : 'w-full px-3'}>
		<button
			class="flex items-center gap-2 rounded-2xl bg-white text-sm font-medium text-slate-800 shadow-[0_1px_2px_rgb(15_23_42/0.05),0_8px_20px_-14px_rgb(15_23_42/0.35)] transition hover:text-primary {isCollapsed
				? 'size-11 justify-center'
				: 'w-full px-3 py-2.5'}"
			title="New project"
			onclick={() => {
				look.isNewOpen = true;
				onnavigate?.();
			}}
		>
			<span class="icon-[mdi--square-edit-outline] size-5 text-primary"></span>
			{#if !isCollapsed}New project{/if}
		</button>
	</div>
	<nav class="mt-4 space-y-0.5 {isCollapsed ? '' : 'w-full px-3'}">
		{#each NAV as item (item.id)}
			{@const isOn =
				look.screen === 'workspace' ? item.id === 'projects' : look.navSection === item.id}
			<button
				class="flex items-center rounded-xl text-sm transition {isCollapsed
					? 'size-11 justify-center'
					: 'w-full gap-3 px-3 py-2'} {isOn
					? 'bg-slate-900/[0.06] font-medium text-slate-900'
					: 'text-slate-500 hover:bg-slate-900/[0.04] hover:text-slate-800'}"
				title={item.label}
				aria-current={isOn ? 'page' : undefined}
				onclick={() => go(item.id)}
			>
				<span class="{isOn ? item.active : item.icon} size-5 {isOn ? 'text-primary' : ''}"></span>
				{#if !isCollapsed}{item.label}{/if}
			</button>
		{/each}
	</nav>

	{#if isCollapsed}
		<div class="flex-1"></div>
	{:else}
		<p class="mt-6 px-6 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
			{recent === 'activity' ? 'Recent activity' : 'Recent'}
		</p>
		<div class="mt-1 w-full flex-1 space-y-0.5 overflow-y-auto px-3">
			{#if recent === 'activity'}
				{#each RECENT as item (item.name)}
					<button
						class="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-slate-900/[0.04]"
						onclick={() => item.id && openProject(item.id)}
					>
						<span class="relative shrink-0">
							{#if item.kind === 'person'}
								<img
									src={personOf(item.name).photo}
									alt=""
									class="size-8 rounded-full object-cover"
								/>
							{:else if item.kind === 'client'}
								<ClientLogo
									name={item.name}
									size={32}
								/>
							{:else}
								<span
									class="flex size-8 items-center justify-center rounded-[30%] bg-primary/10 text-primary"
									><span class="icon-[mdi--briefcase-variant-outline] size-[18px]"></span></span
								>
							{/if}
							<span
								class="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-white text-slate-600 shadow ring-1 ring-white"
								><span
									class="{item.kind === 'person'
										? 'icon-[mdi--account-plus]'
										: item.kind === 'client'
											? 'icon-[mdi--domain-plus]'
											: 'icon-[mdi--pencil]'} size-2.5"
								></span></span
							>
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm text-slate-700">{item.name}</span>
							<span class="block truncate text-[11px] text-slate-400">{item.note}</span>
						</span>
					</button>
				{/each}
			{:else}
				{#each projects as project (project.id)}
					<button
						class="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-900/[0.04]"
						onclick={() => openProject(project.id)}
					>
						{#if recent === 'rings'}
							<ProgressRing
								percent={look.progressOf(project)}
								size={34}
								stroke={3}
							>
								<span class="relative"
									><ClientLogo
										name={project.client}
										size={22}
										shape="circle"
									/></span
								>
							</ProgressRing>
						{:else}
							<ClientLogo
								name={project.client}
								size={28}
							/>
						{/if}
						<span class="min-w-0 flex-1 truncate">{project.title}</span>
						<span class="text-[11px] text-slate-400 tabular-nums">{look.progressOf(project)}%</span>
					</button>
				{/each}
			{/if}
		</div>
	{/if}

	<div class="flex items-center gap-3 p-4 {isCollapsed ? 'flex-col' : 'w-full'}">
		<img
			src={me.photo}
			alt={me.name}
			class="size-9 rounded-full object-cover"
		/>
		{#if !isCollapsed}
			<span class="min-w-0 flex-1 text-sm"
				><b class="block truncate font-medium text-slate-900">{me.name}</b><span
					class="text-xs text-slate-500">Super admin</span
				></span
			>
		{/if}
		<button
			class="flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-900/[0.05] hover:text-slate-700"
			aria-label="Settings"
			title="Settings"
			onclick={() => look.say('Settings and profile open from here in V1.')}
			><span class="icon-[mdi--cog-outline] size-5"></span></button
		>
	</div>
</div>
