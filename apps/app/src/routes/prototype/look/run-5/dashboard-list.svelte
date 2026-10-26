<script lang="ts">
	// PROTOTYPE (#161) run 5: the lower part of the dashboard, the list of whatever the selected card counts. People
	// show their presence dot (note 9) and their labels, not their job title (note 22); every location has the same
	// grey marker (note 21). Transport and Facilities (2026-10-25) list the organization's lists with each one's icon,
	// filtered by transport type or facility kind. `isSplit` lets the rows scroll inside the sheet the list sits in
	// (shell.svelte); the heading row is a grip for that sheet (data-sheet-grip).
	// Run 11 (Justin, 2026-10-26 19:22): a project reads the same in the list, the cards and the board: the customer's
	// logo with the state as a dot on it (no state word, no customer name), the title and team, where the trip starts
	// and ends, the bar, a ⋮ at the top right and a › to say it opens. The chart type and time range sit here with the
	// view and filter, four round buttons alike. Rows run edge to edge in the sheet. The board slides sideways from any
	// part of a column but its cards (a mouse drags it; a finger swipes it).
	import type { Attachment } from 'svelte/attachments';
	import { flip } from 'svelte/animate';
	import Avatar from './avatar.svelte';
	import {
		CHART_KINDS,
		DEFAULT_CHART,
		RANGE_NAMES,
		RANGES,
		type ChartKindType
	} from './chart.data';
	import ClientLogo from './client-logo.svelte';
	import Faces from './faces.svelte';
	import {
		BOARD_COLUMNS,
		clientOf,
		DATASETS,
		facilitiesOf,
		FACILITY_ICONS,
		MODE_ICONS,
		PAGE_ICONS,
		ROLES,
		STATUS,
		transportsOf,
		type DatasetType,
		type ProjectType,
		type StatusType
	} from './look.data';
	import type { LookState, ViewType } from './look.state.svelte';
	import Menu from './menu.svelte';
	import ProjectCard from './project-card.svelte';
	import ProjectLogo from './project-logo.svelte';
	import ProjectMenu from './project-menu.svelte';
	import ProjectRoute from './project-route.svelte';
	import { labelsOf } from './team.data';

	let {
		look,
		isSplit = false,
		page
	}: { look: LookState; isSplit?: boolean; page?: DatasetType } = $props();

	// `page` shows another page as it opens, unfiltered, peeking in beside this one while a finger swipes the list
	// sideways (shell.svelte); without it the list is the page on show.
	const dataset = $derived(page ?? look.dataset);
	const filter = $derived(page ? 'All' : look.filter);
	const view = $derived(page && page !== 'projects' && look.view === 'board' ? 'table' : look.view);
	const chart = $derived(page ? DEFAULT_CHART[page] : look.chart);
	const visible = $derived(
		filter === 'All' || dataset !== 'projects'
			? look.projects
			: look.projects.filter((project) => project.status === filter)
	);

	const VIEWS = [
		{ id: 'table', label: 'List', icon: 'icon-[mdi--format-list-bulleted]' },
		{ id: 'cards', label: 'Cards', icon: 'icon-[mdi--view-grid-outline]' },
		{ id: 'board', label: 'Board', icon: 'icon-[mdi--view-column-outline]' }
	] as const;

	const views = $derived(VIEWS.filter((view) => view.id !== 'board' || dataset === 'projects'));
	const info = $derived(DATASETS[dataset]);
	const isOpen = (project: ProjectType) => !['Complete', 'Archived'].includes(project.status);
	const kind = $derived(CHART_KINDS.find((item) => item.id === chart)!);
	const range = $derived(RANGES.find((item) => item.id === look.range)!);
	const isTimeless = $derived(chart === 'pie' || chart === 'map');

	const customers = $derived(
		look.customers.map((name) => {
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
		look.members.map((member) => {
			const theirs = look.projects.filter((project) => project.team.includes(member.name));
			return {
				...member,
				labels: labelsOf(member),
				role:
					ROLES[member.name] ??
					(member.role === 'admin' ? 'Admin' : member.role === 'manager' ? 'Manager' : 'Member'),
				projects: theirs.length,
				open: theirs.filter(isOpen).length,
				customers: [...new Set(theirs.map((project) => project.client))]
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
				customers: [...new Set(theirs.map((project) => project.client))]
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
				customers: [...new Set(theirs.map((project) => project.client))]
			};
		})
	);

	function isShown(filter: string, item: { open: number; role?: string; group?: string }) {
		if (filter === 'All') return true;
		if (dataset === 'team') return `${item.role}s` === filter;
		if (item.group) return item.group === filter;
		return filter === 'Quiet' ? item.open === 0 : item.open > 0;
	}

	const shownCustomers = $derived(customers.filter((item) => isShown(filter, item)));
	const shownTeam = $derived(team.filter((item) => isShown(filter, item)));
	const shownTransports = $derived(transports.filter((item) => isShown(filter, item)));
	const shownFacilities = $derived(facilities.filter((item) => isShown(filter, item)));
	const total = $derived(
		dataset === 'projects'
			? visible.length
			: dataset === 'customers'
				? shownCustomers.length
				: dataset === 'team'
					? shownTeam.length
					: dataset === 'transport'
						? shownTransports.length
						: shownFacilities.length
	);

	function countOf(filter: string) {
		if (dataset === 'projects')
			return filter === 'All'
				? look.projects.length
				: look.projects.filter((project) => project.status === filter).length;
		const list =
			dataset === 'customers'
				? customers
				: dataset === 'team'
					? team
					: dataset === 'transport'
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

	// A mouse drags the board sideways from any part of a column but a card; a finger swipes it as it always could.
	const dragBoard: Attachment<HTMLElement> = (board) => {
		let from: { x: number; left: number } | undefined;
		let isMoved = false;
		function down(event: PointerEvent) {
			if (event.pointerType !== 'mouse' || event.button !== 0) return;
			if ((event.target as HTMLElement).closest('[data-card], button, a')) return;
			from = { x: event.clientX, left: board.scrollLeft };
			isMoved = false;
		}
		function move(event: PointerEvent) {
			if (!from) return;
			const dx = event.clientX - from.x;
			if (!isMoved && Math.abs(dx) < 4) return;
			if (!isMoved) {
				isMoved = true;
				board.setPointerCapture(event.pointerId);
				board.style.scrollSnapType = 'none';
				board.style.cursor = 'grabbing';
			}
			board.scrollLeft = from.left - dx;
		}
		function up() {
			if (!from) return;
			from = undefined;
			board.style.scrollSnapType = '';
			board.style.cursor = '';
		}
		board.addEventListener('pointerdown', down);
		board.addEventListener('pointermove', move);
		board.addEventListener('pointerup', up);
		board.addEventListener('pointercancel', up);
		return () => {
			board.removeEventListener('pointerdown', down);
			board.removeEventListener('pointermove', move);
			board.removeEventListener('pointerup', up);
			board.removeEventListener('pointercancel', up);
		};
	};

	const ICON_BUTTON =
		'relative flex size-10 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 transition hover:text-slate-900';
	// In the white sheet the lists need no card of their own and run edge to edge. (No negative margins: the list
	// scrolls up and down, and anything wider would let it slide sideways too.)
	const GROUP = $derived(
		isSplit ? '' : 'overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200'
	);
</script>

{#snippet bar(project: ProjectType, isLight = false)}
	{@const progress = look.progressOf(project)}
	<span class="flex w-full items-center gap-2">
		<span
			class="h-1.5 flex-1 overflow-hidden rounded-full {isLight
				? 'bg-white/25'
				: 'bg-slate-900/[0.06]'}"
		>
			<span
				class="block h-full rounded-full transition-[width] duration-500 {STATUS[project.status]
					.bar}"
				style="width: {progress}%"
			></span>
		</span>
		<span
			class="w-9 text-right text-xs font-semibold tabular-nums {isLight
				? 'text-white'
				: 'text-slate-600'}">{progress}%</span
		>
	</span>
{/snippet}

{#snippet place(location: string)}
	<span class="flex min-w-0 items-center gap-0.5 text-slate-500"
		><span class="icon-[mdi--map-marker] size-3.5 shrink-0 text-slate-400"></span><span
			class="truncate">{location}</span
		></span
	>
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

<!-- One project as a row: the list on a phone and the board's cards. The ⋮ sits top right, the › under it. -->
{#snippet projectRow(project: ProjectType, size: number)}
	<button
		class="flex w-full items-start gap-3 py-3 pr-12 pl-4 text-left transition active:bg-slate-50 {isArchived(
			project
		)
			? 'opacity-60'
			: ''}"
		onclick={() => look.open(project.id)}
	>
		<ProjectLogo
			{project}
			{size}
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
			<ProjectRoute
				{look}
				{project}
			/>
			{@render bar(project)}
		</span>
	</button>
	<div class="absolute top-2 right-1.5">
		<ProjectMenu
			{look}
			{project}
			isOpenable
		/>
	</div>
	<span class="pointer-events-none absolute right-3.5 bottom-3">{@render chevron()}</span>
{/snippet}

<div class={isSplit ? 'flex h-full min-h-0 flex-col' : ''}>
	<!-- Heading, then the chart, time range, view and filter menus as four round buttons alike -->
	<div
		class="mb-3 flex shrink-0 items-center justify-between gap-2 px-4 md:px-0 {isSplit
			? 'touch-none'
			: ''}"
		data-sheet-grip
	>
		<h2 class="min-w-0 truncate text-xl font-semibold text-slate-900 md:text-2xl">
			{info.label}
		</h2>
		<div class="flex shrink-0 items-center gap-2">
			<Menu
				label="Chart type"
				value={chart}
				options={CHART_KINDS.map((item) => ({ id: item.id, label: item.label, icon: item.icon }))}
				onpick={(id) => (look.chart = id as ChartKindType)}
			>
				{#snippet trigger()}
					<span
						class={ICON_BUTTON}
						title="Chart: {kind.label}"><span class="{kind.icon} size-5"></span></span
					>
				{/snippet}
			</Menu>
			{#if !isTimeless}
				<Menu
					label="Time range"
					value={look.range}
					options={RANGES.map((item) => ({ id: item.id, label: RANGE_NAMES[item.id] }))}
					onpick={(id) => (look.range = id as typeof look.range)}
				>
					{#snippet trigger()}
						<span
							class={ICON_BUTTON}
							title="Time range: {RANGE_NAMES[look.range]}"
							><span class="text-[11px] font-bold tracking-tight tabular-nums">{range.label}</span
							></span
						>
					{/snippet}
				</Menu>
			{/if}
			<Menu
				label="View"
				value={view}
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
				value={filter}
				options={filterOptions}
				onpick={(id) => (look.filter = id)}
			>
				{#snippet trigger(current)}
					<span
						class="{ICON_BUTTON} {filter === 'All' ? '' : 'text-primary ring-primary/40'}"
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
		</div>
	</div>

	<div
		class={isSplit
			? dataset === 'projects' && view === 'board'
				? 'min-h-0 flex-1'
				: 'min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain pb-28'
			: ''}
	>
		{#if total === 0}
			<div class="flex flex-col items-center gap-2 py-16 text-slate-400 {GROUP}">
				<span class="icon-[mdi--sail-boat] size-14"></span>
				<p class="font-medium">Calm waters. Nothing here yet.</p>
			</div>
		{:else if dataset === 'projects'}
			{#if view === 'table'}
				<!-- Desktop: the same data as the phone's rows, in columns -->
				<div class="hidden md:block {GROUP}">
					<table class="w-full text-sm">
						<thead
							class="border-b border-slate-200 text-left text-[11px] tracking-wide text-slate-400 uppercase"
						>
							<tr>
								<th class="w-16 py-3 pl-4"></th>
								<th class="py-3">Project</th>
								<th class="py-3">Route</th>
								<th class="py-3">Team</th>
								<th class="w-52 py-3">Progress</th>
								<th class="w-20 py-3 pr-4"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100">
							{#each visible as project (project.id)}
								<tr
									class="group cursor-pointer transition {isArchived(project)
										? 'text-slate-400'
										: 'hover:bg-slate-50'}"
									animate:flip={{ duration: 200 }}
									onclick={() => look.open(project.id)}
								>
									<td class="py-3 pl-4"
										><ProjectLogo
											{project}
											size={38}
											isMuted={isArchived(project)}
										/></td
									>
									<td
										class="py-3 font-medium group-hover:text-primary {isArchived(project)
											? 'text-slate-500'
											: 'text-slate-900'}">{project.title}</td
									>
									<td class="max-w-56 py-3"
										><ProjectRoute
											{look}
											{project}
										/></td
									>
									<td class="py-3"
										><Faces
											names={project.team}
											size={30}
											isMuted={isArchived(project)}
										/></td
									>
									<td class="py-3 pr-4">{@render bar(project)}</td>
									<td
										class="py-3 pr-3"
										onclick={(event) => event.stopPropagation()}
									>
										<span class="flex items-center justify-end">
											<ProjectMenu
												{look}
												{project}
												isOpenable
											/>
											{@render chevron()}
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<ul class="divide-y divide-slate-100 md:hidden {GROUP}">
					{#each visible as project (project.id)}
						<li
							class="relative"
							animate:flip={{ duration: 200 }}
						>
							{@render projectRow(project, 44)}
						</li>
					{/each}
				</ul>
			{:else if view === 'cards'}
				<div class="grid gap-4 px-4 sm:grid-cols-2 md:px-0 xl:grid-cols-3">
					{#each visible as project (project.id)}
						<div animate:flip={{ duration: 200 }}>
							<ProjectCard
								{look}
								{project}
							/>
						</div>
					{/each}
				</div>
			{:else}
				<!-- Columns run from here to the bottom of the screen; each scrolls on its own, under the floating bar. -->
				<div
					class="flex h-full snap-x scroll-px-4 gap-3 overflow-x-auto px-4 md:scroll-px-0 md:px-0"
					data-swipe-ignore
					{@attach dragBoard}
				>
					{#each BOARD_COLUMNS as column (column)}
						{@const items = visible.filter((project) => project.status === column)}
						<div
							class="flex h-full w-72 shrink-0 snap-start flex-col rounded-t-3xl bg-slate-900/[0.035] p-2 pb-0"
						>
							<p
								class="flex shrink-0 items-center gap-2 px-2 py-2 text-xs font-semibold text-slate-600"
							>
								<span class="size-2 rounded-full {STATUS[column].dot}"></span>{column}
								<span
									class="ml-auto min-w-6 rounded-full px-2 py-0.5 text-center text-[11px] font-bold text-white tabular-nums {STATUS[
										column
									].bar}">{items.length}</span
								>
							</p>
							<div class="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain pb-28">
								{#each items as project (project.id)}
									<div
										class="relative touch-pan-y rounded-2xl bg-white ring-1 ring-slate-900/[0.06] transition hover:shadow-md"
										data-card
									>
										{@render projectRow(project, 38)}
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
			<!-- Customers, team, transport and facilities: the same list, other data -->
			{@const rows =
				dataset === 'customers'
					? shownCustomers.map((item) => ({
							key: item.name,
							title: item.name,
							sub: `${item.kind ? `${item.kind} · ` : ''}${item.projects} project${item.projects === 1 ? '' : 's'}`,
							location: item.city,
							labels: [] as string[],
							meta: item.updated,
							phone: '',
							email: '',
							stack: item.people,
							logos: [] as string[],
							kind: 'customer',
							icon: ''
						}))
					: dataset === 'team'
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
								logos: item.customers,
								kind: 'person',
								icon: ''
							}))
						: dataset === 'transport'
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
									logos: item.customers,
									kind: 'thing',
									icon: MODE_ICONS[item.mode] ?? PAGE_ICONS.transport.active
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
									logos: item.customers,
									kind: 'thing',
									icon: FACILITY_ICONS[item.kind]
								}))}
			{#snippet mark(row: (typeof rows)[number], size: number)}
				{#if row.kind === 'customer'}
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
			{#if view === 'table'}
				<div class="hidden md:block {GROUP}">
					<table class="w-full text-sm">
						<thead
							class="border-b border-slate-200 text-left text-[11px] tracking-wide text-slate-400 uppercase"
						>
							<tr>
								<th class="w-16 py-3 pl-4"></th>
								<th class="py-3">{info.one}</th>
								<th class="py-3">Details</th>
								{#if dataset === 'team'}
									<th class="py-3">Contact</th>
								{/if}
								<th class="py-3">{dataset === 'customers' ? 'Team' : 'Customers'}</th>
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
									{#if dataset === 'team'}
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
						<li class="flex items-center gap-3 py-3 pr-3 pl-4">
							{@render mark(row, 44)}
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
				<div class="grid grid-cols-2 gap-3 px-4 md:px-0 xl:grid-cols-4">
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
