<script lang="ts">
	// PROTOTYPE (#161) run 5: the lower part of the dashboard, the list of whatever the selected card counts, rows
	// grouped in one white box. A project row reads title, client, then status and a grey map marker with the
	// location (note 7); its bar takes the status colour (note 8). People show their presence dot (note 9) and their
	// labels, not their job title (note 22); every location has the same grey marker (note 21). Transport and
	// Facilities (2026-10-25) list the organization's lists with each one's icon, filtered by transport type or facility kind. `isSplit`
	// lets the rows scroll inside the lower part of the phone screen. 2026-10-26 16:34: every project has its ⋮
	// (ProjectMenu) at its top right in the list, the cards and the board, in place of Open and Delete; Cards shows
	// each project the way Airbnb shows a stay (project-card.svelte); the board's cards read like the list's rows and
	// its columns reach the bottom of the screen, each scrolling on its own. The heading row is a grip for the sheet
	// the list sits in (data-sheet-grip, shell.svelte).
	import { flip } from 'svelte/animate';
	import Avatar from './avatar.svelte';
	import ClientLogo from './client-logo.svelte';
	import Faces from './faces.svelte';
	import {
		BOARD_COLUMNS,
		CLIENTS,
		clientOf,
		DATASETS,
		facilitiesOf,
		FACILITY_ICONS,
		MODE_ICONS,
		ROLES,
		STATUS,
		transportsOf,
		type ProjectType,
		type StatusType
	} from './look.data';
	import type { LookState, ViewType } from './look.state.svelte';
	import Menu from './menu.svelte';
	import ProjectCard from './project-card.svelte';
	import ProjectMenu from './project-menu.svelte';
	import { labelsOf, TEAM } from './team.data';

	let { look, isSplit = false }: { look: LookState; isSplit?: boolean } = $props();

	const VIEWS = [
		{ id: 'table', label: 'List', icon: 'icon-[mdi--format-list-bulleted]' },
		{ id: 'cards', label: 'Cards', icon: 'icon-[mdi--view-grid-outline]' },
		{ id: 'board', label: 'Board', icon: 'icon-[mdi--view-column-outline]' }
	] as const;

	const views = $derived(
		VIEWS.filter((view) => view.id !== 'board' || look.dataset === 'projects')
	);
	const info = $derived(DATASETS[look.dataset]);
	const isOpen = (project: ProjectType) => !['Complete', 'Archived'].includes(project.status);

	const clients = $derived(
		CLIENTS.map((name) => {
			const theirs = look.projects.filter((project) => project.client === name);
			return {
				name,
				kind: clientOf(name).kind,
				city: clientOf(name).city,
				projects: theirs.length,
				open: theirs.filter(isOpen).length,
				people: [...new Set(theirs.flatMap((project) => project.team))],
				updated: theirs[0]?.updated ?? 'No projects yet'
			};
		})
	);
	const team = $derived(
		TEAM.map((member) => {
			const theirs = look.projects.filter((project) => project.team.includes(member.name));
			return {
				...member,
				labels: labelsOf(member),
				role: ROLES[member.name],
				projects: theirs.length,
				open: theirs.filter(isOpen).length,
				clients: [...new Set(theirs.map((project) => project.client))]
			};
		})
	);
	const transports = $derived(
		look.transports.map((transport) => {
			const theirs = look.projects.filter((project) =>
				transportsOf(project).includes(transport.name)
			);
			return {
				...transport,
				group: transport.type,
				projects: theirs.length,
				open: theirs.filter(isOpen).length,
				clients: [...new Set(theirs.map((project) => project.client))]
			};
		})
	);
	const facilities = $derived(
		look.facilities.map((facility) => {
			const theirs = look.projects.filter((project) =>
				facilitiesOf(project).includes(facility.name)
			);
			return {
				...facility,
				group: facility.kind,
				projects: theirs.length,
				open: theirs.filter(isOpen).length,
				clients: [...new Set(theirs.map((project) => project.client))]
			};
		})
	);

	function isShown(filter: string, item: { open: number; role?: string; group?: string }) {
		if (filter === 'All') return true;
		if (look.dataset === 'team') return `${item.role}s` === filter;
		if (item.group) return item.group === filter;
		return filter === 'Quiet' ? item.open === 0 : item.open > 0;
	}

	const shownClients = $derived(clients.filter((item) => isShown(look.filter, item)));
	const shownTeam = $derived(team.filter((item) => isShown(look.filter, item)));
	const shownTransports = $derived(transports.filter((item) => isShown(look.filter, item)));
	const shownFacilities = $derived(facilities.filter((item) => isShown(look.filter, item)));
	const total = $derived(
		look.dataset === 'projects'
			? look.visible.length
			: look.dataset === 'clients'
				? shownClients.length
				: look.dataset === 'team'
					? shownTeam.length
					: look.dataset === 'transport'
						? shownTransports.length
						: shownFacilities.length
	);

	function countOf(filter: string) {
		if (look.dataset === 'projects')
			return filter === 'All'
				? look.projects.length
				: look.projects.filter((project) => project.status === filter).length;
		const list =
			look.dataset === 'clients'
				? clients
				: look.dataset === 'team'
					? team
					: look.dataset === 'transport'
						? transports
						: facilities;
		return list.filter((item) => isShown(filter, item)).length;
	}

	function projectsOf(item: { projects: number; open: number }) {
		return `${item.projects} project${item.projects === 1 ? '' : 's'} · ${item.open} open`;
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

	const ICON_BUTTON =
		'relative flex size-10 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 transition hover:text-slate-900';
	// In the white sheet the lists need no card of their own. (No negative margins: the list scrolls up and down, and
	// anything wider would let it slide sideways too.)
	const GROUP = $derived(
		isSplit ? '' : 'overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200'
	);
</script>

{#snippet bar(project: ProjectType)}
	{@const progress = look.progressOf(project)}
	<span class="flex w-full items-center gap-2">
		<span class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-900/[0.06]">
			<span
				class="block h-full rounded-full transition-[width] duration-500 {STATUS[project.status]
					.bar}"
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

{#snippet place(location: string)}
	<span class="flex min-w-0 items-center gap-0.5 text-slate-500"
		><span class="icon-[mdi--map-marker] size-3.5 shrink-0 text-slate-400"></span><span
			class="truncate">{location}</span
		></span
	>
{/snippet}

{#snippet state(project: ProjectType)}
	<span class="flex items-center gap-1.5 text-xs">
		<span class="flex shrink-0 items-center gap-1 font-medium {STATUS[project.status].tone}"
			><span class="size-1.5 rounded-full {STATUS[project.status].dot}"
			></span>{project.status}</span
		>
		{@render place(project.location)}
	</span>
{/snippet}

{#snippet labelChips(labels: string[])}
	<span class="flex flex-wrap gap-1">
		{#each labels as label (label)}
			<span
				class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-slate-600"
				>{label}</span
			>
		{/each}
	</span>
{/snippet}

{#snippet chevron()}
	<span class="icon-[mdi--chevron-right] size-5 shrink-0 text-slate-300"></span>
{/snippet}

{#snippet logoStack(names: string[])}
	<span class="flex items-center">
		{#each names.slice(0, 4) as name, index (name)}
			<span
				class="relative rounded-full ring-2 ring-white"
				style="z-index: {10 - index}; margin-left: {index ? -8 : 0}px"
				><ClientLogo
					{name}
					size={24}
					shape="circle"
				/></span
			>
		{/each}
	</span>
{/snippet}

<div class={isSplit ? 'flex h-full min-h-0 flex-col' : ''}>
	<!-- Heading, then the view and filter menus as two small icon buttons -->
	<div
		class="mb-3 flex shrink-0 items-center justify-between gap-2 {isSplit ? 'touch-none' : ''}"
		data-sheet-grip
	>
		<h2 class="min-w-0 truncate text-xl font-semibold text-slate-900 md:text-2xl">
			{info.label}
		</h2>
		<div class="flex shrink-0 items-center gap-2">
			<Menu
				label="View"
				value={look.view}
				options={views.map((view) => ({ id: view.id, label: view.label, icon: view.icon }))}
				onpick={(id) => (look.view = id as ViewType)}
			>
				{#snippet trigger(current)}
					<span
						class={ICON_BUTTON}
						title="View: {current?.label}"><span class="{current?.icon} size-5"></span></span
					>
				{/snippet}
			</Menu>
			<Menu
				label="Filter"
				value={look.filter}
				options={filterOptions}
				onpick={(id) => (look.filter = id)}
			>
				{#snippet trigger(current)}
					<span
						class="{ICON_BUTTON} {look.filter === 'All' ? '' : 'text-primary ring-primary/40'}"
						title="Filter: {current?.label}"
					>
						<span class="icon-[mdi--filter-variant] size-5"></span>
						{#if current?.dot}
							<span
								class="absolute top-1 right-1 size-2.5 rounded-full ring-2 ring-white {current.dot}"
							></span>
						{/if}
					</span>
				{/snippet}
			</Menu>
			<button
				class="hidden items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-primary/25 hover:brightness-110 lg:flex"
				onclick={() => (look.isNewOpen = true)}
			>
				<span class="icon-[mdi--plus] size-5"></span> New project
			</button>
		</div>
	</div>

	<div
		class={isSplit
			? look.dataset === 'projects' && look.view === 'board'
				? 'min-h-0 flex-1 pb-[max(1rem,env(safe-area-inset-bottom))]'
				: 'min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6'
			: ''}
	>
		{#if total === 0}
			<div class="flex flex-col items-center gap-2 py-16 text-slate-400 {GROUP}">
				<span class="icon-[mdi--sail-boat] size-14"></span>
				<p class="font-medium">Calm waters. Nothing here yet.</p>
			</div>
		{:else if look.dataset === 'projects'}
			{#if look.view === 'table'}
				<!-- Desktop: the table inside one white box, thin lines between rows -->
				<div class="hidden md:block {GROUP}">
					<table class="w-full text-sm">
						<thead
							class="border-b border-slate-200 text-left text-[11px] tracking-wide text-slate-400 uppercase"
						>
							<tr>
								<th class="w-16 py-3 pl-4"></th>
								<th class="py-3">Project</th>
								<th class="py-3">Client</th>
								<th class="py-3">Team</th>
								<th class="py-3">Status</th>
								<th class="w-44 py-3">Progress</th>
								<th class="py-3">Updated</th>
								<th class="w-12 py-3 pr-4"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100">
							{#each look.visible as project (project.id)}
								<tr
									class="group cursor-pointer transition {isArchived(project)
										? 'text-slate-400'
										: 'hover:bg-slate-50'}"
									animate:flip={{ duration: 200 }}
									onclick={() => look.open(project.id)}
								>
									<td class="py-3 pl-4"
										><ClientLogo
											name={project.client}
											size={36}
											shape="circle"
											isMuted={isArchived(project)}
										/></td
									>
									<td class="py-3">
										<span
											class="block font-medium group-hover:text-primary {isArchived(project)
												? 'text-slate-500'
												: 'text-slate-900'}">{project.title}</span
										>
										<span class="text-xs text-slate-400">{project.number} · {project.type}</span>
									</td>
									<td class="py-3 text-xs {isArchived(project) ? '' : 'text-slate-600'}"
										><span class="block text-sm">{project.client}</span>{@render place(
											project.location
										)}</td
									>
									<td class="py-3"
										><Faces
											names={project.team}
											size={30}
											isMuted={isArchived(project)}
										/></td
									>
									<td class="py-3">{@render pill(project.status)}</td>
									<td class="py-3 pr-4">{@render bar(project)}</td>
									<td class="py-3 text-xs text-slate-400">{project.updated}</td>
									<td
										class="py-3 pr-3 text-right"
										onclick={(event) => event.stopPropagation()}
										><ProjectMenu
											{look}
											{project}
											isOpenable
										/></td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<!-- Phone: F's rows, grouped in one white box -->
				<ul class="divide-y divide-slate-100 md:hidden {GROUP}">
					{#each look.visible as project (project.id)}
						<li
							class="relative"
							animate:flip={{ duration: 200 }}
						>
							<button
								class="flex w-full items-center gap-3 py-3 pr-11 pl-3.5 text-left transition active:bg-slate-50 {isArchived(
									project
								)
									? 'opacity-60'
									: ''}"
								onclick={() => look.open(project.id)}
							>
								<ClientLogo
									name={project.client}
									size={42}
									shape="circle"
									isMuted={isArchived(project)}
								/>
								<span class="min-w-0 flex-1 space-y-1">
									<span class="flex items-center justify-between gap-2">
										<span class="truncate font-medium text-slate-900">{project.title}</span>
										<Faces
											names={project.team}
											size={22}
											max={3}
											isMuted={isArchived(project)}
										/>
									</span>
									<span class="block truncate text-xs text-slate-500">{project.client}</span>
									{@render state(project)}
									{@render bar(project)}
								</span>
							</button>
							<div class="absolute top-2 right-1">
								<ProjectMenu
									{look}
									{project}
									isOpenable
								/>
							</div>
						</li>
					{/each}
				</ul>
			{:else if look.view === 'cards'}
				<div class="grid gap-x-4 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
					{#each look.visible as project (project.id)}
						<div animate:flip={{ duration: 200 }}>
							<ProjectCard
								{look}
								{project}
							/>
						</div>
					{/each}
				</div>
			{:else}
				<!-- Columns run from here to the bottom of the screen; each scrolls on its own. -->
				<div
					class="-mx-4 flex h-full snap-x scroll-px-4 gap-3 overflow-x-auto px-4 md:mx-0 md:scroll-px-0 md:px-0"
				>
					{#each BOARD_COLUMNS as column (column)}
						{@const items = look.visible.filter((project) => project.status === column)}
						<div
							class="flex h-full w-72 shrink-0 snap-start flex-col rounded-3xl bg-slate-900/[0.03] p-2"
						>
							<p
								class="flex shrink-0 items-center gap-2 px-2 py-2 text-xs font-semibold text-slate-600"
							>
								<span class="size-2 rounded-full {STATUS[column].dot}"></span>{column}
								<span class="ml-auto text-slate-400">{items.length}</span>
							</p>
							<div class="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
								{#each items as project (project.id)}
									<div
										class="relative rounded-2xl bg-white ring-1 ring-slate-900/[0.06] transition hover:shadow-md"
									>
										<button
											class="flex w-full items-start gap-2.5 py-3 pr-10 pl-3 text-left"
											onclick={() => look.open(project.id)}
										>
											<ClientLogo
												name={project.client}
												size={34}
												shape="circle"
											/>
											<span class="min-w-0 flex-1 space-y-1">
												<span class="block truncate text-sm font-medium text-slate-900"
													>{project.title}</span
												>
												<span class="block truncate text-xs text-slate-500">{project.client}</span>
												<span class="flex items-center justify-between gap-2 text-xs">
													{@render place(project.location)}
													<Faces
														names={project.team}
														size={20}
														max={3}
													/>
												</span>
												{@render bar(project)}
											</span>
										</button>
										<div class="absolute top-1.5 right-0.5">
											<ProjectMenu
												{look}
												{project}
												isOpenable
											/>
										</div>
									</div>
								{:else}
									<p class="px-2 py-4 text-center text-xs text-slate-400">Nothing here</p>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{:else}
			<!-- Clients, team, transport and facilities: the same grouped list, other data -->
			{@const rows =
				look.dataset === 'clients'
					? shownClients.map((item) => ({
							key: item.name,
							title: item.name,
							sub: `${item.kind} · ${item.projects} project${item.projects === 1 ? '' : 's'}`,
							location: item.city,
							labels: [] as string[],
							meta: item.updated,
							phone: '',
							email: '',
							stack: item.people,
							logos: [] as string[],
							kind: 'client',
							icon: ''
						}))
					: look.dataset === 'team'
						? shownTeam.map((item) => ({
								key: item.name,
								title: item.name,
								sub: '',
								location: item.location,
								labels: item.labels,
								meta: `${item.role} · ${item.open} open`,
								phone: item.phone,
								email: item.email,
								stack: [] as string[],
								logos: item.clients,
								kind: 'person',
								icon: ''
							}))
						: look.dataset === 'transport'
							? shownTransports.map((item) => ({
									key: item.name,
									title: item.name,
									sub: projectsOf(item),
									location: '',
									labels: [item.type, item.mode],
									meta: item.open ? 'Busy' : 'Quiet',
									phone: '',
									email: '',
									stack: [] as string[],
									logos: item.clients,
									kind: 'thing',
									icon: MODE_ICONS[item.mode] ?? 'icon-[mdi--ferry]'
								}))
							: shownFacilities.map((item) => ({
									key: item.name,
									title: item.name,
									sub: projectsOf(item),
									location: item.city,
									labels: [item.kind],
									meta: item.open ? 'Busy' : 'Quiet',
									phone: '',
									email: '',
									stack: [] as string[],
									logos: item.clients,
									kind: 'thing',
									icon: FACILITY_ICONS[item.kind]
								}))}
			{#snippet mark(row: (typeof rows)[number], size: number)}
				{#if row.kind === 'client'}
					<ClientLogo
						name={row.title}
						{size}
						shape="circle"
					/>
				{:else if row.kind === 'person'}
					<Avatar
						name={row.title}
						{size}
						ring="ring-slate-200"
					/>
				{:else}
					<span
						class="flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-slate-700 to-slate-900 text-white"
						style="width: {size}px; height: {size}px"
						><span class="{row.icon} size-1/2"></span></span
					>
				{/if}
			{/snippet}
			{#snippet details(row: (typeof rows)[number])}
				{#if row.labels.length}{@render labelChips(row.labels)}{/if}
				{#if row.sub}<span class="block truncate text-xs text-slate-500">{row.sub}</span>{/if}
				{#if row.location}<span class="block text-xs">{@render place(row.location)}</span>{/if}
			{/snippet}
			{#if look.view === 'table'}
				<div class="hidden md:block {GROUP}">
					<table class="w-full text-sm">
						<thead
							class="border-b border-slate-200 text-left text-[11px] tracking-wide text-slate-400 uppercase"
						>
							<tr>
								<th class="w-16 py-3 pl-4"></th>
								<th class="py-3">{info.one}</th>
								<th class="py-3">Details</th>
								{#if look.dataset === 'team'}
									<th class="py-3">Contact</th>
								{/if}
								<th class="py-3">{look.dataset === 'clients' ? 'Team' : 'Clients'}</th>
								<th class="py-3 text-right">Activity</th>
								<th class="w-12 py-3 pr-4"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100">
							{#each rows as row (row.key)}
								<tr class="hover:bg-slate-50">
									<td class="py-3 pl-4">{@render mark(row, 36)}</td>
									<td class="py-3 font-medium text-slate-900">{row.title}</td>
									<td class="space-y-1 py-3">{@render details(row)}</td>
									{#if look.dataset === 'team'}
										<td class="py-3 text-xs leading-5">
											<a
												class="block text-slate-600 hover:text-primary"
												href="tel:{row.phone.replace(/[^+\d]/g, '')}">{row.phone}</a
											>
											<a
												class="block text-slate-400 hover:text-primary"
												href="mailto:{row.email}">{row.email}</a
											>
										</td>
									{/if}
									<td class="py-3"
										>{#if row.stack.length}<Faces
												names={row.stack}
												size={28}
											/>{:else}{@render logoStack(row.logos)}{/if}</td
									>
									<td class="py-3 text-right text-xs text-slate-400">{row.meta}</td>
									<td class="py-3 pr-4 text-right">{@render chevron()}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<ul class="divide-y divide-slate-100 md:hidden {GROUP}">
					{#each rows as row (row.key)}
						<li class="flex items-center gap-3 py-3 pr-3 pl-3.5">
							{@render mark(row, 42)}
							<span class="min-w-0 flex-1 space-y-1">
								<span class="block truncate font-medium text-slate-900">{row.title}</span>
								{@render details(row)}
							</span>
							{#if row.stack.length}<Faces
									names={row.stack}
									size={22}
									max={3}
								/>{:else if row.kind !== 'person'}{@render logoStack(row.logos)}{/if}
							<span class="pl-1">{@render chevron()}</span>
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
							<div class="flex flex-col items-center gap-1">{@render details(row)}</div>
							{#if row.kind === 'person'}
								<p class="text-[11px] leading-4 text-slate-400">{row.phone}<br />{row.email}</p>
							{:else if row.stack.length}<Faces
									names={row.stack}
									size={24}
								/>{:else}{@render logoStack(row.logos)}{/if}
						</article>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>
