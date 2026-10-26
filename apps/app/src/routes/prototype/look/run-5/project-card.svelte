<script lang="ts">
	// PROTOTYPE (#161): a project in the Cards view. Run 10 took Airbnb's card (the report's photos to swipe through,
	// dots, the state top left, the ⋮ top right). Run 11 (Justin, 2026-10-26 19:22: "see what you can do there with
	// your own design"): nothing under the photo; everything the list row shows sits on the photo over a dark fade:
	// the customer's logo with its state dot, the title and progress, where the trip starts and ends, the team. The
	// state label is filled with its own colour. A project with no photos shows a dark card with its customer's logo.
	import ClientLogo from './client-logo.svelte';
	import Faces from './faces.svelte';
	import { STATUS, type ProjectType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import ProjectLogo from './project-logo.svelte';
	import ProjectMenu from './project-menu.svelte';
	import ProjectRoute from './project-route.svelte';

	let { look, project }: { look: LookState; project: ProjectType } = $props();

	const DOTS = 5;
	const status = $derived(STATUS[project.status]);
	const progress = $derived(look.progressOf(project));
	const isArchived = $derived(project.status === 'Archived');
	// The photos the report prints: switched-on photo panels, in order. The sample projects share one set of photos,
	// so each starts the strip at a different one and the grid does not repeat (prototype only).
	const photos = $derived.by(() => {
		const all = (look.workspaces[project.id] ?? [])
			.filter((panel) => panel.kind === 'photos' && panel.isEnabled)
			.flatMap((panel) => panel.groups.flatMap((group) => group.photos))
			.slice(0, 10);
		const turn =
			Math.max(
				0,
				look.projects.findIndex((item) => item.id === project.id)
			) % (all.length || 1);
		return [...all.slice(turn), ...all.slice(0, turn)];
	});

	let strip: HTMLDivElement | undefined = $state();
	let at = $state(0);
	// At most five dots; with more photos the row slides along, its end dots smaller.
	const first = $derived(Math.max(0, Math.min(at - 2, photos.length - DOTS)));
	const dots = $derived(
		Array.from({ length: Math.min(DOTS, photos.length) }, (_, index) => first + index)
	);

	function onscroll() {
		if (strip?.clientWidth) at = Math.round(strip.scrollLeft / strip.clientWidth);
	}

	function step(by: number) {
		strip?.scrollTo({ left: (at + by) * strip.clientWidth, behavior: 'smooth' });
	}

	function isSmall(dot: number) {
		return (
			(dot === dots[0] && dot > 0) || (dot === dots.at(-1) && dot < photos.length - 1 && dot !== at)
		);
	}
</script>

<article class="group/card relative {isArchived ? 'opacity-60' : ''}">
	<div class="relative aspect-square overflow-hidden rounded-3xl bg-slate-900 sm:aspect-[5/4]">
		{#if photos.length}
			<div
				bind:this={strip}
				class="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
				data-swipe-ignore
				{onscroll}
			>
				{#each photos as photo (photo.id)}
					<button
						class="h-full w-full shrink-0 snap-center"
						aria-label="Open {project.title}"
						onclick={() => look.open(project.id)}
						><img
							src={photo.src}
							alt=""
							loading="lazy"
							draggable="false"
							class="size-full object-cover"
						/></button
					>
				{/each}
			</div>
			{#if photos.length > 1}
				{#if at > 0}
					<button
						class="absolute top-[38%] left-3 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-md transition hover:scale-105 md:group-hover/card:flex"
						aria-label="Previous photo"
						onclick={() => step(-1)}><span class="icon-[mdi--chevron-left] size-5"></span></button
					>
				{/if}
				{#if at < photos.length - 1}
					<button
						class="absolute top-[38%] right-3 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-md transition hover:scale-105 md:group-hover/card:flex"
						aria-label="Next photo"
						onclick={() => step(1)}><span class="icon-[mdi--chevron-right] size-5"></span></button
					>
				{/if}
			{/if}
		{:else}
			<button
				class="flex size-full flex-col items-center gap-2 bg-linear-to-br from-slate-700 to-slate-950 pt-[16%]"
				aria-label="Open {project.title}"
				onclick={() => look.open(project.id)}
			>
				<ClientLogo
					name={project.client}
					size={72}
					shape="circle"
					isMuted={isArchived}
				/>
				<span class="text-xs font-medium text-white/50">No photos yet</span>
			</button>
		{/if}
		<!-- Everything the list row shows, on a dark fade over the photo's lower half. Taps fall through to the photo. -->
		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950/90 via-slate-950/60 to-transparent px-4 pt-14 pb-4"
		>
			{#if photos.length > 1}
				<span class="mb-3 flex items-center justify-center gap-1.5">
					{#each dots as dot (dot)}
						<span
							class="rounded-full bg-white transition-all {dot === at
								? 'size-[7px]'
								: isSmall(dot)
									? 'size-1 opacity-50'
									: 'size-1.5 opacity-50'}"
						></span>
					{/each}
				</span>
			{/if}
			<span class="flex items-center gap-3">
				<ProjectLogo
					{project}
					size={44}
					isMuted={isArchived}
				/>
				<span class="min-w-0 flex-1 space-y-1">
					<span class="flex items-baseline gap-2">
						<span class="min-w-0 flex-1 truncate font-semibold text-white">{project.title}</span>
						<span class="shrink-0 text-sm font-semibold text-white tabular-nums">{progress}%</span>
					</span>
					<span class="flex items-center justify-between gap-2">
						<ProjectRoute
							{look}
							{project}
							isLight
						/>
						<Faces
							names={project.team}
							size={22}
							max={3}
							isMuted={isArchived}
						/>
					</span>
				</span>
			</span>
		</div>
		<span class="absolute inset-x-0 bottom-0 h-1 bg-white/15"
			><span
				class="block h-full transition-[width] duration-500 {status.bar}"
				style="width: {progress}%"
			></span></span
		>
	</div>
	<span
		class="pointer-events-none absolute top-3 left-3 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-sm {status.bar}"
		>{project.status}</span
	>
	<div class="absolute top-2 right-2">
		<ProjectMenu
			{look}
			{project}
			isOpenable
			tone="photo"
		/>
	</div>
</article>
