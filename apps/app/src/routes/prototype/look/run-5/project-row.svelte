<script lang="ts">
	// PROTOTYPE (#161): one project as a row, in the phone's list, on the board and on a record's own page: the
	// customer's logo with the state as a dot on it, the title and team, where the trip starts and ends, and the bar.
	// The ⋮ sits top right and the › under it, the same as every other page's rows (record-row.svelte).
	import Faces from './faces.svelte';
	import type { ProjectType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import MoreMenu from './more-menu.svelte';
	import ProjectLogo from './project-logo.svelte';
	import ProjectProgress from './project-progress.svelte';
	import ProjectRoute from './project-route.svelte';

	let {
		look,
		project,
		size = 44
	}: { look: LookState; project: ProjectType; size?: number } = $props();

	const isArchived = $derived(project.status === 'Archived');
</script>

<div class="relative">
	<button
		class="flex min-h-[72px] w-full items-start gap-3 py-3 pr-12 pl-4 text-left transition active:bg-slate-50 {isArchived
			? 'opacity-60'
			: ''}"
		onclick={() => look.open(project.id)}
	>
		<ProjectLogo
			{project}
			{size}
			isMuted={isArchived}
		/>
		<span class="min-w-0 flex-1 space-y-1.5">
			<span class="flex items-center justify-between gap-2">
				<span class="truncate font-medium text-slate-900">{project.title}</span>
				<Faces
					names={project.team}
					size={22}
					max={3}
					isMuted={isArchived}
				/>
			</span>
			<ProjectRoute
				{look}
				{project}
			/>
			<ProjectProgress
				{look}
				{project}
			/>
		</span>
	</button>
	<div class="absolute top-2 right-1.5">
		<MoreMenu
			{look}
			page="projects"
			id={project.id}
			isOpenable
		/>
	</div>
	<span
		class="pointer-events-none absolute right-3.5 bottom-3 icon-[mdi--chevron-right] size-5 text-slate-300"
	></span>
</div>
