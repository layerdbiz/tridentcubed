<script lang="ts">
	// PROTOTYPE (#161) run 18: what a project says about itself, written once (Justin, 2026-11-10: the card should
	// "look exactly like the list view"): its title and team, its Project Type as a label, where it goes, and its
	// progress. The list row shows it on white and the card lays the same lines over its photo (`isLight`). The label
	// line keeps its height when there is no type, so every row is as tall as the next.
	// #350 (Justin, 2026-11-27): the type line ends with how many photos, videos, PDFs and spreadsheets the project
	// holds, once its panels have loaded (look.svelte loads them while a list shows).
	import { Stack } from '@layerd/ui';
	import Chips from './chips.svelte';
	import { countsOf } from './counts';
	import FileCounts from './file-counts.svelte';
	import type { ProjectType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import { facesOf } from './marks';
	import ProjectProgress from './project-progress.svelte';
	import ProjectRoute from './project-route.svelte';

	let {
		look,
		project,
		isLight = false
	}: { look: LookState; project: ProjectType; isLight?: boolean } = $props();

	const isArchived = $derived(project.status === 'Archived');
	const count = $derived(countsOf(look.workspaces[project.id] ?? []));
</script>

<span class="block min-w-0 flex-1 space-y-1">
	<span class="flex items-center justify-between gap-2">
		<span class="truncate font-medium {isLight ? 'text-white' : 'text-slate-900'}"
			>{project.title}</span
		>
		<Stack
			items={facesOf(project.team, { isMuted: isArchived })}
			size={22}
			max={3}
		/>
	</span>
	<span class="flex h-[19px] items-center justify-between gap-2">
		<Chips
			labels={project.type ? [project.type] : []}
			{isLight}
		/>
		<FileCounts
			{count}
			{isLight}
		/>
	</span>
	<ProjectRoute
		{look}
		{project}
		{isLight}
	/>
	<ProjectProgress
		{look}
		{project}
		{isLight}
	/>
</span>
