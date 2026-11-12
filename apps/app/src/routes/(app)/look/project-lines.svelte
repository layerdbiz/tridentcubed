<script lang="ts">
	// PROTOTYPE (#161) run 18: what a project says about itself, written once (Justin, 2026-11-10: the card should
	// "look exactly like the list view"): its title and team, its Project Type as a label, where it goes, and its
	// progress. The list row shows it on white and the card lays the same lines over its photo (`isLight`). The label
	// line keeps its height when there is no type, so every row is as tall as the next.
	import Chips from './chips.svelte';
	import Faces from './faces.svelte';
	import type { ProjectType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import ProjectProgress from './project-progress.svelte';
	import ProjectRoute from './project-route.svelte';

	let {
		look,
		project,
		isLight = false
	}: { look: LookState; project: ProjectType; isLight?: boolean } = $props();

	const isArchived = $derived(project.status === 'Archived');
</script>

<span class="block min-w-0 flex-1 space-y-1">
	<span class="flex items-center justify-between gap-2">
		<span class="truncate font-medium {isLight ? 'text-white' : 'text-slate-900'}"
			>{project.title}</span
		>
		<Faces
			names={project.team}
			size={22}
			max={3}
			isMuted={isArchived}
		/>
	</span>
	<span class="flex h-[19px] items-center">
		<Chips
			labels={project.type ? [project.type] : []}
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
