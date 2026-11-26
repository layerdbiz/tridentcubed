<script lang="ts">
	// PROTOTYPE (#161): a project's bar in its state's colour, with its percent, in every list row and the table.
	import { ProgressBar } from '@layerd/ui';
	import { STATUS, type ProjectType } from './look.data';
	import type { LookState } from './look.state.svelte';

	let {
		look,
		project,
		isLight = false
	}: { look: LookState; project: ProjectType; isLight?: boolean } = $props();

	const progress = $derived(look.progressOf(project));
</script>

<span class="flex w-full items-center gap-2">
	<ProgressBar
		value={progress}
		label="{project.title} progress"
		track={isLight ? 'bg-white/25' : 'bg-slate-900/[0.06]'}
		fill={STATUS[project.status].bar}
		class="flex-1"
		sm
	/>
	<span
		class="w-9 text-right text-xs font-semibold tabular-nums {isLight
			? 'text-white'
			: 'text-slate-600'}">{progress}%</span
	>
</span>
