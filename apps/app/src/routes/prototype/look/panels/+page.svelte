<script lang="ts">
	// PROTOTYPE (#161) run 27: the Transport Mode Panel on a page of its own (Justin, 2026-11-12: "an actual
	// prototype standalone that I can go and click on and make annotations with"). Prototype B, the one he kept
	// (C was dropped the same day), as the real panel, so everything in it can be clicked. It edits the same
	// project's trip the app has, so a change here shows in the app.
	// ?project=p2 opens another project. Throwaway, like the rest of the prototype.
	import '../parts/look.css';
	import { page } from '$app/state';
	import Confirm from '../parts/confirm.svelte';
	import { LookState } from '../parts/look.state.svelte';
	import PanelBody from '../parts/panel-body.svelte';

	const LOOKS = [['B', 'A card for each leg']];

	const look = new LookState();
	const asked = page.url.searchParams.get('project');
	look.open(
		look.projects.some((project) => project.id === asked) ? asked! : look.projectId,
		'edit'
	);

	const panel = $derived(look.panels.find((item) => item.kind === 'transport'));
</script>

<svelte:head><title>Transport Mode Panel · Trident Cubed</title></svelte:head>

<div class="look min-h-dvh bg-slate-100 font-sans text-slate-900 [color-scheme:light]">
	<header class="mx-auto max-w-5xl px-4 pt-6 pb-4">
		<a
			class="inline-flex items-center gap-1 text-sm font-medium text-primary"
			href="/prototype/look"><span class="icon-[mdi--chevron-left] size-5"></span>Back to the app</a
		>
		<h1 class="mt-2 text-2xl font-semibold tracking-tight">Transport Mode Panel</h1>
		<p class="mt-1 text-sm text-slate-500">
			Prototype B, as the real panel. It edits the same trip the app has.
		</p>
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
	<main class="mx-auto grid max-w-5xl items-start gap-6 px-4 pb-20 md:max-w-xl md:px-0">
		{#each LOOKS as [letter, name] (letter)}
			<section aria-label="Prototype {letter}">
				<h2 class="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
					<span
						class="flex size-7 items-center justify-center rounded-full bg-primary text-xs text-white"
						>{letter}</span
					>{name}
				</h2>
				<div class="rounded-[28px] bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.05)]">
					{#if panel}
						{#key look.projectId}
							<PanelBody
								{look}
								{panel}
								transport={letter}
							/>
						{/key}
					{:else}
						<p class="text-sm text-slate-400">This project has no Transport Mode panel.</p>
					{/if}
				</div>
			</section>
		{/each}
	</main>
	<Confirm {look} />
</div>
