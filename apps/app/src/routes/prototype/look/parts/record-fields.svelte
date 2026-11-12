<script lang="ts">
	// PROTOTYPE (#161) run 16: every field of a customer, a team, a transport mode or a facility, written once
	// (Justin, 2026-11-10: "turn the data into a component so we don't repeat ourselves"). The + sheet shows it over
	// an empty draft and a record's Edit tab over the record itself, so the two always ask for the same things. It
	// only reads `value` and reports each change through `set`; who keeps the change is the caller's business. A
	// customer has any number of contacts (2026-11-10).
	import ImageField from './image-field.svelte';
	import {
		FACILITY_ICONS,
		MODE_ICONS,
		newContact,
		PARTICULARS,
		personOf,
		TRANSPORT_TYPES,
		type ClientType,
		type ContactType,
		type FacilityKindType,
		type FacilityType,
		type TransportType,
		type TransportTypeType
	} from './look.data';
	import type { LookState, RecordDraftType } from './look.state.svelte';
	import Picker from './picker.svelte';
	import PlaceField from './place-field.svelte';
	import { CUSTOMER_TYPES, TEAM_LABELS, typesOf, type PageType } from './records.data';
	import { labelsOf, ROLE_LABELS, type TeamMemberType } from './team.data';

	let {
		look,
		page,
		value,
		set,
		isNew = false,
		onname
	}: {
		look: LookState;
		page: PageType;
		value: RecordDraftType;
		set: (change: Record<string, unknown>) => void;
		// A record not made yet: its name is typed like any field, and nothing falls back to a stock picture.
		isNew?: boolean;
		// A record that exists is renamed when the name field is left; false puts the old name back.
		onname?: (name: string) => boolean;
	} = $props();

	const FIELD =
		'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-primary disabled:bg-slate-50';
	const LABEL = 'mb-1 block text-xs font-medium text-slate-500';
	const CARD = 'space-y-4 rounded-3xl bg-white p-4 ring-1 ring-slate-900/[0.05]';
	const HEADING = 'text-sm font-semibold text-slate-900';
	const ROLES: TeamMemberType['role'][] = ['admin', 'manager', 'team'];

	const customer = $derived(page === 'customers' ? (value as ClientType) : undefined);
	const member = $derived(page === 'team' ? (value as TeamMemberType) : undefined);
	const transport = $derived(page === 'transport' ? (value as TransportType) : undefined);
	const facility = $derived(page === 'facilities' ? (value as FacilityType) : undefined);
	const contacts = $derived(customer?.contacts ?? []);

	function rename(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		if (onname && !onname(input.value)) input.value = value.name;
	}

	function toggle(list: string[], label: string) {
		return list.includes(label) ? list.filter((item) => item !== label) : [...list, label];
	}

	function setContact(id: string, change: Partial<ContactType>) {
		set({
			contacts: contacts.map((contact) => (contact.id === id ? { ...contact, ...change } : contact))
		});
	}
</script>

{#snippet text(label: string, current: string, oninput: (text: string) => void, type = 'text')}
	<label class="block">
		<span class={LABEL}>{label}</span>
		<input
			class={FIELD}
			{type}
			value={current}
			oninput={(event) => oninput(event.currentTarget.value)}
		/>
	</label>
{/snippet}

<!-- Where it is: one field everywhere, which suggests places and saves the one picked (place-field.svelte). -->
{#snippet place(label: string, current: string, oninput: (text: string) => void)}
	<div>
		<p class={LABEL}>{label}</p>
		<PlaceField
			{look}
			value={current}
			{oninput}
			inputClass={FIELD}
		/>
	</div>
{/snippet}

<div class="space-y-4">
	<div class={CARD}>
		{#if customer}
			<ImageField
				label="Logo"
				shape="logo"
				value={customer.icon}
				hint="Shows on its rows and cards, and in the footer of every report page."
				onpick={(url) => set({ icon: url, logo: url })}
			/>
		{:else if member}
			<ImageField
				label="Photo"
				shape="face"
				value={member.photo || (isNew ? '' : personOf(member.name).photo)}
				canRemove={Boolean(member.photo)}
				hint="Shows wherever they do, and beside their sign-off on a report they own."
				onpick={(url) => set({ photo: url })}
			/>
		{/if}
		<label class="block">
			<span class={LABEL}>Name</span>
			{#if isNew}
				<!-- svelte-ignore a11y_autofocus -->
				<input
					class={FIELD}
					value={value.name}
					placeholder={customer
						? 'e.g. Gulf Coast Metals'
						: member
							? 'First and last name'
							: transport
								? 'e.g. MV Coral Dawn'
								: 'e.g. Berth 12'}
					oninput={(event) => set({ name: event.currentTarget.value })}
					autofocus
				/>
			{:else}
				<input
					class={FIELD}
					value={value.name}
					onchange={rename}
					onkeydown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
				/>
			{/if}
		</label>

		{#if customer}
			<label class="block">
				<span class={LABEL}>Short Code</span>
				<input
					class="{FIELD} uppercase"
					value={customer.code}
					maxlength="5"
					oninput={(event) =>
						set({ code: event.currentTarget.value.replace(/[^a-z0-9]/gi, '').toUpperCase() })}
				/>
				<span class="mt-1.5 block text-xs text-slate-400"
					>Starts its project numbers and document IDs, like {customer.code ||
						'SGL'}-2026-05-12-J01.{isNew ? ' Left empty, it is made from the name.' : ''}</span
				>
			</label>
			<Picker
				label="Type"
				options={CUSTOMER_TYPES.map((label) => ({ id: label, label }))}
				values={typesOf(customer.kind)}
				many="types"
				icon="icon-[mdi--tag-outline]"
				onpick={(label) => set({ kind: toggle(typesOf(customer.kind), label).join(', ') })}
			/>
			{@render place('City', customer.city, (city) => set({ city }))}
			{@render text('Address', customer.address ?? '', (address) => set({ address }))}
			{@render text('Email', customer.email ?? '', (email) => set({ email }), 'email')}
			{@render text('Phone', customer.phone ?? '', (phone) => set({ phone }), 'tel')}
			{@render text('Website', customer.website ?? '', (website) => set({ website }), 'url')}
			<ImageField
				label="Background Picture"
				value={customer.photo ?? ''}
				hint="The picture behind its Page. Without one, its type's stock picture shows."
				onpick={(url) => set({ photo: url })}
			/>
		{:else if member}
			<Picker
				label="Role"
				options={ROLES.map((role) => ({ id: role, label: ROLE_LABELS[role] }))}
				value={member.role}
				icon="icon-[mdi--shield-account-outline]"
				onpick={(role) => set({ role })}
			/>
			{@render text('Title', member.title, (title) => set({ title }))}
			<Picker
				label="Labels"
				options={[...new Set([...TEAM_LABELS, ...labelsOf(member)])].map((label) => ({
					id: label,
					label
				}))}
				values={labelsOf(member)}
				many="labels"
				icon="icon-[mdi--tag-outline]"
				isRequired={false}
				onpick={(label) => set({ label: toggle(labelsOf(member), label).join(', ') })}
			/>
			{@render text('Phone', member.phone, (phone) => set({ phone }), 'tel')}
			{@render text('Email', member.email, (email) => set({ email }), 'email')}
			{@render place('Location', member.location, (location) => set({ location }))}
		{:else if transport}
			<Picker
				label="Transport Type"
				options={Object.entries(TRANSPORT_TYPES).map(([type, item]) => ({
					id: type,
					label: type,
					icon: item.icon
				}))}
				value={transport.type}
				icon="icon-[mdi--transit-connection-variant]"
				onpick={(type) => set({ type, mode: TRANSPORT_TYPES[type as TransportTypeType].modes[0] })}
			/>
			<Picker
				label="Transport Mode"
				options={TRANSPORT_TYPES[transport.type].modes.map((mode) => ({
					id: mode,
					label: mode,
					icon: MODE_ICONS[mode]
				}))}
				value={transport.mode}
				icon="icon-[mdi--cube-send]"
				onpick={(mode) => set({ mode })}
			/>
			<ImageField
				label="Picture"
				value={transport.photo ?? ''}
				hint="The picture behind its Page. Without one, the {transport.mode.toLowerCase()} stock picture shows."
				onpick={(url) => set({ photo: url })}
			/>
		{:else if facility}
			<Picker
				label="Kind"
				options={Object.entries(FACILITY_ICONS).map(([kind, icon]) => ({
					id: kind,
					label: kind,
					icon
				}))}
				value={facility.kind}
				icon="icon-[mdi--domain]"
				onpick={(kind) => set({ kind: kind as FacilityKindType })}
			/>
			{@render place('City', facility.city, (city) => set({ city }))}
			{@render text('Address', facility.address ?? '', (address) => set({ address }))}
			<ImageField
				label="Picture"
				value={facility.photo ?? ''}
				hint="The picture behind its Page. Without one, the {facility.kind.toLowerCase()} stock picture shows."
				onpick={(url) => set({ photo: url })}
			/>
		{/if}
	</div>

	{#if customer}
		<div class={CARD}>
			<div>
				<p class={HEADING}>Contacts</p>
				<p class="mt-0.5 text-xs text-slate-400">
					The people there. A project picks the one its report is for; their name, title and email
					print under the customer.
				</p>
			</div>
			{#each contacts as contact, index (contact.id)}
				<div class="space-y-3 rounded-2xl bg-slate-50 p-3">
					<div class="flex items-center justify-between">
						<p class="text-xs font-semibold text-slate-500">
							{contact.name || `Contact ${index + 1}`}
						</p>
						<button
							type="button"
							class="flex size-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-danger/10 hover:text-danger"
							aria-label="Remove {contact.name || `contact ${index + 1}`}"
							onclick={() => set({ contacts: contacts.filter((item) => item.id !== contact.id) })}
							><span class="icon-[mdi--trash-can-outline] size-5"></span></button
						>
					</div>
					<ImageField
						label="Photo"
						shape="face"
						value={contact.photo}
						onpick={(url) => setContact(contact.id, { photo: url })}
					/>
					{@render text('Name', contact.name, (name) => setContact(contact.id, { name }))}
					{@render text('Title', contact.title, (title) => setContact(contact.id, { title }))}
					{@render text(
						'Email',
						contact.email,
						(email) => setContact(contact.id, { email }),
						'email'
					)}
					{@render text(
						'Phone',
						contact.phone,
						(phone) => setContact(contact.id, { phone }),
						'tel'
					)}
				</div>
			{/each}
			<button
				type="button"
				class="flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-100 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
				onclick={() => set({ contacts: [...contacts, newContact()] })}
				><span class="icon-[mdi--plus] size-5"></span>Add a contact</button
			>
		</div>
	{/if}

	{#if facility}
		<div class={CARD}>
			<p class={HEADING}>Contact</p>
			{@render text('Name', facility.contact ?? '', (contact) => set({ contact }))}
			{@render text('Phone', facility.phone ?? '', (phone) => set({ phone }), 'tel')}
			{@render text('Email', facility.email ?? '', (email) => set({ email }), 'email')}
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
				{@render text(label, transport.details?.[label] ?? '', (text) =>
					set({ details: { ...transport.details, [label]: text } })
				)}
			{/each}
		</div>
	{/if}
</div>
