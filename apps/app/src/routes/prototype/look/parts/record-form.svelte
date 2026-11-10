<script lang="ts">
	// PROTOTYPE (#161) run 12: a record's Edit tab, the same form for a customer, a team member, a transport and a
	// facility (Justin's run 12 note 18). Every change is kept as it is typed, like a project's panels; a new name is
	// kept when the field is left, and follows the record into every project that uses it. Delete is at the bottom and
	// asks first. Labels are chips: a customer's types and a team member's labels can be several, a transport has one
	// type and a facility one kind. Run 15 (Justin, 2026-11-10): the form holds everything a report prints about the
	// record, so picking its name in a project fills the rest: a customer's logo, short code, address, email, phone,
	// website, background picture and contact person; a team member's photo; a transport's picture; a facility's
	// picture, address and contact.
	import ImageField from './image-field.svelte';
	import {
		FACILITY_ICONS,
		NO_CONTACT,
		PARTICULARS,
		personOf,
		TRANSPORT_TYPES,
		type ContactType,
		type FacilityKindType,
		type TransportTypeType
	} from './look.data';
	import type { LookState } from './look.state.svelte';
	import {
		CUSTOMER_TYPES,
		customerOf,
		TEAM_LABELS,
		typesOf,
		type RecordType
	} from './records.data';
	import { labelsOf, ROLE_LABELS, type TeamMemberType } from './team.data';

	let { look, record }: { look: LookState; record: RecordType } = $props();

	const FIELD =
		'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-primary disabled:bg-slate-50';
	const LABEL = 'mb-1 block text-xs font-medium text-slate-500';
	const CARD = 'space-y-4 rounded-3xl bg-white p-4 ring-1 ring-slate-900/[0.05]';
	const HEADING = 'text-sm font-semibold text-slate-900';
	const ROLES: TeamMemberType['role'][] = ['admin', 'manager', 'team'];

	const member = $derived(record.member);
	const transport = $derived(
		record.page === 'transport'
			? look.transports.find((item) => item.name === record.key)
			: undefined
	);
	const facility = $derived(
		record.page === 'facilities'
			? look.facilities.find((item) => item.name === record.key)
			: undefined
	);
	const customer = $derived(record.page === 'customers' ? customerOf(look, record.key) : undefined);
	const contact = $derived(customer?.contact ?? NO_CONTACT);

	function rename(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		if (!look.rename(record.page, record.key, input.value)) input.value = record.key;
	}

	function toggle(list: string[], label: string) {
		return list.includes(label) ? list.filter((item) => item !== label) : [...list, label];
	}

	function setTypes(label: string) {
		look.setCustomer(record.key, { kind: toggle(typesOf(customer?.kind ?? ''), label).join(', ') });
	}

	function setContact(patch: Partial<ContactType>) {
		look.setCustomer(record.key, { contact: { ...contact, ...patch } });
	}

	function setLabels(label: string) {
		if (!member) return;
		member.label = toggle(labelsOf(member), label).join(', ');
		look.flash();
	}

	function setType(type: TransportTypeType) {
		if (!transport) return;
		transport.type = type;
		transport.mode = TRANSPORT_TYPES[type].modes[0];
		look.flash();
	}

	function remove() {
		look.confirm({
			title: `Delete ${record.key}?`,
			note: 'It moves to Trash, where an admin can restore it. Projects that use it keep its name.',
			onyes: () => look.removeRecord(record.page, record.key)
		});
	}
</script>

{#snippet chip(isOn: boolean, label: string, onclick: () => void, icon = '')}
	<button
		type="button"
		class="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition {isOn
			? 'bg-primary text-white'
			: 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
		aria-pressed={isOn}
		{onclick}
		>{#if icon}<span class="{icon} size-4"></span>{/if}{label}</button
	>
{/snippet}

{#snippet text(label: string, value: string, oninput: (value: string) => void, type = 'text')}
	<label class="block">
		<span class={LABEL}>{label}</span>
		<input
			class={FIELD}
			{type}
			{value}
			oninput={(event) => {
				oninput(event.currentTarget.value);
				look.flash();
			}}
		/>
	</label>
{/snippet}

<div class="space-y-4">
	<div class={CARD}>
		{#if customer}
			<ImageField
				label="Logo"
				shape="logo"
				value={customer.icon}
				hint="Shows on its rows and cards, and in the footer of every report page."
				onpick={(url) => look.setCustomer(record.key, { icon: url, logo: url })}
			/>
		{:else if member}
			<ImageField
				label="Photo"
				shape="face"
				value={personOf(member.name).photo}
				canRemove={Boolean(member.photo)}
				hint="Shows wherever they do, and beside their sign-off on a report they own."
				onpick={(url) => look.setPhoto(member, url)}
			/>
		{/if}
		<label class="block">
			<span class={LABEL}>Name</span>
			<input
				class={FIELD}
				value={record.key}
				onchange={rename}
				onkeydown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
			/>
		</label>

		{#if customer}
			<label class="block">
				<span class={LABEL}>Short code</span>
				<input
					class="{FIELD} uppercase"
					value={customer.code}
					maxlength="5"
					oninput={(event) =>
						look.setCustomer(record.key, {
							code: event.currentTarget.value.replace(/[^a-z0-9]/gi, '').toUpperCase()
						})}
				/>
				<span class="mt-1.5 block text-xs text-slate-400"
					>Starts its project numbers and document IDs, like {customer.code ||
						'SGL'}-2026-05-12-J01.</span
				>
			</label>
			<div>
				<p class={LABEL}>Type</p>
				<div class="flex flex-wrap gap-2">
					{#each CUSTOMER_TYPES as label (label)}
						{@render chip(typesOf(customer.kind).includes(label), label, () => setTypes(label))}
					{/each}
				</div>
			</div>
			{@render text('City', customer.city, (value) =>
				look.setCustomer(record.key, { city: value })
			)}
			{@render text('Address', customer.address ?? '', (value) =>
				look.setCustomer(record.key, { address: value })
			)}
			{@render text(
				'Email',
				customer.email ?? '',
				(value) => look.setCustomer(record.key, { email: value }),
				'email'
			)}
			{@render text(
				'Phone',
				customer.phone ?? '',
				(value) => look.setCustomer(record.key, { phone: value }),
				'tel'
			)}
			{@render text(
				'Website',
				customer.website ?? '',
				(value) => look.setCustomer(record.key, { website: value }),
				'url'
			)}
			<ImageField
				label="Background picture"
				value={customer.photo ?? ''}
				hint="The picture behind its Page. Without one, its type's stock picture shows."
				onpick={(url) => look.setCustomer(record.key, { photo: url })}
			/>
		{:else if member}
			<div>
				<p class={LABEL}>Role</p>
				<div class="flex gap-2">
					{#each ROLES as role (role)}
						{@render chip(member.role === role, ROLE_LABELS[role], () => {
							member.role = role;
							look.flash();
						})}
					{/each}
				</div>
			</div>
			{@render text('Title', member.title, (value) => (member.title = value))}
			<div>
				<p class={LABEL}>Labels</p>
				<div class="flex flex-wrap gap-2">
					{#each [...new Set([...TEAM_LABELS, ...labelsOf(member)])] as label (label)}
						{@render chip(labelsOf(member).includes(label), label, () => setLabels(label))}
					{/each}
				</div>
			</div>
			{@render text('Phone', member.phone, (value) => (member.phone = value), 'tel')}
			{@render text('Email', member.email, (value) => (member.email = value), 'email')}
			{@render text('Location', member.location, (value) => (member.location = value))}
		{:else if transport}
			<div>
				<p class={LABEL}>Transport type</p>
				<div class="flex flex-wrap gap-2">
					{#each Object.entries(TRANSPORT_TYPES) as [type, item] (type)}
						{@render chip(
							transport.type === type,
							type,
							() => setType(type as TransportTypeType),
							item.icon
						)}
					{/each}
				</div>
			</div>
			<div>
				<p class={LABEL}>Transport Mode</p>
				<div class="flex flex-wrap gap-2">
					{#each TRANSPORT_TYPES[transport.type].modes as mode (mode)}
						{@render chip(transport.mode === mode, mode, () => {
							transport.mode = mode;
							look.flash();
						})}
					{/each}
				</div>
			</div>
			<ImageField
				label="Picture"
				value={transport.photo ?? ''}
				hint="The picture behind its Page. Without one, the {transport.mode.toLowerCase()} stock picture shows."
				onpick={(url) => {
					transport.photo = url;
					look.flash();
				}}
			/>
		{:else if facility}
			<div>
				<p class={LABEL}>Kind</p>
				<div class="flex flex-wrap gap-2">
					{#each Object.entries(FACILITY_ICONS) as [kind, icon] (kind)}
						{@render chip(
							facility.kind === kind,
							kind,
							() => {
								facility.kind = kind as FacilityKindType;
								look.flash();
							},
							icon
						)}
					{/each}
				</div>
			</div>
			{@render text('City', facility.city, (value) => (facility.city = value))}
			{@render text('Address', facility.address ?? '', (value) => (facility.address = value))}
			<ImageField
				label="Picture"
				value={facility.photo ?? ''}
				hint="The picture behind its Page. Without one, the {facility.kind.toLowerCase()} stock picture shows."
				onpick={(url) => {
					facility.photo = url;
					look.flash();
				}}
			/>
		{/if}
	</div>

	{#if customer}
		<div class={CARD}>
			<div>
				<p class={HEADING}>Contact</p>
				<p class="mt-0.5 text-xs text-slate-400">
					Who the report is for. Their name and email print on the report under the customer.
				</p>
			</div>
			<ImageField
				label="Photo"
				shape="face"
				value={contact.photo}
				onpick={(url) => setContact({ photo: url })}
			/>
			{@render text('Name', contact.name, (value) => setContact({ name: value }))}
			{@render text('Title', contact.title, (value) => setContact({ title: value }))}
			{@render text('Email', contact.email, (value) => setContact({ email: value }), 'email')}
			{@render text('Phone', contact.phone, (value) => setContact({ phone: value }), 'tel')}
		</div>
	{/if}

	{#if facility}
		<div class={CARD}>
			<p class={HEADING}>Contact</p>
			{@render text('Name', facility.contact ?? '', (value) => (facility.contact = value))}
			{@render text('Phone', facility.phone ?? '', (value) => (facility.phone = value), 'tel')}
			{@render text('Email', facility.email ?? '', (value) => (facility.email = value), 'email')}
		</div>
	{/if}

	{#if transport && PARTICULARS[transport.mode]}
		<div class={CARD}>
			<div>
				<p class={HEADING}>Particulars</p>
				<p class="mt-0.5 text-xs text-slate-400">
					Printed on the report page of every stop this {transport.mode.toLowerCase()} is on.
				</p>
			</div>
			{#each PARTICULARS[transport.mode] as label (label)}
				{@render text(label, transport.details?.[label] ?? '', (value) => {
					transport.details = { ...transport.details, [label]: value };
				})}
			{/each}
		</div>
	{/if}

	<button
		type="button"
		class="flex w-full items-center justify-center gap-2 rounded-full bg-danger/10 py-3 text-sm font-semibold text-danger transition hover:bg-danger/15"
		onclick={remove}
		><span class="icon-[mdi--trash-can-outline] size-5"></span>Delete {record.key}</button
	>
</div>
