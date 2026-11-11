<script lang="ts">
	// PROTOTYPE (#161): the lower part of the dashboard, the list of whatever the selected card counts, in the white
	// sheet (shell.svelte); its heading row is a grip for that sheet (data-sheet-grip). Run 12 (Justin, 2026-11-07, from
	// the Trident team's meeting): all five pages are built from the same parts, so a change to one shows on all of
	// them: a row (project-row, record-row), a card (project-card, record-card) and a board (board.svelte) with a column
	// per label, plus the desktop's table. Only the data changes (records.data.ts). The four menus sit over this
	// heading in shell.svelte, so a page swipe slides the title and the list but never the menus. Rows run edge to edge
	// and fade out at the bottom of the sheet.
	import { flip } from 'svelte/animate';
	import Board from './board.svelte';
	import ClientLogo from './client-logo.svelte';
	import Faces from './faces.svelte';
	import { DATASETS, FADE, type DatasetType, type ProjectType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import MoreMenu from './more-menu.svelte';
	import ProjectCard from './project-card.svelte';
	import ProjectLogo from './project-logo.svelte';
	import ProjectProgress from './project-progress.svelte';
	import ProjectRoute from './project-route.svelte';
	import ProjectRow from './project-row.svelte';
	import RecordCard from './record-card.svelte';
	import RecordMark from './record-mark.svelte';
	import RecordRow from './record-row.svelte';
	import Chips from './chips.svelte';
	import {
		columnsOf,
		hasLabel,
		shownProjects,
		shownRecords,
		type RecordType
	} from './records.data';

	let { look, page }: { look: LookState; page?: DatasetType } = $props();

	// `page` shows another page as it opens, unfiltered, peeking in beside this one while a finger swipes the list
	// sideways (shell.svelte); without it the list is the page on show.
	const dataset = $derived(page ?? look.dataset);
	const filter = $derived(page ? 'All' : look.filter);
	const view = $derived(look.view);
	const info = $derived(DATASETS[dataset]);
	const projects = $derived(dataset === 'projects' ? shownProjects(look, filter) : []);
	const records = $derived(dataset === 'projects' ? [] : shownRecords(look, dataset, filter));
	const total = $derived(dataset === 'projects' ? projects.length : records.length);
	const columns = $derived(
		columnsOf(look, dataset).filter((column) => filter === 'All' || column.label === filter)
	);
</script>

{#snippet logoStack(names: string[])}
	<span class="flex items-center">
		{#each names.slice(0, 4) as name, index (name)}
			<span
				class="relative rounded-full ring-2 ring-white"
				style="z-index: {10 - index}; margin-left: {index ? -8 : 0}px"
				><ClientLogo
					{name}
					size={26}
					shape="circle"
				/></span
			>
		{/each}
	</span>
{/snippet}

{#snippet projectCard(project: ProjectType)}
	<ProjectRow
		{look}
		{project}
		size={38}
	/>
{/snippet}

{#snippet recordCard(record: RecordType)}
	<RecordRow
		{look}
		{record}
		size={38}
	/>
{/snippet}

<div class="flex h-full min-h-0 flex-col">
	<!-- The title; the menus sit over the right of this row (shell.svelte), so it leaves room for them. -->
	<div
		class="mb-2 flex h-10 shrink-0 touch-none items-center pr-44 pl-4 md:pl-0"
		data-sheet-grip
	>
		<h2 class="min-w-0 truncate text-xl font-semibold text-slate-900 md:text-2xl">
			{info.label}
		</h2>
	</div>

	<div
		class={view === 'board'
			? 'min-h-0 flex-1'
			: `min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain pb-28 ${FADE}`}
	>
		{#if total === 0}
			<div class="flex flex-col items-center gap-2 py-16 text-slate-400">
				<span class="icon-[mdi--sail-boat] size-14"></span>
				<p class="font-medium">Calm waters. Nothing here yet.</p>
			</div>
		{:else if view === 'board'}
			{#if dataset === 'projects'}
				<Board
					columns={columns.map((column) => ({
						...column,
						items: projects.filter((project) => project.status === column.label)
					}))}
					card={projectCard}
					keyOf={(project) => project.id}
				/>
			{:else}
				<Board
					columns={columns.map((column) => ({
						...column,
						items: records.filter((record) => hasLabel(record, column.label))
					}))}
					card={recordCard}
					keyOf={(record) => record.key}
				/>
			{/if}
		{:else if view === 'cards'}
			<div
				class="grid gap-3 px-4 md:px-0 {dataset === 'projects'
					? 'gap-4 sm:grid-cols-2 xl:grid-cols-3'
					: 'grid-cols-2 xl:grid-cols-4'}"
			>
				{#if dataset === 'projects'}
					{#each projects as project (project.id)}
						<div animate:flip={{ duration: 200 }}>
							<ProjectCard
								{look}
								{project}
							/>
						</div>
					{/each}
				{:else}
					{#each records as record (record.key)}
						<div animate:flip={{ duration: 200 }}>
							<RecordCard
								{look}
								{record}
							/>
						</div>
					{/each}
				{/if}
			</div>
		{:else}
			<!-- Desktop: the same data as the phone's rows, in columns -->
			<div class="hidden md:block">
				<table class="w-full text-sm">
					<thead
						class="border-b border-slate-200 text-left text-[11px] tracking-wide text-slate-400 uppercase"
					>
						<tr>
							<th class="w-16 py-3 pl-4"></th>
							<th class="py-3">{info.one}</th>
							{#if dataset === 'projects'}
								<th class="py-3">Labels</th>
								<th class="py-3">Route</th>
								<th class="py-3">Team</th>
								<th class="w-52 py-3">Progress</th>
							{:else}
								<th class="py-3">Labels</th>
								<th class="py-3">Place</th>
								{#if dataset === 'team'}<th class="py-3">Contact</th>{/if}
								<th class="py-3">{dataset === 'customers' ? 'Team' : 'Customers'}</th>
							{/if}
							<th class="w-20 py-3 pr-4"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#if dataset === 'projects'}
							{#each projects as project (project.id)}
								{@const isArchived = project.status === 'Archived'}
								<tr
									class="group cursor-pointer transition {isArchived
										? 'text-slate-400'
										: 'hover:bg-slate-50'}"
									animate:flip={{ duration: 200 }}
									onclick={() => look.open(project.id)}
								>
									<td class="py-3 pl-4"
										><ProjectLogo
											{project}
											size={38}
											isMuted={isArchived}
										/></td
									>
									<td
										class="py-3 font-medium group-hover:text-primary {isArchived
											? 'text-slate-500'
											: 'text-slate-900'}">{project.title}</td
									>
									<td class="py-3"><Chips labels={project.type ? [project.type] : []} /></td>
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
											isMuted={isArchived}
										/></td
									>
									<td class="py-3 pr-4"
										><ProjectProgress
											{look}
											{project}
										/></td
									>
									<td
										class="py-3 pr-3"
										onclick={(event) => event.stopPropagation()}
									>
										<span class="flex items-center justify-end">
											<MoreMenu
												{look}
												page="projects"
												id={project.id}
												isOpenable
											/>
											<span class="icon-[mdi--chevron-right] size-5 text-slate-300"></span>
										</span>
									</td>
								</tr>
							{/each}
						{:else}
							{#each records as record (record.key)}
								<tr
									class="group cursor-pointer transition hover:bg-slate-50"
									animate:flip={{ duration: 200 }}
									onclick={() => look.openRecord(record.page, record.key)}
								>
									<td class="py-3 pl-4"
										><RecordMark
											{record}
											size={38}
										/></td
									>
									<td class="py-3 font-medium text-slate-900 group-hover:text-primary"
										>{record.key}</td
									>
									<td class="py-3"
										><Chips
											labels={record.sub ? [...record.labels, record.sub] : record.labels}
											isWrapped
										/></td
									>
									<td class="py-3 text-xs text-slate-500">{record.location}</td>
									{#if dataset === 'team'}
										<td
											class="py-3 text-xs leading-5"
											onclick={(event) => event.stopPropagation()}
										>
											<a
												class="block text-slate-600 hover:text-primary"
												href="tel:{record.member?.phone.replace(/[^+\d]/g, '')}"
												>{record.member?.phone}</a
											>
											<a
												class="block text-slate-400 hover:text-primary"
												href="mailto:{record.member?.email}">{record.member?.email}</a
											>
										</td>
									{/if}
									<td class="py-3"
										>{#if record.people.length}<Faces
												names={record.people}
												size={28}
											/>{:else}{@render logoStack(record.logos)}{/if}</td
									>
									<td
										class="py-3 pr-3"
										onclick={(event) => event.stopPropagation()}
									>
										<span class="flex items-center justify-end">
											<MoreMenu
												{look}
												page={record.page}
												id={record.key}
												isOpenable
											/>
											<span class="icon-[mdi--chevron-right] size-5 text-slate-300"></span>
										</span>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
			<ul class="divide-y divide-slate-100 md:hidden">
				{#if dataset === 'projects'}
					{#each projects as project (project.id)}
						<li animate:flip={{ duration: 200 }}>
							<ProjectRow
								{look}
								{project}
							/>
						</li>
					{/each}
				{:else}
					{#each records as record (record.key)}
						<li animate:flip={{ duration: 200 }}>
							<RecordRow
								{look}
								{record}
							/>
						</li>
					{/each}
				{/if}
			</ul>
		{/if}
	</div>
</div>
