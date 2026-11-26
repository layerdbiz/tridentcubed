<script lang="ts">
	// PROTOTYPE (#161) run 13: a project's Page tab, before Edit and Preview (Justin, 2026-11-07 22:21: "page, edit and
	// preview … for the projects page only"). Built like the dashboard and every record's Page (page-view.svelte): the
	// report's photos on top, swiping, or a map of the trip, its stops joined by a line; over them what the project's
	// card shows (state, customer, title, percent, where the trip runs, the team); and in the sheet below, the rest to
	// read: its numbers, its details, the team, the trip stop by stop and each panel's progress. A panel opens on Edit.
	import { Avatar, ListRow, ProgressBar, Stack } from '@layerd/ui';
	import { cityStateOf } from './location';
	import { pinOfRecord, pinsAt } from './chart.data';
	import {
		agoOf,
		dayOf,
		MODE_ICONS,
		createdDayOf,
		numberOf,
		personOf,
		POINTS,
		STATUS,
		type ProjectType
	} from './look.data';
	import { metricsOf, themeOf, toneOf, type LookState } from './look.state.svelte';
	import { faceOf, facesOf, logoOf } from './marks';
	import MoreMenu from './more-menu.svelte';
	import PageView from './page-view.svelte';
	import ProjectLogo from './project-logo.svelte';
	import ProjectRoute from './project-route.svelte';
	import { projectPhotosOf, recordOf } from './records.data';
	import StatusPill from './status-pill.svelte';

	let {
		look,
		project,
		isWide,
		left = 0,
		buttons = 'glass',
		onphoto
	}: {
		look: LookState;
		project: ProjectType;
		isWide: boolean;
		left?: number;
		// Both go straight to page-view.svelte: who draws the back arrow and the ⋮, and word of a photo showing.
		buttons?: 'glass' | 'ghost' | 'none';
		onphoto?: (isPhoto: boolean) => void;
	} = $props();

	const CARD = 'rounded-3xl bg-slate-50 ring-1 ring-slate-900/[0.04]';
	const HEADING = 'mb-2 px-1 text-sm font-semibold text-slate-900';

	const status = $derived(STATUS[project.status]);
	const progress = $derived(look.progressOf(project));
	const panels = $derived((look.workspaces[project.id] ?? []).filter((panel) => panel.isEnabled));
	const photos = $derived(projectPhotosOf(look, project));
	const cityOf = (facility: string) =>
		look.facilities.find((item) => item.name === facility)?.city ?? '';
	const stops = $derived(project.stops.filter((stop) => stop.facility || stop.transport));
	const places = $derived(
		stops.length
			? stops.map((stop) => [cityOf(stop.facility), stop.facility] as [string, string])
			: [[project.location, project.title] as [string, string]]
	);
	// Each stop is its facility, drawn as that facility is on its own page; a project with no stops is its location.
	const pins = $derived(
		pinsAt(
			look.places,
			places.map(([city, name]) => {
				const facility = recordOf(look, 'facilities', name);
				return facility
					? pinOfRecord(look, facility, city)
					: {
							city,
							name,
							tone: STATUS[project.status].dot,
							page: 'projects' as const,
							id: project.id
						};
			})
		)
	);
	const route = $derived(
		places
			.map(([city]) => look.placeOf(city))
			.filter((place) => place !== undefined)
			.map((place): [number, number] => [place.lng, place.lat])
			.filter((point, index, all) => index === 0 || point !== all[index - 1])
	);
	const transportOf = (name: string) => look.transports.find((item) => item.name === name);

	function openPanel(id: string) {
		look.panelId = id;
		look.tab = 'edit';
	}
</script>

<PageView
	photos={photos.map((photo) => photo.src)}
	{pins}
	{route}
	{isWide}
	{left}
	{buttons}
	picture={look.variant('page-picture')}
	isDarkMap={look.variant('page-map') === 'B'}
	hasChevron={look.variant('header') === 'C'}
	{onphoto}
	onback={() => look.home()}
	backLabel="Back to Projects"
>
	{#snippet actions()}
		<MoreMenu
			{look}
			page="projects"
			id={project.id}
			tone="bare"
		/>
	{/snippet}
	{#snippet overlay(isLight)}
		<div class="pointer-events-auto mb-3 w-fit">
			<StatusPill
				{look}
				{project}
			/>
		</div>
		<div class="flex items-center gap-3">
			<ProjectLogo
				{project}
				size={52}
			/>
			<div class="min-w-0 flex-1 space-y-1.5">
				<p class="flex items-baseline gap-2">
					<span
						class="line-clamp-2 min-w-0 flex-1 text-2xl leading-tight font-semibold {isLight
							? 'text-white'
							: 'text-slate-900'}">{project.title}</span
					>
					<span
						class="shrink-0 text-lg font-semibold tabular-nums {isLight
							? 'text-white'
							: 'text-slate-900'}">{progress}%</span
					>
				</p>
				<span class="flex items-center justify-between gap-2">
					<ProjectRoute
						{look}
						{project}
						{isLight}
					/>
					<Stack
						items={facesOf(project.team)}
						size={24}
						max={4}
					/>
				</span>
			</div>
		</div>
		<ProgressBar
			value={progress}
			label="Project progress"
			track={isLight ? 'bg-white/20' : 'bg-slate-900/10'}
			bar={status.bar}
			class="mt-3"
			sm
		/>
	{/snippet}

	<div class="space-y-5">
		<div class="grid grid-cols-3 gap-2">
			{#each [['Done', `${progress}%`], ['Panels', String(panels.length)], ['Photos', String(photos.length)]] as [label, value] (label)}
				<div class="p-3 text-center {CARD}">
					<p class="text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
					<p class="text-xs font-medium text-slate-500">{label}</p>
				</div>
			{/each}
		</div>

		<section>
			<h3 class={HEADING}>Details</h3>
			<dl class="divide-y divide-slate-900/[0.05] {CARD}">
				<div class="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
					<dt class="text-slate-500">Customer</dt>
					<dd class="flex items-center gap-2 font-medium text-slate-900">
						<Avatar
							{...logoOf(project.client, { shape: 'circle' })}
							size={22}
						/>{project.client}
					</dd>
				</div>
				{#each [['Project Number', numberOf(project, look.projects)], ['Type', project.type], ['Created', dayOf(createdDayOf(project))], ['Where', cityStateOf(project.location)], ['Updated', agoOf(project.updated)]] as [label, value] (label)}
					<div class="flex justify-between gap-3 px-4 py-2.5 text-sm">
						<dt class="text-slate-500">{label}</dt>
						<dd class="text-right font-medium text-slate-900">{value || '—'}</dd>
					</div>
				{/each}
			</dl>
		</section>

		{#if project.team.length}
			<section>
				<h3 class={HEADING}>Team</h3>
				<div class="divide-y divide-slate-900/[0.05] {CARD}">
					{#each project.team as name (name)}
						<ListRow
							tag="button"
							class="gap-3 px-4 py-2.5"
							onclick={() => look.openRecord('team', name)}
							label={personOf(name).name}
							labelClass="text-sm font-medium text-slate-900"
							note={look.members.find((member) => member.name === name)?.title ?? ''}
							noteClass="text-xs text-slate-500"
						>
							{#snippet start()}<Avatar
									{...faceOf(name)}
									size={36}
									ring="ring-2 ring-slate-200"
								/>{/snippet}
							{#snippet end()}<span class="icon-[mdi--chevron-right] size-5 text-slate-300"
								></span>{/snippet}
						</ListRow>
					{/each}
				</div>
			</section>
		{/if}

		{#if stops.length}
			<section>
				<h3 class={HEADING}>Trip</h3>
				<ol class="divide-y divide-slate-900/[0.05] {CARD}">
					{#each stops as stop, index (index)}
						{@const transport = transportOf(stop.transport)}
						<li class="flex items-center gap-3 px-4 py-2.5 text-sm">
							<span
								class="flex size-8 shrink-0 items-center justify-center rounded-full {stop.point
									? POINTS[stop.point].solid
									: 'bg-slate-200 text-slate-500'}"
								><span
									class="{transport ? MODE_ICONS[transport.mode] : 'icon-[mdi--map-marker]'} size-4"
								></span></span
							>
							<span class="min-w-0 flex-1">
								<span class="block truncate font-medium text-slate-900"
									>{stop.facility || 'No facility yet'}</span
								>
								<span class="block truncate text-xs text-slate-500"
									>{[stop.point, stop.transport, cityStateOf(cityOf(stop.facility))]
										.filter(Boolean)
										.join(' · ')}</span
								>
							</span>
						</li>
					{/each}
				</ol>
			</section>
		{/if}

		<section>
			<h3 class={HEADING}>Panels</h3>
			<!-- In the state's colour once the project is Sent, Complete or Archived, as on Edit (#335). -->
			<div class="divide-y divide-slate-900/[0.05] {CARD} {themeOf(project.status)}">
				{#each panels as panel (panel.id)}
					{@const metrics = metricsOf(panel, look)}
					{@const tone = toneOf(metrics.status)}
					<button
						class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm"
						onclick={() => openPanel(panel.id)}
					>
						<span class="{panel.icon} size-5 shrink-0 {tone.text}"></span>
						<span class="min-w-0 flex-1 truncate font-medium text-slate-900">{panel.name}</span>
						<ProgressBar
							value={metrics.percent}
							label="{panel.name} progress"
							track="bg-slate-900/[0.07]"
							bar={tone.bar}
							class="w-16"
							sm
						/>
						<span class="w-9 text-right text-xs font-semibold text-slate-500 tabular-nums"
							>{metrics.percent}%</span
						>
					</button>
				{/each}
			</div>
		</section>
	</div>
</PageView>
