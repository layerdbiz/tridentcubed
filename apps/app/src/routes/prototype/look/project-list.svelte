<script lang="ts">
	// PROTOTYPE (#161): the one list with three views (pages.md: "One list, three views").
	import { BOARD_COLUMNS, PROJECTS, STATUS, type StatusType } from './look.data';
	import type { LookState } from './look.state.svelte';

	let { look, title = 'Projects' }: { look: LookState; title?: string } = $props();

	const TILES: (StatusType | 'All')[] = ['All', 'In Progress', 'Review', 'Sent', 'Revision'];
	const VIEWS = [
		{ id: 'table', label: 'Table', icon: 'icon-[mdi--table]' },
		{ id: 'cards', label: 'Cards', icon: 'icon-[mdi--view-grid-outline]' },
		{ id: 'board', label: 'Board', icon: 'icon-[mdi--view-column-outline]' }
	] as const;

	function countOf(tile: StatusType | 'All') {
		return tile === 'All'
			? PROJECTS.length
			: PROJECTS.filter((project) => project.status === tile).length;
	}

	function iconOf(tile: StatusType | 'All') {
		return tile === 'All' ? 'icon-[mdi--folder-multiple-outline]' : STATUS[tile].icon;
	}
</script>

<!-- Big number + status tiles (ScavengerBot: the filled tile is the selected one, and it filters the list) -->
<section class="space-y-5">
	<div>
		<p class="text-xs font-medium tracking-wide text-slate-500 uppercase">Open projects</p>
		<p class="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
			{PROJECTS.filter((project) => project.status !== 'Complete').length}
			<span class="align-middle text-sm font-medium text-emerald-600">+3 this week</span>
		</p>
	</div>

	<div
		class="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-5 md:gap-3 md:px-0"
	>
		{#each TILES as tile (tile)}
			{@const isOn = look.filter === tile}
			<button
				class="flex shrink-0 snap-start items-center gap-3 rounded-2xl border px-4 py-3 text-left transition duration-200 {isOn
					? 'border-primary bg-primary text-white shadow-lg shadow-primary/25'
					: 'border-slate-200 bg-white text-slate-700 hover:border-primary/40'}"
				onclick={() => (look.filter = tile)}
			>
				<span
					class="{iconOf(tile)} size-6 {isOn
						? 'text-white'
						: tile === 'All'
							? 'text-slate-400'
							: STATUS[tile].tone}"
				></span>
				<span class="leading-tight">
					<span class="block text-[11px] font-medium {isOn ? 'text-white/80' : 'text-slate-500'}"
						>{tile}</span
					>
					<span class="block text-lg font-semibold">{countOf(tile)}</span>
				</span>
			</button>
		{/each}
	</div>
</section>

<!-- List header -->
<div class="mt-8 mb-3 flex items-center justify-between">
	<h2 class="text-xl font-semibold text-slate-900 md:text-2xl">{title}</h2>
	<div class="flex items-center gap-2">
		<div class="flex rounded-full border border-slate-200 bg-white p-1">
			{#each VIEWS as view (view.id)}
				<button
					class="flex size-8 items-center justify-center rounded-full transition {look.view ===
					view.id
						? 'bg-slate-900 text-white'
						: 'text-slate-400 hover:text-slate-700'}"
					title={view.label}
					aria-label={view.label}
					aria-pressed={look.view === view.id}
					onclick={() => (look.view = view.id)}
				>
					<span class="{view.icon} size-5"></span>
				</button>
			{/each}
		</div>
		<button
			class="hidden items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:brightness-110 md:flex"
			onclick={() => (look.isNewOpen = true)}
		>
			<span class="icon-[mdi--plus] size-5"></span> New project
		</button>
	</div>
</div>

{#if look.projects.length === 0}
	<div
		class="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-slate-400"
	>
		<span class="icon-[mdi--sail-boat] size-14"></span>
		<p class="font-medium">Calm waters. Nothing here yet.</p>
	</div>
{:else if look.view === 'table'}
	<!-- Desktop table -->
	<div class="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
		<table class="w-full text-sm">
			<thead
				class="border-b-2 border-primary text-left text-[11px] tracking-wide text-slate-500 uppercase"
			>
				<tr>
					<th class="w-12 px-4 py-3"></th>
					<th class="py-3">Project</th>
					<th class="py-3">Client</th>
					<th class="py-3">Carrier</th>
					<th class="py-3">Status</th>
					<th class="py-3">Team</th>
					<th class="px-4 py-3 text-right">Updated</th>
				</tr>
			</thead>
			<tbody>
				{#each look.projects as project (project.id)}
					<tr
						class="cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-slate-50"
						onclick={() => look.open(project.id)}
					>
						<td class="px-4 py-3"
							><span class="{STATUS[project.status].icon} {STATUS[project.status].tone} size-6"
							></span></td
						>
						<td class="py-3">
							<span class="block font-medium text-slate-900">{project.title}</span>
							<span class="text-xs text-slate-400">{project.number} · {project.type}</span>
						</td>
						<td class="py-3 text-slate-600">{project.client}</td>
						<td class="py-3 text-slate-600">{project.carrier}</td>
						<td class="py-3"
							><span class="text-xs font-medium {STATUS[project.status].tone}"
								>{project.status}</span
							></td
						>
						<td class="py-3">
							<div class="flex -space-x-2">
								{#each project.team as person (person)}
									<span
										class="flex size-7 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-semibold text-slate-600"
										>{person}</span
									>
								{/each}
							</div>
						</td>
						<td class="px-4 py-3 text-right text-xs text-slate-400">{project.updated}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<!-- Phone rows (ScavengerBot: icon first, two lines, chevron) -->
	<ul
		class="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white md:hidden"
	>
		{#each look.projects as project (project.id)}
			<li>
				<button
					class="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50"
					onclick={() => look.open(project.id)}
				>
					<span class="{STATUS[project.status].icon} {STATUS[project.status].tone} size-7 shrink-0"
					></span>
					<span class="min-w-0 flex-1">
						<span class="block truncate font-medium text-slate-900">{project.title}</span>
						<span class="block truncate text-xs text-slate-500"
							>{project.client} · {project.number}</span
						>
					</span>
					<span class="icon-[mdi--chevron-right] size-5 text-slate-300"></span>
				</button>
			</li>
		{/each}
	</ul>
{:else if look.view === 'cards'}
	<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
		{#each look.projects as project (project.id)}
			<button
				class="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
				onclick={() => look.open(project.id)}
			>
				<div class="flex items-start justify-between">
					<span class="{STATUS[project.status].icon} {STATUS[project.status].tone} size-7"></span>
					<span class="text-[11px] text-slate-400">{project.updated}</span>
				</div>
				<p class="mt-3 font-semibold text-slate-900">{project.title}</p>
				<p class="text-xs text-slate-500">{project.client}</p>
				<p class="mt-1 flex items-center gap-1 text-xs text-slate-400">
					<span class="icon-[mdi--ferry] size-4"></span>{project.carrier}
				</p>
				<div class="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
					<div
						class="h-full rounded-full bg-primary"
						style="width: {project.progress}%"
					></div>
				</div>
			</button>
		{/each}
	</div>
{:else}
	<div class="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
		{#each BOARD_COLUMNS as column (column)}
			{@const items = look.projects.filter((project) => project.status === column)}
			<div class="w-64 shrink-0 snap-start rounded-2xl bg-slate-100/70 p-2">
				<p class="flex items-center gap-2 px-2 py-2 text-xs font-semibold text-slate-600">
					<span class="size-2 rounded-full {STATUS[column].dot}"></span>{column}
					<span class="ml-auto text-slate-400">{items.length}</span>
				</p>
				<div class="space-y-2">
					{#each items as project (project.id)}
						<button
							class="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:shadow-md"
							onclick={() => look.open(project.id)}
						>
							<p class="text-sm font-medium text-slate-900">{project.title}</p>
							<p class="text-xs text-slate-500">{project.client}</p>
						</button>
					{:else}
						<p class="px-2 py-4 text-center text-xs text-slate-400">Nothing here</p>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}
