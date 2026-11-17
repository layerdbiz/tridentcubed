<script lang="ts">
	// PROTOTYPE (#161): one project as a row, in the phone's list, on the board and on a record's own page: the
	// customer's logo with the state as a dot on it, the title and team, where the trip starts and ends, and the bar.
	// The ⋮ sits top right and the › under it, the same as every other page's rows (record-row.svelte).
	import type { ProjectType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import MoreMenu from './more-menu.svelte';
	import ProjectLines from './project-lines.svelte';
	import ProjectLogo from './project-logo.svelte';

	let {
		look,
		project,
		size = 44
	}: { look: LookState; project: ProjectType; size?: number } = $props();

	const isArchived = $derived(project.status === 'Archived');
</script>

<div class="relative">
	<button
		class="flex min-h-[100px] w-full items-center gap-3 py-2.5 pr-12 pl-4 text-left transition active:bg-slate-50 {isArchived
			? 'opacity-60'
			: ''}"
		onclick={() => look.open(project.id)}
	>
		<ProjectLogo
			{project}
			{size}
			isMuted={isArchived}
		/>
		<ProjectLines
			{look}
			{project}
		/>
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
