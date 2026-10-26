<script lang="ts">
	// PROTOTYPE (#161): a project's customer logo with the project's state as a dot at its top right, the way a team
	// member's photo shows their presence (Justin, 2026-10-26 19:22), so the list needs no state word.
	import ClientLogo from './client-logo.svelte';
	import { STATUS, type ProjectType } from './look.data';

	let {
		project,
		size = 42,
		isMuted = false,
		ring = 'ring-white'
	}: { project: ProjectType; size?: number; isMuted?: boolean; ring?: string } = $props();

	const dot = $derived(Math.max(9, Math.round(size * 0.28)));
</script>

<span
	class="relative inline-block shrink-0"
	style="width: {size}px; height: {size}px"
>
	<ClientLogo
		name={project.client}
		{size}
		shape="circle"
		{isMuted}
	/>
	<span
		class="absolute top-0 right-0 rounded-full ring-2 {ring} {STATUS[project.status].dot}"
		style="width: {dot}px; height: {dot}px"
		title={project.status}
	></span>
</span>
