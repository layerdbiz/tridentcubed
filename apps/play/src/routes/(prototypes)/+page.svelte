<script lang="ts">
	import { topics } from './prototypes';
</script>

<svelte:head>
	<title>Trident Cubed Play</title>
</svelte:head>

<main class="min-h-dvh bg-slate-50 px-4 py-10 text-slate-900">
	<div class="mx-auto max-w-3xl">
		<h1 class="text-2xl font-semibold tracking-tight">Trident Cubed Play</h1>
		<p class="mt-1 text-slate-500">
			Ideas to try before they are built. Open each option, then say which one works best.
		</p>

		{#if topics.length}
			<ul class="mt-8 grid gap-3 sm:grid-cols-2">
				{#each topics as topic (topic.topic)}
					<li class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
						<h2 class="font-semibold">{topic.label}</h2>
						<div class="mt-3 flex flex-wrap gap-2">
							{#each topic.options as option (option.option)}
								<a
									href="/{option.topic}/{option.option}"
									class="rounded-full bg-slate-900 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
									>{option.label}</a
								>
							{/each}
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-8 text-slate-500">No prototypes yet.</p>
		{/if}

		<p class="mt-10 text-sm text-slate-400">
			<a
				href="/components"
				class="hover:text-slate-600">Library demos</a
			>
		</p>
	</div>
</main>
