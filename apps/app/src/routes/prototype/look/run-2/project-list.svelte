<script lang="ts">
	// PROTOTYPE (#161): the one list with three views (pages.md: "One list, three views"), carrying everything
	// the app prototype's list shows: progress bar and percent, team faces, status, updated, Open and Delete.
	import { flip } from 'svelte/animate';
	import { BOARD_COLUMNS, personOf, STATUS, type ProjectType, type StatusType } from './look.data';
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
			? look.projects.length
			: look.projects.filter((project) => project.status === tile).length;
	}

	function iconOf(tile: StatusType | 'All') {
		return tile === 'All' ? 'icon-[mdi--folder-multiple-outline]' : STATUS[tile].icon;
	}

	function isArchived(project: ProjectType) {
		return project.status === 'Archived';
	}
</script>

{#snippet faces(project: ProjectType, size: string)}
	<span class="flex -space-x-2">
		{#each project.team as name, index (name)}
			<img
				src={personOf(name).photo}
				alt={name}
				title={name}
				class="{size} rounded-full border-2 object-cover {index === 0
					? 'border-primary'
					: 'border-white'} {isArchived(project) ? 'grayscale' : ''}"
			/>
		{/each}
	</span>
{/snippet}

{#snippet bar(project: ProjectType, isWide = false)}
	{@const progress = look.progressOf(project)}
	<span class="flex items-center gap-2 {isWide ? 'w-full' : 'w-40'}">
		<span class="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
			<span
				class="block h-full rounded-full transition-[width] duration-500 {isArchived(project)
					? 'bg-slate-400'
					: progress >= 100
						? 'bg-success'
						: 'bg-primary'}"
				style="width: {progress}%"
			></span>
		</span>
		<span class="w-9 text-right text-xs font-semibold text-slate-600 tabular-nums">{progress}%</span
		>
	</span>
{/snippet}

{#snippet pill(status: StatusType)}
	<span
		class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap {STATUS[
			status
		].pill}"><span class="{STATUS[status].icon} size-3.5"></span>{status}</span
	>
{/snippet}

<!-- Big number + status tiles (ScavengerBot: the filled tile is the selected one, and it filters the list) -->
<section class="space-y-5">
	<div>
		<p class="text-xs font-medium tracking-wide text-slate-500 uppercase">Open projects</p>
		<p class="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
			{look.projects.filter((project) => !['Complete', 'Archived'].includes(project.status)).length}
			<span class="align-middle text-sm font-medium text-success">+3 this week</span>
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

{#if look.visible.length === 0}
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
					<th class="py-3">Team</th>
					<th class="py-3">Status</th>
					<th class="py-3">Progress</th>
					<th class="py-3">Updated</th>
					<th class="px-4 py-3 text-right">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each look.visible as project (project.id)}
					<tr
						class="border-b border-slate-100 transition last:border-0 {isArchived(project)
							? 'bg-slate-50 text-slate-400'
							: 'hover:bg-slate-50'}"
						animate:flip={{ duration: 200 }}
					>
						<td class="px-4 py-3"
							><span class="{STATUS[project.status].icon} {STATUS[project.status].tone} size-6"
							></span></td
						>
						<td class="py-3">
							<button
								class="text-left"
								onclick={() => look.open(project.id)}
							>
								<span
									class="block font-medium hover:text-primary {isArchived(project)
										? 'text-slate-500'
										: 'text-slate-900'}">{project.title}</span
								>
								<span class="text-xs text-slate-400">{project.number} · {project.type}</span>
							</button>
						</td>
						<td class="py-3 {isArchived(project) ? '' : 'text-slate-600'}">{project.client}</td>
						<td class="py-3">{@render faces(project, 'size-8')}</td>
						<td class="py-3">{@render pill(project.status)}</td>
						<td class="py-3">{@render bar(project)}</td>
						<td class="py-3 text-xs text-slate-400">{project.updated}</td>
						<td class="px-4 py-3">
							<span class="flex justify-end gap-1.5">
								<button
									class="rounded-full px-4 py-1.5 text-xs font-semibold text-white {isArchived(
										project
									)
										? 'bg-slate-400'
										: 'bg-primary hover:brightness-110'}"
									onclick={() => look.open(project.id)}>Open</button
								>
								<button
									class="flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-danger/10 hover:text-danger"
									aria-label="Delete {project.title}"
									title="Delete (moves to Trash)"
									onclick={() => look.remove(project.id)}
									><span class="icon-[mdi--trash-can-outline] size-5"></span></button
								>
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<!-- Phone rows (ScavengerBot: icon first, two lines), with the progress bar under -->
	<ul
		class="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white md:hidden"
	>
		{#each look.visible as project (project.id)}
			<li
				class={isArchived(project) ? 'bg-slate-50 opacity-70' : ''}
				animate:flip={{ duration: 200 }}
			>
				<button
					class="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50"
					onclick={() => look.open(project.id)}
				>
					<span class="{STATUS[project.status].icon} {STATUS[project.status].tone} size-7 shrink-0"
					></span>
					<span class="min-w-0 flex-1 space-y-1.5">
						<span class="block truncate font-medium text-slate-900">{project.title}</span>
						<span class="flex items-center justify-between gap-2">
							<span class="truncate text-xs text-slate-500">{project.client}</span>
							{@render faces(project, 'size-6')}
						</span>
						{@render bar(project, true)}
					</span>
					<span class="icon-[mdi--chevron-right] size-5 shrink-0 text-slate-300"></span>
				</button>
			</li>
		{/each}
	</ul>
{:else if look.view === 'cards'}
	<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
		{#each look.visible as project (project.id)}
			<article
				class="flex flex-col rounded-3xl border p-4 transition {isArchived(project)
					? 'border-slate-200 bg-slate-100 text-slate-500'
					: 'border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-lg'}"
				animate:flip={{ duration: 200 }}
			>
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<p class="font-semibold {isArchived(project) ? '' : 'text-slate-900'}">
							{project.title}
						</p>
						<p class="text-sm text-slate-500">{project.client}</p>
					</div>
					{@render pill(project.status)}
				</div>
				<dl class="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-xs">
					<div>
						<dt class="text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
							Facility
						</dt>
						<dd class="mt-0.5 text-slate-700">{project.facility}</dd>
					</div>
					<div>
						<dt class="text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
							Updated
						</dt>
						<dd class="mt-0.5 text-slate-700">{project.updated}</dd>
					</div>
					<div class="col-span-2">
						<dt class="mb-1 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
							Team
						</dt>
						<dd>{@render faces(project, 'size-8')}</dd>
					</div>
				</dl>
				<p class="mt-4 mb-1.5 text-xs font-medium text-slate-500">Progress</p>
				{@render bar(project, true)}
				<div class="mt-4 flex gap-2">
					<button
						class="flex-1 rounded-full py-2 text-sm font-semibold text-white {isArchived(project)
							? 'bg-slate-400'
							: 'bg-primary hover:brightness-110'}"
						onclick={() => look.open(project.id)}>Open</button
					>
					<button
						class="flex-1 rounded-full border border-slate-200 bg-white py-2 text-sm font-medium text-slate-600 hover:border-danger/40 hover:text-danger"
						onclick={() => look.remove(project.id)}>Delete</button
					>
				</div>
			</article>
		{/each}
	</div>
{:else}
	<div class="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
		{#each BOARD_COLUMNS as column (column)}
			{@const items = look.visible.filter((project) => project.status === column)}
			<div class="w-64 shrink-0 snap-start rounded-2xl bg-slate-100/70 p-2">
				<p class="flex items-center gap-2 px-2 py-2 text-xs font-semibold text-slate-600">
					<span class="size-2 rounded-full {STATUS[column].dot}"></span>{column}
					<span class="ml-auto text-slate-400">{items.length}</span>
				</p>
				<div class="space-y-2">
					{#each items as project (project.id)}
						<button
							class="w-full space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:shadow-md"
							onclick={() => look.open(project.id)}
						>
							<span class="block text-sm font-medium text-slate-900">{project.title}</span>
							<span class="flex items-center justify-between">
								<span class="truncate text-xs text-slate-500">{project.client}</span>
								{@render faces(project, 'size-6')}
							</span>
							{@render bar(project, true)}
						</button>
					{:else}
						<p class="px-2 py-4 text-center text-xs text-slate-400">Nothing here</p>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}
