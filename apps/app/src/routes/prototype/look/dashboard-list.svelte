<script lang="ts">
	// PROTOTYPE (#161): the one list with three views (pages.md: "One list, three views"), now for whatever the count
	// tile counts: projects, clients, team or ports. Projects carry everything the app prototype's list shows.
	// Run 3: client logos lead each project, the owner's face sits on top, tables have no box around them and a black
	// rule under the headings, cards are compact with Delete before Open, and a status filter sits by the view icons.
	// `controls`: 'select' (D) view icons + a status dropdown; 'dropdowns' (E) both as dropdowns; 'popover' (F) view
	// icons + a filter button.
	import { flip } from 'svelte/animate';
	import ClientLogo from './client-logo.svelte';
	import Faces from './faces.svelte';
	import {
		BOARD_COLUMNS,
		CLIENTS,
		DATASETS,
		PEOPLE,
		personOf,
		ROLES,
		STATUS,
		type ProjectType,
		type StatusType
	} from './look.data';
	import type { LookState, ViewType } from './look.state.svelte';
	import Menu from './menu.svelte';

	let {
		look,
		controls = 'select'
	}: { look: LookState; controls?: 'select' | 'dropdowns' | 'popover' } = $props();

	const VIEWS = [
		{ id: 'table', label: 'Table', icon: 'icon-[mdi--table]' },
		{ id: 'cards', label: 'Cards', icon: 'icon-[mdi--view-grid-outline]' },
		{ id: 'board', label: 'Board', icon: 'icon-[mdi--view-column-outline]' }
	] as const;

	const views = $derived(
		VIEWS.filter((view) => view.id !== 'board' || look.dataset === 'projects')
	);
	const info = $derived(DATASETS[look.dataset]);
	const live = $derived(look.projects.filter((project) => project.status !== 'Archived'));
	const isOpen = (project: ProjectType) => !['Complete', 'Archived'].includes(project.status);

	const clients = $derived(
		CLIENTS.map((name) => {
			const theirs = look.projects.filter((project) => project.client === name);
			return {
				name,
				projects: theirs.length,
				open: theirs.filter(isOpen).length,
				people: [...new Set(theirs.flatMap((project) => project.team))],
				updated: theirs[0]?.updated ?? 'No projects yet'
			};
		})
	);
	const team = $derived(
		PEOPLE.map((person) => {
			const theirs = look.projects.filter((project) => project.team.includes(person.name));
			return {
				...person,
				role: ROLES[person.name] ?? 'Member',
				projects: theirs.length,
				open: theirs.filter(isOpen).length,
				owns: theirs.filter((project) => project.team[0] === person.name).length,
				clients: [...new Set(theirs.map((project) => project.client))]
			};
		})
	);
	const ports = $derived(
		[...new Set(look.projects.map((project) => project.facility))].map((name) => {
			const theirs = look.projects.filter((project) => project.facility === name);
			return {
				name,
				projects: theirs.length,
				open: theirs.filter(isOpen).length,
				clients: [...new Set(theirs.map((project) => project.client))]
			};
		})
	);

	const shownClients = $derived(
		clients.filter((item) =>
			look.filter === 'Active' ? item.open > 0 : look.filter === 'Quiet' ? item.open === 0 : true
		)
	);
	const shownTeam = $derived(
		team.filter((item) =>
			look.filter === 'Admins'
				? item.role === 'Admin'
				: look.filter === 'Members'
					? item.role !== 'Admin'
					: true
		)
	);
	const shownPorts = $derived(
		ports.filter((item) =>
			look.filter === 'Busy' ? item.open > 0 : look.filter === 'Quiet' ? item.open === 0 : true
		)
	);
	const total = $derived(
		look.dataset === 'projects'
			? look.visible.length
			: look.dataset === 'clients'
				? shownClients.length
				: look.dataset === 'team'
					? shownTeam.length
					: shownPorts.length
	);

	function countOf(filter: string) {
		if (look.dataset === 'projects')
			return filter === 'All'
				? look.projects.length
				: look.projects.filter((project) => project.status === filter).length;
		const list = look.dataset === 'clients' ? clients : look.dataset === 'ports' ? ports : [];
		if (look.dataset === 'team')
			return filter === 'All'
				? team.length
				: team.filter((item) => (filter === 'Admins') === (item.role === 'Admin')).length;
		return filter === 'All'
			? list.length
			: list.filter((item) => (filter === 'Quiet' ? item.open === 0 : item.open > 0)).length;
	}

	const filterOptions = $derived(
		info.filters.map((id) => ({
			id,
			label: id === 'All' ? `All ${info.label.toLowerCase()}` : id,
			dot: id in STATUS ? STATUS[id as StatusType].dot : id === 'All' ? undefined : 'bg-primary',
			count: countOf(id)
		}))
	);

	function isArchived(project: ProjectType) {
		return project.status === 'Archived';
	}

	const soft = 'bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04),0_10px_24px_-18px_rgb(15_23_42/0.3)]';
</script>

{#snippet bar(project: ProjectType, isWide = false)}
	{@const progress = look.progressOf(project)}
	<span class="flex items-center gap-2 {isWide ? 'w-full' : 'w-36'}">
		<span class="h-2 flex-1 overflow-hidden rounded-full bg-slate-900/[0.06]">
			<span
				class="block h-full rounded-full transition-[width] duration-500 {isArchived(project)
					? 'bg-slate-400'
					: progress >= 100
						? 'bg-success'
						: 'bg-primary'}"
				style="width: {progress}%"
			></span>
		</span>
		<span class="w-9 text-right text-xs font-semibold text-slate-600 tabular-nums">{progress}%</span
		>
	</span>
{/snippet}

{#snippet pill(status: StatusType)}
	<span
		class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap {STATUS[
			status
		].pill}"><span class="{STATUS[status].icon} size-3.5"></span>{status}</span
	>
{/snippet}

{#snippet viewIcons()}
	<div
		class="flex rounded-full p-1 {soft}"
		role="radiogroup"
		aria-label="View"
	>
		{#each views as view (view.id)}
			<button
				type="button"
				class="flex size-8 items-center justify-center rounded-full transition {look.view ===
				view.id
					? 'bg-slate-900 text-white'
					: 'text-slate-400 hover:text-slate-700'}"
				title={view.label}
				role="radio"
				aria-label={view.label}
				aria-checked={look.view === view.id}
				onclick={() => (look.view = view.id)}><span class="{view.icon} size-5"></span></button
			>
		{/each}
	</div>
{/snippet}

{#snippet logoStack(names: string[])}
	<span class="flex items-center">
		{#each names.slice(0, 4) as name, index (name)}
			<span
				class="relative rounded-[30%] ring-2 ring-white"
				style="z-index: {10 - index}; margin-left: {index ? -8 : 0}px"
				><ClientLogo
					{name}
					size={26}
				/></span
			>
		{/each}
	</span>
{/snippet}

<!-- List header: title, then the view and status controls side by side -->
<div class="mb-4 flex items-center justify-between gap-2">
	<h2 class="min-w-0 truncate text-xl font-semibold text-slate-900 md:text-2xl">
		{info.label}
		<span class="ml-1 align-middle text-sm font-medium text-slate-400 tabular-nums">{total}</span>
	</h2>
	<div class="flex shrink-0 items-center gap-2">
		{#if controls === 'dropdowns'}
			<Menu
				label="View"
				value={look.view}
				options={views.map((view) => ({ id: view.id, label: view.label, icon: view.icon }))}
				onpick={(id) => (look.view = id as ViewType)}
			>
				{#snippet trigger(current)}
					<span
						class="flex h-10 items-center gap-1.5 rounded-full pr-2.5 pl-3 text-sm font-medium text-slate-700 {soft}"
					>
						<span class="{current?.icon} size-[18px] text-slate-900"></span>
						<span class="hidden sm:inline">{current?.label}</span>
						<span class="icon-[mdi--chevron-down] size-4 text-slate-400"></span>
					</span>
				{/snippet}
			</Menu>
			<Menu
				label="Status"
				value={look.filter}
				options={filterOptions}
				onpick={(id) => (look.filter = id)}
			>
				{#snippet trigger(current)}
					<span
						class="flex h-10 items-center gap-1.5 rounded-full pr-2.5 pl-3 text-sm font-medium text-slate-700 {soft}"
					>
						{#if current?.dot}<span class="size-2.5 rounded-full {current.dot}"></span>{:else}<span
								class="icon-[mdi--filter-variant] size-[18px] text-slate-400"
							></span>{/if}
						{current?.id === 'All' ? 'All' : current?.label}
						<span class="icon-[mdi--chevron-down] size-4 text-slate-400"></span>
					</span>
				{/snippet}
			</Menu>
		{:else if controls === 'popover'}
			{@render viewIcons()}
			<Menu
				label="Filter by status"
				value={look.filter}
				options={filterOptions}
				onpick={(id) => (look.filter = id)}
			>
				{#snippet trigger()}
					<span
						class="relative flex size-10 items-center justify-center rounded-full {look.filter ===
						'All'
							? `${soft} text-slate-500`
							: 'bg-slate-900 text-white'}"
					>
						<span class="icon-[mdi--filter-variant] size-5"></span>
						{#if look.filter !== 'All'}
							<span
								class="absolute -top-0.5 -right-0.5 size-3 rounded-full ring-2 ring-white {filterOptions.find(
									(option) => option.id === look.filter
								)?.dot}"
							></span>
						{/if}
					</span>
				{/snippet}
			</Menu>
		{:else}
			{@render viewIcons()}
			<label
				class="relative flex h-10 items-center rounded-full pr-8 pl-3 text-sm font-medium {soft}"
			>
				<span class="sr-only">Status</span>
				<span class="mr-1.5 icon-[mdi--filter-variant] size-4 text-slate-400"></span>
				<select
					class="cursor-pointer appearance-none bg-transparent text-slate-800 outline-none"
					bind:value={look.filter}
				>
					{#each info.filters as filter (filter)}<option value={filter}>{filter}</option>{/each}
				</select>
				<span
					class="pointer-events-none absolute right-2.5 icon-[mdi--chevron-down] size-4 text-slate-400"
				></span>
			</label>
		{/if}
		<button
			class="hidden items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-primary/25 hover:brightness-110 lg:flex"
			onclick={() => (look.isNewOpen = true)}
		>
			<span class="icon-[mdi--plus] size-5"></span> New project
		</button>
	</div>
</div>

{#if total === 0}
	<div class="flex flex-col items-center gap-2 rounded-3xl py-16 text-slate-400 {soft}">
		<span class="icon-[mdi--sail-boat] size-14"></span>
		<p class="font-medium">Calm waters. Nothing here yet.</p>
	</div>
{:else if look.dataset === 'projects'}
	{#if look.view === 'table'}
		<!-- Desktop table: open, no box, black rule under the headings -->
		<table class="hidden w-full text-sm md:table">
			<thead
				class="border-b-2 border-slate-900 text-left text-[11px] tracking-wide text-slate-500 uppercase"
			>
				<tr>
					<th class="w-14 py-3 pl-2"></th>
					<th class="py-3">Project</th>
					<th class="py-3">Client</th>
					<th class="py-3">Team</th>
					<th class="py-3">Status</th>
					<th class="py-3">Progress</th>
					<th class="py-3">Updated</th>
					<th class="py-3 pr-2 text-right">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each look.visible as project (project.id)}
					<tr
						class="group border-b border-slate-900/[0.06] transition {isArchived(project)
							? 'text-slate-400'
							: 'hover:bg-white/80'}"
						animate:flip={{ duration: 200 }}
					>
						<td class="py-3 pl-2"
							><ClientLogo
								name={project.client}
								size={36}
								isMuted={isArchived(project)}
							/></td
						>
						<td class="py-3">
							<button
								class="text-left"
								onclick={() => look.open(project.id)}
							>
								<span
									class="block font-medium hover:text-primary {isArchived(project)
										? 'text-slate-500'
										: 'text-slate-900'}">{project.title}</span
								>
								<span class="text-xs text-slate-400">{project.number} · {project.type}</span>
							</button>
						</td>
						<td class="py-3 {isArchived(project) ? '' : 'text-slate-600'}">{project.client}</td>
						<td class="py-3"
							><Faces
								names={project.team}
								size={30}
								isMuted={isArchived(project)}
							/></td
						>
						<td class="py-3">{@render pill(project.status)}</td>
						<td class="py-3">{@render bar(project)}</td>
						<td class="py-3 text-xs text-slate-400">{project.updated}</td>
						<td class="py-3 pr-2">
							<span class="flex items-center justify-end gap-1.5">
								<button
									class="flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-danger/10 hover:text-danger"
									aria-label="Delete {project.title}"
									title="Delete (moves to Trash)"
									onclick={() => look.remove(project.id)}
									><span class="icon-[mdi--trash-can-outline] size-5"></span></button
								>
								<button
									class="rounded-full px-4 py-1.5 text-xs font-semibold text-white {isArchived(
										project
									)
										? 'bg-slate-400'
										: 'bg-primary hover:brightness-110'}"
									onclick={() => look.open(project.id)}>Open</button
								>
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<!-- Phone rows: client logo first, two lines, faces, then the bar; each row stands on its own -->
		<ul class="space-y-2 md:hidden">
			{#each look.visible as project (project.id)}
				<li animate:flip={{ duration: 200 }}>
					<button
						class="flex w-full items-center gap-3 rounded-3xl p-3 text-left active:scale-[0.99] {soft} {isArchived(
							project
						)
							? 'opacity-60'
							: ''}"
						onclick={() => look.open(project.id)}
					>
						<ClientLogo
							name={project.client}
							size={44}
							isMuted={isArchived(project)}
						/>
						<span class="min-w-0 flex-1 space-y-1.5">
							<span class="flex items-center justify-between gap-2">
								<span class="truncate font-medium text-slate-900">{project.title}</span>
								<Faces
									names={project.team}
									size={22}
									max={3}
									isMuted={isArchived(project)}
								/>
							</span>
							<span class="flex items-center gap-1.5 text-xs text-slate-500">
								<span class="truncate">{project.client}</span>
								<span class="size-1.5 shrink-0 rounded-full {STATUS[project.status].dot}"></span>
								<span class="shrink-0 {STATUS[project.status].tone}">{project.status}</span>
							</span>
							{@render bar(project, true)}
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{:else if look.view === 'cards'}
		<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
			{#each look.visible as project (project.id)}
				<article
					class="flex flex-col gap-3 rounded-3xl bg-white p-4 ring-1 ring-slate-900/[0.07] transition {isArchived(
						project
					)
						? 'opacity-60'
						: 'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/[0.06]'}"
					animate:flip={{ duration: 200 }}
				>
					<div class="flex items-center gap-3">
						<ClientLogo
							name={project.client}
							size={40}
							isMuted={isArchived(project)}
						/>
						<div class="min-w-0 flex-1">
							<p class="truncate font-semibold text-slate-900">{project.title}</p>
							<p class="flex items-center gap-1.5 text-xs text-slate-500">
								<span class="truncate">{project.client}</span>
								<span class="size-1.5 shrink-0 rounded-full {STATUS[project.status].dot}"></span>
								<span class="shrink-0 {STATUS[project.status].tone}">{project.status}</span>
							</p>
						</div>
					</div>
					{@render bar(project, true)}
					<div class="flex items-center justify-between gap-2">
						<Faces
							names={project.team}
							size={26}
							isMuted={isArchived(project)}
						/>
						<span class="text-xs text-slate-400">{project.updated}</span>
						<span class="flex gap-1.5">
							<button
								class="rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-danger/10 hover:text-danger"
								onclick={() => look.remove(project.id)}>Delete</button
							>
							<button
								class="rounded-full px-4 py-1.5 text-xs font-semibold text-white {isArchived(
									project
								)
									? 'bg-slate-400'
									: 'bg-primary hover:brightness-110'}"
								onclick={() => look.open(project.id)}>Open</button
							>
						</span>
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<div class="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
			{#each BOARD_COLUMNS as column (column)}
				{@const items = look.visible.filter((project) => project.status === column)}
				<div class="w-64 shrink-0 snap-start rounded-3xl bg-slate-900/[0.03] p-2">
					<p class="flex items-center gap-2 px-2 py-2 text-xs font-semibold text-slate-600">
						<span class="size-2 rounded-full {STATUS[column].dot}"></span>{column}
						<span class="ml-auto text-slate-400">{items.length}</span>
					</p>
					<div class="space-y-2">
						{#each items as project (project.id)}
							<button
								class="w-full space-y-2 rounded-2xl bg-white p-3 text-left ring-1 ring-slate-900/[0.06] hover:shadow-md"
								onclick={() => look.open(project.id)}
							>
								<span class="flex items-center gap-2">
									<ClientLogo
										name={project.client}
										size={26}
									/>
									<span class="min-w-0 flex-1 truncate text-sm font-medium text-slate-900"
										>{project.title}</span
									>
								</span>
								<span class="flex items-center justify-between">
									<span class="truncate text-xs text-slate-500">{project.client}</span>
									<Faces
										names={project.team}
										size={22}
										max={3}
									/>
								</span>
								{@render bar(project, true)}
							</button>
						{:else}
							<p class="px-2 py-4 text-center text-xs text-slate-400">Nothing here</p>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
{:else}
	<!-- Clients, team and ports: the same list, other data -->
	{@const rows =
		look.dataset === 'clients'
			? shownClients.map((item) => ({
					key: item.name,
					title: item.name,
					sub: `${item.projects} project${item.projects === 1 ? '' : 's'} · ${item.open} open`,
					meta: item.updated,
					stack: item.people,
					logos: [] as string[],
					isPerson: false,
					isClient: true
				}))
			: look.dataset === 'team'
				? shownTeam.map((item) => ({
						key: item.name,
						title: item.name,
						sub: `${item.role} · ${item.projects} project${item.projects === 1 ? '' : 's'} · owns ${item.owns}`,
						meta: `${item.open} open`,
						stack: [] as string[],
						logos: item.clients,
						isPerson: true,
						isClient: false
					}))
				: shownPorts.map((item) => ({
						key: item.name,
						title: item.name,
						sub: `${item.projects} project${item.projects === 1 ? '' : 's'} · ${item.open} open`,
						meta: item.open ? 'Busy' : 'Quiet',
						stack: [] as string[],
						logos: item.clients,
						isPerson: false,
						isClient: false
					}))}
	{#snippet mark(row: (typeof rows)[number], size: number)}
		{#if row.isClient}
			<ClientLogo
				name={row.title}
				{size}
			/>
		{:else if row.isPerson}
			<img
				src={personOf(row.title).photo}
				alt=""
				class="shrink-0 rounded-full object-cover"
				style="width: {size}px; height: {size}px"
			/>
		{:else}
			<span
				class="flex shrink-0 items-center justify-center rounded-[30%] bg-linear-to-br from-slate-700 to-slate-900 text-white"
				style="width: {size}px; height: {size}px"
				><span class="icon-[mdi--anchor] size-1/2"></span></span
			>
		{/if}
	{/snippet}
	{#if look.view === 'table'}
		<table class="hidden w-full text-sm md:table">
			<thead
				class="border-b-2 border-slate-900 text-left text-[11px] tracking-wide text-slate-500 uppercase"
			>
				<tr>
					<th class="w-14 py-3 pl-2"></th>
					<th class="py-3">{info.label === 'Team' ? 'Name' : info.label.replace(/s$/, '')}</th>
					<th class="py-3">Details</th>
					<th class="py-3">{look.dataset === 'clients' ? 'Team' : 'Clients'}</th>
					<th class="py-3 pr-2 text-right">Activity</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.key)}
					<tr class="border-b border-slate-900/[0.06] hover:bg-white/80">
						<td class="py-3 pl-2">{@render mark(row, 36)}</td>
						<td class="py-3 font-medium text-slate-900">{row.title}</td>
						<td class="py-3 text-slate-500">{row.sub}</td>
						<td class="py-3"
							>{#if row.stack.length}<Faces
									names={row.stack}
									size={28}
								/>{:else}{@render logoStack(row.logos)}{/if}</td
						>
						<td class="py-3 pr-2 text-right text-xs text-slate-400">{row.meta}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<ul class="space-y-2 md:hidden">
			{#each rows as row (row.key)}
				<li class="flex items-center gap-3 rounded-3xl p-3 {soft}">
					{@render mark(row, 44)}
					<span class="min-w-0 flex-1">
						<span class="block truncate font-medium text-slate-900">{row.title}</span>
						<span class="block truncate text-xs text-slate-500">{row.sub}</span>
					</span>
					{#if row.stack.length}<Faces
							names={row.stack}
							size={22}
							max={3}
						/>{:else}{@render logoStack(row.logos)}{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
			{#each rows as row (row.key)}
				<article
					class="flex flex-col items-center gap-2 rounded-3xl bg-white p-4 text-center ring-1 ring-slate-900/[0.07]"
				>
					{@render mark(row, 56)}
					<p class="w-full truncate font-semibold text-slate-900">{row.title}</p>
					<p class="text-xs text-slate-500">{row.sub}</p>
					{#if row.stack.length}<Faces
							names={row.stack}
							size={24}
						/>{:else}{@render logoStack(row.logos)}{/if}
				</article>
			{/each}
		</div>
	{/if}
{/if}
