<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Logo, Button, mq, Table, Text, Component } from '@layerd/ui';
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
		{ key: 'team', label: 'Team', align: 'center', width: '116px' },
		{ key: 'status', label: 'Status', align: 'center', width: '140px' },
		{ key: 'progress', label: 'Progress', align: 'center', width: '188px' },
		{ key: 'updatedAt', label: 'Updated', align: 'right', width: '160px' },
		{ key: 'actions', label: 'Actions', align: 'right', width: '220px' }
	];

	let projectRows = $state<projectTypes.ProjectListRowType[]>([]);
	let isLoaded = $state(false);
	let isPreviewIntroOpen = $state(true);
	let isResettingPreviewData = $state(false);

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
		if (status === 'Draft') return 'bg-slate-400/15 text-slate-700';
		if (status === 'In Progress') return 'bg-blue-500/15 text-blue-700';
		if (status === 'Review' || status === 'Ready for Review') {
			return 'bg-warning-500/15 text-warning-600';
		}
		if (status === 'Sent') return 'bg-violet-500/15 text-violet-700';
		if (status === 'Complete') return 'bg-green-500/15 text-green-700';
		if (status === 'Archived') return 'bg-neutral-200 text-neutral-500';
		return 'bg-secondary-200 text-neutral-600';
	}

	function getStatusLabel(status: string): string {
		return status === 'Ready for Review' ? 'Review' : status;
	}

	function getProgressClass(status: string): string {
		if (status === 'Draft') return 'bg-slate-400';
		if (status === 'In Progress') return 'bg-blue-500';
		if (status === 'Review' || status === 'Ready for Review') return 'bg-warning-500';
		if (status === 'Sent') return 'bg-violet-500';
		if (status === 'Complete') return 'bg-green-500';
		if (status === 'Archived') return 'bg-neutral-400';
		return 'bg-primary';
	}

	function getProgressTrackClass(status: string): string {
		return isArchivedStatus(status) ? 'bg-neutral-200' : 'bg-secondary-200';
	}

	function isArchivedStatus(status: string): boolean {
		return status === 'Archived';
	}

	function getProjectCardClass(status: string): string {
		return isArchivedStatus(status)
			? 'border-neutral-300 bg-neutral-200/90 grayscale'
			: 'border-secondary-200 bg-secondary-50/70';
	}

	function getProjectCardPanelClass(status: string): string {
		return isArchivedStatus(status) ? 'bg-neutral-300/70 text-neutral-600' : 'bg-white';
	}

	function getProjectRowClass(status: string): string {
		return isArchivedStatus(status)
			? 'cursor-pointer border-b border-neutral-200 bg-neutral-100 grayscale'
			: 'cursor-pointer border-b border-secondary-200 bg-transparent';
	}

	function getProjectPrimaryTextClass(status: string): string {
		return isArchivedStatus(status) ? 'text-neutral-500' : 'text-neutral-900';
	}

	function getProjectSecondaryTextClass(status: string): string {
		return isArchivedStatus(status) ? 'text-neutral-500' : 'text-neutral-600';
	}

	function getProjectStrongTextClass(status: string): string {
		return isArchivedStatus(status) ? 'text-neutral-500' : 'text-neutral-800';
	}

	function getTeamAvatarClass(isPrimary = false): string {
		return `relative h-8 w-8 rounded-full object-cover shadow-sm ${isPrimary ? 'border-2 border-secondary-500 ring-2 ring-white' : 'border-2 border-white'}`;
	}

	function getTeamAvatarStyle(index: number, total: number): string {
		return `z-index: ${Math.max(total - index, 1)}`;
	}

	function getOpenButtonClass(status: string): string {
		if (status === 'Draft') return 'bg-slate-400 text-white hover:bg-slate-500';
		if (status === 'In Progress') return 'bg-blue-500 text-white hover:bg-blue-600';
		if (status === 'Review' || status === 'Ready for Review') {
			return 'bg-warning-500 text-white hover:bg-warning-600';
		}
		if (status === 'Sent') return 'bg-violet-500 text-white hover:bg-violet-600';
		if (status === 'Complete') return 'bg-green-500 text-white hover:bg-green-600';
		if (status === 'Archived') return 'bg-neutral-400 text-white hover:bg-neutral-500';
		return 'bg-primary text-white';
	}

	function getDeleteButtonClass(): string {
		return 'border-secondary-300 bg-white text-neutral-700 hover:bg-secondary-100';
	}

	async function handleOpenProject(projectId: string) {
		await goto(`/projects/${projectId}`);
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

	async function handleResetData() {
		if (isResettingPreviewData) return;

		isResettingPreviewData = true;

		try {
			await projectAssets.clearStoredAssets();
			projectStates.resetSeedProjects(projectSchema);
			refreshProjectRows();
		} finally {
			isResettingPreviewData = false;
		}
	}

	function dismissPreviewIntro() {
		isPreviewIntroOpen = false;
	}

	onMount(() => {
		refreshProjectRows();
	});
</script>

{#if isPreviewIntroOpen}
	<div class="fixed inset-0 z-60 overflow-y-auto bg-warning-500/20 px-4 py-6 md:px-6 md:py-10">
		<div class="mx-auto flex min-h-full w-full max-w-4xl items-center">
			<div class="w-full overflow-hidden rounded-4xl border-5 border-warning bg-linear-to-br from-warning-50 via-amber-50 to-warning-100 shadow-2xl shadow-warning-950/20">
				<div class="grid gap-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
					<div class="space-y-5 p-6 md:p-10">
						<Component class="gap-2">
							{#snippet topLC()}
								<Component class="gap-2" >
									{#snippet leftCC()}
										<Logo
											mode="current"
											href="/"
											class="size-7 text-black"
										/>
									{/snippet}
									{#snippet centerCC()}
										<Text p="BETA PREVIEW" class="text-xs font-black uppercase tracking-[0.24em] text-warning-600"/>
									{/snippet}
								</Component>
							{/snippet}
							{#snippet center()}
							<Text h1="This is beta software" class="max-w-3xl text-3xl text-warning-950 md:text-5xl" />
							{/snippet}
							{#snippet bottom()}
							<Text
								p="Use this build for demo testing only. It is still in progress, and changes stay in this browser for now."
								class="max-w-2xl leading-7 text-warning-950/85 md:text-lg"
							/>
							{/snippet}
						</Component>

						<div class="flex flex-nowrap items-center gap-2 sm:gap-3">
							<Button
								size={mq.sm ? 'sm' : 'xl'} 
								outline
								variant="text"
								class="min-w-0 flex-1 justify-center whitespace-nowrap border-secondary-300 bg-white text-neutral-700 hover:bg-secondary-100 sm:flex-none"
								label={isResettingPreviewData ? 'Resetting...' : 'Reset Data'}
								onclick={handleResetData}
								disabled={isResettingPreviewData}
							/>
							<Button size={mq.sm ? 'sm' : 'xl'} primary variant="text" class="min-w-0 flex-1 justify-center whitespace-nowrap sm:flex-none" label="Test App" onclick={dismissPreviewIntro} />
						</div>
					</div>

					<div class="border-t border-warning-300/60 bg-warning-950/5 p-6 md:p-8 lg:border-l lg:border-t-0">
						<p class="text-sm font-black uppercase tracking-[0.16em] text-warning-600">Try This</p>
						<ul class="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-warning-950/85 marker:text-warning-500">
							<li>Open a project.</li>
							<li>Edit panels, pages, and form inputs.</li>
							<li>Drag multiple photos from your computer straight into a panel.</li>
							<li>Use your camera to capture photos on-site or upload from your phone.</li>
							<li>Drag and drop photos or supported panels to reorder them.</li>
							<li>Watch the live preview, download a PDF, and zoom with controls or pinch to zoom on mobile.</li>
							<li>Test the app on phone, tablet, laptop, iPhone, and Android.</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	</div>
{:else}
<div class="min-h-svh bg-secondary-50 px-4 pb-6 pt-6 md:px-6 md:pb-8 md:pt-8">
	<div class="mx-auto flex max-w-7xl flex-col gap-6">
		<div class="flex flex-col gap-4 rounded-4xl border border-secondary-200 bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
			<div class="space-y-2">
				<Text h1={mq.sm ? 'Projects (mobile view)' : 'Projects (desktop view)'} class="text-2xl" />
				<Text p="Browse local project states, open an existing workspace, or create a new report from the same browser-only data model used by the editor." class="max-w-3xl text-neutral" />
			</div>
			<div class="flex flex-nowrap items-center gap-2 sm:gap-3 md:justify-end">
				<Button
					sm
					outline
					variant="text"
					class="min-w-0 flex-1 justify-center whitespace-nowrap border-secondary-300 bg-white text-neutral-700 hover:bg-secondary-100 md:flex-none"
					label={isResettingPreviewData ? 'Resetting...' : 'Reset Data'}
					onclick={handleResetData}
					disabled={isResettingPreviewData}
				/>
				<Button sm primary variant="text" class="min-w-0 flex-1 justify-center whitespace-nowrap md:flex-none" label="Add Project" onclick={handleCreateProject} />
			</div>
		</div>

		<div class=" bg-white ">
			{#if isLoaded && !projectRows.length}
				<div class="rounded-3xl border border-dashed border-secondary-300 bg-secondary-50 p-10 text-center">
					<Text h3="No Projects Yet" />
					<Text p="Create the first project to start building reports in the editor workspace." class="mt-2 text-neutral" />
				</div>
			{:else}
				<div class="grid gap-3 md:hidden">
					{#each projectRows as row (row.id)}
						<article class="rounded-3xl border p-4 {getProjectCardClass(row.status)}">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0 space-y-1">
									<p class={`text-base font-semibold ${getProjectPrimaryTextClass(row.status)}`}>{row.title}</p>
									<p class={`text-sm ${getProjectSecondaryTextClass(row.status)}`}>{row.client}</p>
								</div>
								<span class="inline-flex shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] {getStatusClass(row.status)}">{getStatusLabel(row.status)}</span>
							</div>

							<div class="mt-4 grid grid-cols-2 gap-3 rounded-2xl p-3 text-sm {getProjectCardPanelClass(row.status)}">
								<div>
									<p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Facility</p>
									<p class={`mt-1 ${getProjectStrongTextClass(row.status)}`}>{row.facility}</p>
								</div>
								<div>
									<p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Updated</p>
									<p class={`mt-1 ${getProjectStrongTextClass(row.status)}`}>{formatTimestamp(row.updatedAt)}</p>
								</div>
								<div class="col-span-2">
									<p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Team</p>
									<div class="mt-2 flex items-center -space-x-2">
										{#each row.teamMembers.slice(0, 4) as member, index (`${row.id}-mobile-${member.name}`)}
											<img
												alt={member.name}
												class={getTeamAvatarClass(member.isPrimary)}
												src={member.avatarUrl}
												style={getTeamAvatarStyle(index, row.teamMembers.length)}
											/>
										{/each}
									</div>
								</div>
							</div>

							<div class="mt-4 space-y-2">
								<div class={`flex items-center justify-between gap-3 text-sm font-medium ${getProjectSecondaryTextClass(row.status)}`}>
									<span>Progress</span>
									<span class="shrink-0 text-xs font-semibold uppercase tracking-[0.12em]">{row.progress}</span>
								</div>
								<div class={`h-2.5 overflow-hidden rounded-full ${getProgressTrackClass(row.status)}`}>
									<div class="h-full rounded-full transition-[width] {getProgressClass(row.status)}" style={`width: ${row.progressPercent}%`}></div>
								</div>
							</div>

							<div class="mt-4 flex gap-2">
								<Button sm variant="text" class={`flex-1 ${getOpenButtonClass(row.status)}`} label="Open" href={`/projects/${row.id}`} />
								<Button sm outline variant="text" class={`flex-1 ${getDeleteButtonClass()}`} label="Delete" onclick={() => handleDeleteProject(row.id)} />
							</div>
						</article>
					{/each}
				</div>

				<div class="hidden md:block">
					<Table columns={tableColumns} data={projectRows} hoverable>
						<table class="w-full table-fixed border-collapse">
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
									<tr class="{getProjectRowClass(row.status)}" role="link" tabindex="0" onclick={() => handleOpenProject(row.id)} onkeydown={(event) => {
										if (event.key === 'Enter' || event.key === ' ') {
											event.preventDefault();
											void handleOpenProject(row.id);
										}
									}}>
										<td class="px-3 py-4 align-middle">
											<div class="space-y-1">
												<p class={`text-sm font-semibold ${getProjectPrimaryTextClass(row.status)}`}>{row.title}</p>
												<!-- <p class="text-xs uppercase tracking-[0.12em] text-neutral-500">{row.id}</p> -->
											</div>
										</td>
										<td class={`px-3 py-4 align-middle text-sm ${getProjectSecondaryTextClass(row.status)}`}>{row.client}</td>
										<td class="px-3 py-4 align-middle">
											<div class="flex items-center justify-center -space-x-2">
												{#each row.teamMembers.slice(0, 4) as member, index (`${row.id}-${member.name}`)}
													<img
														alt={member.name}
														class={getTeamAvatarClass(member.isPrimary)}
														src={member.avatarUrl}
														style={getTeamAvatarStyle(index, row.teamMembers.length)}
													/>
												{/each}
											</div>
										</td>
										<td class="px-3 py-4 text-center align-middle">
											<span class={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getStatusClass(row.status)}`}>{getStatusLabel(row.status)}</span>
										</td>
										<td class="px-3 py-4 align-middle">
											<div class="mx-auto flex w-full max-w-36 items-center gap-3">
												<div class={`h-2.5 flex-1 overflow-hidden rounded-full ${getProgressTrackClass(row.status)}`}>
													<div class="h-full rounded-full transition-[width] {getProgressClass(row.status)}" style={`width: ${row.progressPercent}%`}></div>
												</div>
												<span class={`shrink-0 text-xs font-semibold uppercase tracking-[0.12em] ${getProjectSecondaryTextClass(row.status)}`}>{row.progress}</span>
											</div>
										</td>
										<td class={`px-3 py-4 align-middle text-right text-sm ${getProjectSecondaryTextClass(row.status)}`}>{formatTimestamp(row.updatedAt)}</td>
										<td class="px-3 py-4 align-middle">
											<div class="flex justify-end gap-2">
												<Button sm variant="text" class={getOpenButtonClass(row.status)} label="Open" href={`/projects/${row.id}`} onclick={(event: MouseEvent) => event.stopPropagation()} />
												<Button sm outline variant="text" class={getDeleteButtonClass()} label="Delete" onclick={(event: MouseEvent) => {
													event.stopPropagation();
													void handleDeleteProject(row.id);
												}} />
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</Table>
				</div>
			{/if}
		</div>
	</div>
</div>
{/if}

<style lang="postcss">
	@reference "#app.css";
</style>