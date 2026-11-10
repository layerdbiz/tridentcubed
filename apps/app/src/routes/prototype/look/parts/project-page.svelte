<script lang="ts">
	// PROTOTYPE (#161) run 13: a project's Page tab, before Edit and Preview (Justin, 2026-11-07 22:21: "page, edit and
	// preview … for the projects page only"). Built like the dashboard and every record's Page (page-view.svelte): the
	// report's photos on top, swiping, or a map of the trip, its stops joined by a line; over them what the project's
	// card shows (state, customer, title, percent, where the trip runs, the team); and in the sheet below, the rest to
	// read: its numbers, its details, the team, the trip stop by stop and each panel's progress. A panel opens on Edit.
	import Avatar from './avatar.svelte';
	import { pinsAt } from './chart.data';
	import ClientLogo from './client-logo.svelte';
	import Faces from './faces.svelte';
	import { MODE_ICONS, personOf, POINTS, STATUS, type ProjectType } from './look.data';
	import { metricsOf, toneOf, type LookState } from './look.state.svelte';
	import { PLACES } from './map.data';
	import MoreMenu from './more-menu.svelte';
	import PageView from './page-view.svelte';
	import ProjectLogo from './project-logo.svelte';
	import ProjectRoute from './project-route.svelte';
	import { projectPhotosOf } from './records.data';

	let {
		look,
		project,
		isWide,
		left = 0
	}: { look: LookState; project: ProjectType; isWide: boolean; left?: number } = $props();

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
	const pins = $derived(pinsAt(places));
	const route = $derived(
		places
			.map(([city]) => PLACES[city])
			.filter(Boolean)
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
		<span
			class="mb-3 inline-block rounded-full px-3 py-1 text-xs font-semibold text-white {status.bar}"
			>{project.status}</span
		>
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
					<Faces
						names={project.team}
						size={24}
						max={4}
					/>
				</span>
			</div>
		</div>
		<span
			class="mt-3 block h-1.5 overflow-hidden rounded-full {isLight
				? 'bg-white/20'
				: 'bg-slate-900/10'}"
			><span
				class="block h-full rounded-full {status.bar}"
				style="width: {progress}%"
			></span></span
		>
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
						<ClientLogo
							name={project.client}
							size={22}
							shape="circle"
						/>{project.client}
					</dd>
				</div>
				{#each [['Project number', project.number], ['Type', project.type], ['Dates', project.dates], ['Where', project.location], ['Updated', project.updated]] as [label, value] (label)}
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
						<button
							class="flex w-full items-center gap-3 px-4 py-2.5 text-left"
							onclick={() => look.openRecord('team', name)}
						>
							<Avatar
								{name}
								size={36}
								ring="ring-slate-200"
							/>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-sm font-medium text-slate-900"
									>{personOf(name).name}</span
								>
								<span class="block truncate text-xs text-slate-500"
									>{look.members.find((member) => member.name === name)?.title ?? ''}</span
								>
							</span>
							<span class="icon-[mdi--chevron-right] size-5 text-slate-300"></span>
						</button>
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
									>{[stop.point, stop.transport, cityOf(stop.facility)]
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
			<div class="divide-y divide-slate-900/[0.05] {CARD}">
				{#each panels as panel (panel.id)}
					{@const metrics = metricsOf(panel)}
					{@const tone = toneOf(metrics.status)}
					<button
						class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm"
						onclick={() => openPanel(panel.id)}
					>
						<span class="{panel.icon} size-5 shrink-0 {tone.text}"></span>
						<span class="min-w-0 flex-1 truncate font-medium text-slate-900">{panel.name}</span>
						<span class="w-16 overflow-hidden rounded-full bg-slate-900/[0.07]"
							><span
								class="block h-1.5 rounded-full {tone.bar}"
								style="width: {metrics.percent}%"
							></span></span
						>
						<span class="w-9 text-right text-xs font-semibold text-slate-500 tabular-nums"
							>{metrics.percent}%</span
						>
					</button>
				{/each}
			</div>
		</section>
	</div>
</PageView>
