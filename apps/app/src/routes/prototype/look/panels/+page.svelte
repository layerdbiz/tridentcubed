<script lang="ts">
	// PROTOTYPE (#161) run 27: the Transport Mode Panel on a page of its own (Justin, 2026-11-12: "an actual
	// prototype standalone that I can go and click on and make annotations with"). It is the real panel, so
	// everything in it can be clicked (parts/panel-stage.svelte), and it edits the same project's trip the app has.
	// The artifact he writes notes on is built from the same stage. ?project=p2 opens another project. Throwaway,
	// like the rest of the prototype.
	import '../parts/look.css';
	import { page } from '$app/state';
	import { LookState } from '../parts/look.state.svelte';
	import PanelStage from '../parts/panel-stage.svelte';

	const look = new LookState();
	const asked = page.url.searchParams.get('project');
	look.open(
		look.projects.some((project) => project.id === asked) ? asked! : look.projectId,
		'edit'
	);
</script>

<svelte:head><title>Transport Mode Panel · Trident Cubed</title></svelte:head>

<div class="look min-h-dvh bg-slate-100 font-sans text-slate-900 [color-scheme:light]">
	<header class="mx-auto max-w-xl px-4 pt-6 pb-4">
		<a
			class="inline-flex items-center gap-1 text-sm font-medium text-primary"
			href="/prototype/look"><span class="icon-[mdi--chevron-left] size-5"></span>Back to the app</a
		>
		<h1 class="mt-2 text-2xl font-semibold tracking-tight">Transport Mode Panel</h1>
		<label class="mt-3 block max-w-sm">
			<span class="mb-1 block text-xs font-medium text-slate-500">Project</span>
			<select
				class="w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
				value={look.projectId}
				onchange={(event) => look.open(event.currentTarget.value, 'edit')}
			>
				{#each look.projects as project (project.id)}
					<option value={project.id}>{project.title}</option>
				{/each}
			</select>
		</label>
	</header>
	<main class="mx-auto max-w-xl px-4 pb-20">
		<PanelStage {look} />
	</main>
</div>
