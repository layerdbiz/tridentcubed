<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Button, Table, Text } from '@layerd/ui';
	import type { TableColumn } from '@layerd/ui';
	import * as projectAssets from './projects.assets';
	import * as projectConstants from './projects.constants';
	import * as projectDataUtils from './projects.data';
	import { fetchProjectDefinitions } from './projects.remote';
	import * as projectSchemas from './projects.schema';
	import * as projectStates from './projects.state';
	import type * as projectTypes from './projects.types';

	const projectDefinitions = await fetchProjectDefinitions();
	const projectSchema = projectSchemas.createProjectSchema(projectDefinitions);
	const tableColumns: TableColumn[] = [
		{ key: 'title', label: 'Project' },
		{ key: 'client', label: 'Client' },
		{ key: 'facility', label: 'Facility' },
		{ key: 'status', label: 'Status', align: 'center', width: '140px' },
		{ key: 'progress', label: 'Progress', align: 'center', width: '96px' },
		{ key: 'updatedAt', label: 'Updated', align: 'right', width: '160px' },
		{ key: 'actions', label: 'Actions', align: 'right', width: '220px' }
	];

	let projectRows = $state<projectTypes.ProjectListRowType[]>([]);
	let isLoaded = $state(false);

	function formatTimestamp(value: string): string {
		if (!value) return '—';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '—';

		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	}

	function getStatusClass(status: string): string {
		if (status === 'Complete') return 'bg-success-500/12 text-success-700';
		if (status === 'In Progress') return 'bg-warning-500/12 text-warning-700';
		return 'bg-secondary-200 text-neutral-600';
	}

	function refreshProjectRows() {
		const registry = projectStates.ensureSeedProjects(projectSchema)
			.slice()
			.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

		projectRows = registry.map((entry) =>
			projectDataUtils.createProjectListRow(
				projectDefinitions,
				projectStates.loadState(projectSchema, projectConstants.getProjectStorageKey(entry.id)),
				entry
			)
		);
		isLoaded = true;
	}

	async function handleCreateProject() {
		const entry = projectStates.createProjectRecord(projectSchema);
		refreshProjectRows();
		await goto(`/projects/${entry.id}`);
	}

	async function handleDeleteProject(projectId: string) {
		if (!window.confirm('Delete this project? This cannot be undone.')) return;

		const state = projectStates.loadState(
			projectSchema,
			projectConstants.getProjectStorageKey(projectId)
		);
		await projectAssets.removeSectionAssets(state.sections);
		projectStates.deleteProjectRecord(projectId);
		refreshProjectRows();
	}

	onMount(() => {
		refreshProjectRows();
	});
</script>

<div class="min-h-svh bg-secondary-50 px-4 py-6 md:px-6 md:py-8">
	<div class="mx-auto flex max-w-7xl flex-col gap-6">
		<div class="flex flex-col gap-4 rounded-4xl border border-secondary-200 bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
			<div class="space-y-2">
				<Text h1="Projects" />
				<Text p="Browse local project states, open an existing workspace, or create a new report from the same browser-only data model used by the editor." class="max-w-3xl text-neutral" />
			</div>
			<Button xl primary variant="text" label="Add New Project" onclick={handleCreateProject} />
		</div>

		<div class="overflow-hidden rounded-4xl border border-secondary-200 bg-white p-4 shadow-sm md:p-6">
			{#if isLoaded && !projectRows.length}
				<div class="rounded-3xl border border-dashed border-secondary-300 bg-secondary-50 p-10 text-center">
					<Text h3="No Projects Yet" />
					<Text p="Create the first project to start building reports in the editor workspace." class="mt-2 text-neutral" />
				</div>
			{:else}
				<Table columns={tableColumns} data={projectRows} hoverable>
					<table class="w-full table-fixed border-separate border-spacing-y-2">
						<thead>
							<tr>
								{#each tableColumns as column (column.key)}
									<th class={`px-3 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500 ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}`} style={column.width ? `width: ${column.width}` : ''}>
										{column.label}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each projectRows as row (row.id)}
								<tr class="overflow-hidden rounded-2xl border border-secondary-200 bg-secondary-50/50 transition hover:border-secondary-300 hover:bg-white">
									<td class="rounded-l-2xl px-3 py-4 align-middle">
										<div class="space-y-1">
											<p class="text-sm font-semibold text-neutral-900">{row.title}</p>
											<!-- <p class="text-xs uppercase tracking-[0.12em] text-neutral-500">{row.id}</p> -->
										</div>
									</td>
									<td class="px-3 py-4 text-sm text-neutral-700 align-middle">{row.client}</td>
									<td class="px-3 py-4 text-sm text-neutral-700 align-middle">{row.facility}</td>
									<td class="px-3 py-4 text-center align-middle">
										<span class={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getStatusClass(row.status)}`}>{row.status}</span>
									</td>
									<td class="px-3 py-4 text-center text-sm font-semibold text-neutral-800 align-middle">{row.progress}</td>
									<td class="px-3 py-4 text-right text-sm text-neutral-600 align-middle">{formatTimestamp(row.updatedAt)}</td>
									<td class="rounded-r-2xl px-3 py-4 align-middle">
										<div class="flex justify-end gap-2">
											<Button sm primary variant="text" label="Open" href={`/projects/${row.id}`} />
											<Button sm outline variant="text" label="Delete" onclick={() => handleDeleteProject(row.id)} />
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</Table>
			{/if}
		</div>
	</div>
</div>

<style lang="postcss">
	@reference "#app.css";
</style>