<script lang="ts">
	// PROTOTYPE (#161) run 12: a record's Page tab, how it reads (Justin's run 12 note 18): one shared view for a
	// customer, a team member, a transport and a facility. Its icon, name, labels and place; its numbers; for a team
	// member their phone and email, for a transport its particulars (empty until typed in on Edit, or later filled by a
	// tracking service); then its projects, as the same rows the Projects page lists. Projects get a Page tab later.
	import ClientLogo from './client-logo.svelte';
	import Chips from './chips.svelte';
	import Faces from './faces.svelte';
	import { DATASETS, PARTICULARS } from './look.data';
	import type { LookState } from './look.state.svelte';
	import ProjectRow from './project-row.svelte';
	import RecordMark from './record-mark.svelte';
	import type { RecordType } from './records.data';
	import { ROLE_LABELS } from './team.data';

	let { look, record }: { look: LookState; record: RecordType } = $props();

	const transport = $derived(
		record.page === 'transport'
			? look.transports.find((item) => item.name === record.key)
			: undefined
	);
	const ROLE_TONES = {
		admin: 'bg-primary/10 text-primary',
		manager: 'bg-violet-500/10 text-violet-700',
		team: 'bg-slate-100 text-slate-600'
	};
	const CARD = 'rounded-3xl bg-white ring-1 ring-slate-900/[0.05]';
	const HEADING = 'mb-2 px-1 text-sm font-semibold text-slate-900';
</script>

<div class="space-y-5">
	<div class="flex flex-col items-center gap-2 px-6 pt-6 pb-5 text-center {CARD}">
		<RecordMark
			{record}
			size={96}
			hasBadge={false}
		/>
		<h1 class="mt-2 text-2xl font-semibold text-slate-900">{record.key}</h1>
		{#if record.member}
			{#if record.member.title}<p class="-mt-1 text-sm text-slate-500">
					{record.member.title}
				</p>{/if}
			<span
				class="rounded-full px-2.5 py-0.5 text-xs font-semibold {ROLE_TONES[record.member.role]}"
				>{ROLE_LABELS[record.member.role]}</span
			>
		{/if}
		<span class="flex justify-center">
			<Chips
				labels={record.sub ? [...record.labels, record.sub] : record.labels}
				isWrapped
			/>
		</span>
		{#if record.location}
			<p class="flex items-center gap-0.5 text-sm text-slate-500">
				<span class="icon-[mdi--map-marker] size-4 text-slate-400"></span>{record.location}
			</p>
		{/if}
	</div>

	<div class="grid grid-cols-3 gap-2">
		{#each [['Projects', record.count], ['Open', record.open], [record.page === 'customers' ? 'Team' : 'Customers', record.page === 'customers' ? record.people.length : record.logos.length]] as [label, value] (label)}
			<div class="p-3 text-center {CARD}">
				<p class="text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
				<p class="text-xs font-medium text-slate-500">{label}</p>
			</div>
		{/each}
	</div>

	{#if record.member && (record.member.phone || record.member.email)}
		<section>
			<h3 class={HEADING}>Contact</h3>
			<div class="divide-y divide-slate-100 overflow-hidden {CARD}">
				{#if record.member.phone}
					<a
						class="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
						href="tel:{record.member.phone.replace(/[^+\d]/g, '')}"
						><span class="icon-[mdi--phone] size-5 text-primary"></span>{record.member.phone}</a
					>
				{/if}
				{#if record.member.email}
					<a
						class="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
						href="mailto:{record.member.email}"
						><span class="icon-[mdi--email-outline] size-5 text-primary"></span>{record.member
							.email}</a
					>
				{/if}
			</div>
		</section>
	{/if}

	{#if transport && PARTICULARS[transport.mode]}
		<section>
			<h3 class={HEADING}>Particulars</h3>
			<dl class="divide-y divide-slate-100 {CARD}">
				{#each PARTICULARS[transport.mode] as label (label)}
					<div class="flex justify-between gap-3 px-4 py-2.5 text-sm">
						<dt class="text-slate-500">{label}</dt>
						<dd class="font-medium text-slate-900">{transport.details?.[label] || '—'}</dd>
					</div>
				{/each}
			</dl>
		</section>
	{/if}

	{#if record.people.length || record.logos.length}
		<section>
			<h3 class={HEADING}>{record.page === 'customers' ? 'Team on its projects' : 'Customers'}</h3>
			<div class="flex flex-wrap gap-3 p-4 {CARD}">
				{#if record.people.length}
					<Faces
						names={record.people}
						size={40}
						max={12}
					/>
				{:else}
					{#each record.logos as name (name)}
						<span class="flex items-center gap-2 text-sm text-slate-700"
							><ClientLogo
								{name}
								size={32}
								shape="circle"
							/>{name}</span
						>
					{/each}
				{/if}
			</div>
		</section>
	{/if}

	<section>
		<h3 class={HEADING}>Projects</h3>
		{#if record.projects.length}
			<div class="divide-y divide-slate-100 overflow-hidden {CARD}">
				{#each record.projects as project (project.id)}
					<ProjectRow
						{look}
						{project}
					/>
				{/each}
			</div>
		{:else}
			<p class="px-4 py-6 text-center text-sm text-slate-400 {CARD}">
				No projects with this {DATASETS[record.page].one.toLowerCase()} yet.
			</p>
		{/if}
	</section>
</div>
