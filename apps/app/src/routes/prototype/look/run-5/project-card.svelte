<script lang="ts">
	// PROTOTYPE (#161): a project in the Cards view, after the way Airbnb shows a stay (Justin, 2026-10-26 16:34): the
	// project's report photos to swipe through with dots under them (arrows on a desktop hover), its state on the
	// photo's top left and the ⋮ on its top right; under the photo the client's logo with the project's name beside
	// it, then the rest in two quiet lines. A project with no photos yet shows its client's logo. The progress runs
	// along the photo's bottom edge.
	import ClientLogo from './client-logo.svelte';
	import Faces from './faces.svelte';
	import { STATUS, type ProjectType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import ProjectMenu from './project-menu.svelte';

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
	<div class="relative aspect-[4/3] overflow-hidden rounded-3xl bg-slate-100">
		{#if photos.length}
			<div
				bind:this={strip}
				class="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
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
				<span
					class="pointer-events-none absolute inset-x-0 bottom-4 flex items-center justify-center gap-1.5"
				>
					{#each dots as dot (dot)}
						<span
							class="rounded-full bg-white shadow-[0_0_2px_rgb(0_0_0/0.4)] transition-all {dot ===
							at
								? 'size-[7px]'
								: isSmall(dot)
									? 'size-1 opacity-60'
									: 'size-1.5 opacity-60'}"
						></span>
					{/each}
				</span>
				{#if at > 0}
					<button
						class="absolute top-1/2 left-3 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-md transition hover:scale-105 md:group-hover/card:flex"
						aria-label="Previous photo"
						onclick={() => step(-1)}><span class="icon-[mdi--chevron-left] size-5"></span></button
					>
				{/if}
				{#if at < photos.length - 1}
					<button
						class="absolute top-1/2 right-3 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-md transition hover:scale-105 md:group-hover/card:flex"
						aria-label="Next photo"
						onclick={() => step(1)}><span class="icon-[mdi--chevron-right] size-5"></span></button
					>
				{/if}
			{/if}
		{:else}
			<button
				class="flex size-full flex-col items-center justify-center gap-3 bg-linear-to-br from-slate-100 to-slate-200/80"
				aria-label="Open {project.title}"
				onclick={() => look.open(project.id)}
			>
				<ClientLogo
					name={project.client}
					size={72}
					isMuted={isArchived}
				/>
				<span class="text-xs font-medium text-slate-400">No photos yet</span>
			</button>
		{/if}
		<span class="absolute inset-x-0 bottom-0 h-1 bg-slate-900/15"
			><span
				class="block h-full transition-[width] duration-500 {status.bar}"
				style="width: {progress}%"
			></span></span
		>
	</div>
	<span
		class="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm"
		><span class="size-2 rounded-full {status.dot}"></span>{project.status}</span
	>
	<div class="absolute top-2 right-2">
		<ProjectMenu
			{look}
			{project}
			isOpenable
			tone={photos.length ? 'photo' : 'plain'}
		/>
	</div>
	<button
		class="mt-3 flex w-full items-start gap-3 text-left"
		onclick={() => look.open(project.id)}
	>
		<ClientLogo
			name={project.client}
			size={44}
			isMuted={isArchived}
		/>
		<span class="min-w-0 flex-1">
			<span class="flex items-baseline gap-2">
				<span class="min-w-0 flex-1 truncate font-semibold text-slate-900">{project.title}</span>
				<span class="shrink-0 text-sm font-semibold text-slate-900 tabular-nums">{progress}%</span>
			</span>
			<span class="block truncate text-sm text-slate-500"
				>{project.client} · {project.location}</span
			>
			<span class="mt-1 flex items-center justify-between gap-2 text-sm text-slate-500">
				<span class="truncate">{project.dates} · {project.updated}</span>
				<Faces
					names={project.team}
					size={22}
					max={3}
					isMuted={isArchived}
				/>
			</span>
		</span>
	</button>
</article>
