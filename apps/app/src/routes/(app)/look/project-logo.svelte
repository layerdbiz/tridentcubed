<script lang="ts">
	// PROTOTYPE (#161): a project's customer logo with the project's state as a dot at its top right, the way a team
	// member's photo shows their presence (Justin, 2026-10-26 19:22), so the list needs no state word. It is in every
	// row, so the library's avatar gets its props one by one, with no app component between (#379, measured).
	import { Avatar } from '@layerd/ui';
	import { PAGE_ICONS, STATUS, type ProjectType } from './look.data';
	import { logoOf } from './marks';

	let {
		project,
		size = 42,
		isMuted = false,
		ring = 'ring-white'
	}: { project: ProjectType; size?: number; isMuted?: boolean; ring?: string } = $props();

	const dot = $derived(Math.max(9, Math.round(size * 0.28)));
	const logo = $derived(
		logoOf(project.client, { shape: 'circle', fallback: PAGE_ICONS.projects, isMuted })
	);
</script>

<span
	class="relative inline-block shrink-0"
	style="width: {size}px; height: {size}px"
>
	<Avatar
		src={logo.src}
		alt={logo.alt}
		crossorigin={logo.crossorigin}
		fit={logo.fit}
		fallback={logo.fallback}
		{size}
		shape={logo.shape}
		ring={logo.ring}
		{isMuted}
		class={logo.class}
		title={logo.title}
	/>
	<span
		class="absolute top-0 right-0 rounded-full ring-2 {ring} {STATUS[project.status].dot}"
		style="width: {dot}px; height: {dot}px"
		title={project.status}
	></span>
</span>
