<script lang="ts">
	// PROTOTYPE (#161): a project's bar in its state's colour, with its percent, in every list row and the table.
	import { STATUS, type ProjectType } from './look.data';
	import type { LookState } from './look.state.svelte';

	let { look, project }: { look: LookState; project: ProjectType } = $props();

	const progress = $derived(look.progressOf(project));
</script>

<span class="flex w-full items-center gap-2">
	<span class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-900/[0.06]">
		<span
			class="block h-full rounded-full transition-[width] duration-500 {STATUS[project.status].bar}"
			style="width: {progress}%"
		></span>
	</span>
	<span class="w-9 text-right text-xs font-semibold text-slate-600 tabular-nums">{progress}%</span>
</span>
