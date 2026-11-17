<script lang="ts">
	// PROTOTYPE (#161) run 12: a record's Page tab, how it reads (Justin's run 12 note 18): one shared view for a
	// customer, a team member, a transport and a facility. Since run 13 its icon, name, labels and place sit over the
	// Page's picture (record-page.svelte) and this is the sheet under it: its numbers; for a team
	// member their phone and email, for a transport its particulars (empty until typed in on Edit, or later filled by a
	// tracking service); then its projects, as the same rows the Projects page lists.
	import ClientLogo from './client-logo.svelte';
	import Faces from './faces.svelte';
	import { DATASETS, PARTICULARS } from './look.data';
	import type { LookState } from './look.state.svelte';
	import ProjectRow from './project-row.svelte';
	import { customerOf, type RecordType } from './records.data';

	let { look, record }: { look: LookState; record: RecordType } = $props();

	const transport = $derived(
		record.page === 'transport'
			? look.transports.find((item) => item.name === record.key)
			: undefined
	);
	const customer = $derived(record.page === 'customers' ? customerOf(look, record.key) : undefined);
	const facility = $derived(
		record.page === 'facilities'
			? look.facilities.find((item) => item.name === record.key)
			: undefined
	);
	const CARD = 'rounded-3xl bg-slate-50 ring-1 ring-slate-900/[0.04]';
	const HEADING = 'mb-2 px-1 text-sm font-semibold text-slate-900';

	type LineType = { icon: string; text: string; href?: string };

	function phoneLine(phone = ''): LineType {
		return { icon: 'icon-[mdi--phone]', text: phone, href: `tel:${phone.replace(/[^+\d]/g, '')}` };
	}

	function emailLine(email = ''): LineType {
		return { icon: 'icon-[mdi--email-outline]', text: email, href: `mailto:${email}` };
	}

	function filled(lines: LineType[]) {
		return lines.filter((line) => line.text);
	}

	// What the record's Edit tab holds about it (run 15): a customer's code, address, email, phone and website, a
	// facility's address, a team member's phone and email.
	const details = $derived(
		customer
			? filled([
					{ icon: 'icon-[mdi--barcode]', text: customer.code },
					{ icon: 'icon-[mdi--map-marker-outline]', text: customer.address ?? '' },
					emailLine(customer.email),
					phoneLine(customer.phone),
					{
						icon: 'icon-[mdi--web]',
						text: customer.website ?? '',
						href: `https://${(customer.website ?? '').replace(/^https?:\/\//, '')}`
					}
				])
			: facility
				? filled([{ icon: 'icon-[mdi--map-marker-outline]', text: facility.address ?? '' }])
				: record.member
					? filled([phoneLine(record.member.phone), emailLine(record.member.email)])
					: []
	);
	// The people to reach there: a customer's contacts (any number, run 16), or a facility's one.
	const everyone = $derived(
		customer
			? (customer.contacts ?? []).map((contact) => ({
					id: contact.id,
					name: contact.name,
					title: contact.title,
					photo: contact.photo,
					lines: filled([emailLine(contact.email), phoneLine(contact.phone)])
				}))
			: facility
				? [
						{
							id: 'facility',
							name: facility.contact ?? '',
							title: '',
							photo: '',
							lines: filled([phoneLine(facility.phone), emailLine(facility.email)])
						}
					]
				: []
	);
	const people = $derived(everyone.filter((person) => person.name || person.lines.length));
</script>

{#snippet row(line: LineType)}
	{#if line.href}
		<a
			class="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100"
			href={line.href}
			><span class="{line.icon} size-5 shrink-0 text-primary"></span><span class="min-w-0 truncate"
				>{line.text}</span
			></a
		>
	{:else}
		<p class="flex items-center gap-3 px-4 py-3 text-sm text-slate-700">
			<span class="{line.icon} size-5 shrink-0 text-primary"></span><span class="min-w-0"
				>{line.text}</span
			>
		</p>
	{/if}
{/snippet}

<div class="space-y-5">
	<div class="grid grid-cols-3 gap-2">
		{#each [['Projects', record.count], ['Open', record.open], [record.page === 'customers' ? 'Team' : 'Customers', record.page === 'customers' ? record.people.length : record.logos.length]] as [label, value] (label)}
			<div class="p-3 text-center {CARD}">
				<p class="text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
				<p class="text-xs font-medium text-slate-500">{label}</p>
			</div>
		{/each}
	</div>

	{#if details.length}
		<section>
			<h3 class={HEADING}>{record.member ? 'Contact' : 'Details'}</h3>
			<div class="divide-y divide-slate-100 overflow-hidden {CARD}">
				{#each details as line (line.icon)}{@render row(line)}{/each}
			</div>
		</section>
	{/if}

	{#if people.length}
		<section>
			<h3 class={HEADING}>{people.length > 1 ? 'Contacts' : 'Contact'}</h3>
			{#each people as person (person.id)}
				<div class="mb-2 divide-y divide-slate-100 overflow-hidden {CARD}">
					{#if person.name}
						<div class="flex items-center gap-3 px-4 py-3">
							{#if person.photo}
								<img
									src={person.photo}
									alt=""
									class="size-10 shrink-0 rounded-full object-cover"
								/>
							{:else}
								<span
									class="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500"
									><span class="icon-[mdi--account] size-6"></span></span
								>
							{/if}
							<span class="min-w-0">
								<span class="block truncate text-sm font-semibold text-slate-900"
									>{person.name}</span
								>
								{#if person.title}<span class="block truncate text-xs text-slate-500"
										>{person.title}</span
									>{/if}
							</span>
						</div>
					{/if}
					{#each person.lines as line (line.icon)}{@render row(line)}{/each}
				</div>
			{/each}
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
				No projects with this {DATASETS[record.page].one} yet.
			</p>
		{/if}
	</section>
</div>
