<script lang="ts">
	// PROTOTYPE (#161) run 16: every field of a customer, a team, a transport mode or a facility, written once
	// (Justin, 2026-11-10: "turn the data into a component so we don't repeat ourselves"). The + sheet shows it over
	// an empty draft and a record's Edit tab over the record itself, so the two always ask for the same things. It
	// only reads `value` and reports each change through `set`; who keeps the change is the caller's business. A
	// customer has any number of contacts (2026-11-10).
	import { Help } from '@layerd/ui';
	import ImageField from './image-field.svelte';
	import {
		FACILITY_ICONS,
		MODE_ICONS,
		MODES,
		newContact,
		PARTICULARS,
		personOf,
		typeOfMode,
		type ClientType,
		type ContactType,
		type FacilityKindType,
		type FacilityType,
		type TransportType
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
	const LABEL = 'mb-1 flex items-center gap-1 text-xs font-medium text-slate-500';
	const CARD = 'space-y-4 rounded-3xl bg-white p-4 ring-1 ring-slate-900/[0.05]';
	const HEADING = 'text-sm font-semibold text-slate-900';
	const ROLES: TeamMemberType['role'][] = ['admin', 'manager', 'team'];

	const customer = $derived(page === 'customers' ? (value as ClientType) : undefined);
	const member = $derived(page === 'team' ? (value as TeamMemberType) : undefined);
	const transport = $derived(page === 'transport' ? (value as TransportType) : undefined);
	const facility = $derived(page === 'facilities' ? (value as FacilityType) : undefined);
	const contacts = $derived(customer?.contacts ?? []);
	const uid = $props.id();
	// What the record's inputs' Help text keys start with (#299): `customer.name`, `facility.city`.
	const record = $derived(
		(
			{
				customers: 'customer',
				team: 'team',
				transport: 'transport',
				facilities: 'facility'
			} as const
		)[page]
	);

	// A particular's Help text key: `particular.imoNumber` for IMO number.
	function particularKeyOf(label: string) {
		const [first = '', ...rest] = label.split(' ');
		return `particular.${first.toLowerCase()}${rest.map((word) => word[0].toUpperCase() + word.slice(1)).join('')}`;
	}

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

<!-- An input's label and its ? (#299), outside the <label>, so a tap on the ? never reaches the input. The block
     is `has-help`, with `data-empty` while the input has nothing in it (look.css). `id` tells apart the inputs of
     a list that share a key, such as each contact's Name. -->
{#snippet labelOf(label: string, key: string, id: string)}
	<span class={LABEL}>
		<label for={id}>{label}</label>
		{#if look.helpOf(key)}<Help
				{label}
				text={look.helpOf(key)}
			/>{/if}
	</span>
{/snippet}

{#snippet text(
	label: string,
	key: string,
	current: string,
	oninput: (text: string) => void,
	type = 'text',
	id = `${uid}-${key}`
)}
	<div
		class="has-help block"
		data-empty={current ? undefined : ''}
	>
		{@render labelOf(label, key, id)}
		<input
			{id}
			class={FIELD}
			{type}
			value={current}
			oninput={(event) => oninput(event.currentTarget.value)}
		/>
	</div>
{/snippet}

<!-- Where it is: one field everywhere, which suggests places and saves the one picked (place-field.svelte). -->
{#snippet place(label: string, key: string, current: string, oninput: (text: string) => void)}
	<div
		class="has-help"
		data-empty={current ? undefined : ''}
	>
		{@render labelOf(label, key, `${uid}-${key}`)}
		<PlaceField
			{look}
			id="{uid}-{key}"
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
				target={{ table: 'customer', column: 'logo', id: customer.id }}
				help={look.helpOf('customer.logo')}
				hint="Shows on its rows and cards, and in the footer of every report page."
				onpick={(url) => set({ icon: url, logo: url })}
			/>
		{:else if member}
			<ImageField
				label="Photo"
				shape="face"
				value={member.photo || (isNew ? '' : personOf(member.name).photo)}
				canRemove={Boolean(member.photo)}
				target={{ table: 'team', column: 'photo', id: member.id }}
				help={look.helpOf('team.photo')}
				hint="Shows wherever they do, and beside their sign-off on a report they own."
				onpick={(url) => set({ photo: url })}
			/>
		{/if}
		<div
			class="has-help block"
			data-empty={value.name ? undefined : ''}
		>
			{@render labelOf('Name', `${record}.name`, `${uid}-name`)}
			{#if isNew}
				<!-- svelte-ignore a11y_autofocus -->
				<input
					id="{uid}-name"
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
					id="{uid}-name"
					class={FIELD}
					value={value.name}
					onchange={rename}
					onkeydown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
				/>
			{/if}
		</div>

		{#if customer}
			<div
				class="has-help block"
				data-empty={customer.code ? undefined : ''}
			>
				{@render labelOf('Short Code', 'customer.code', `${uid}-code`)}
				<input
					id="{uid}-code"
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
			</div>
			<Picker
				label="Type"
				options={CUSTOMER_TYPES.map((label) => ({ id: label, label }))}
				values={typesOf(customer.kind)}
				many="types"
				icon="icon-[mdi--tag-outline]"
				help={look.helpOf('customer.types')}
				onpick={(label) => set({ kind: toggle(typesOf(customer.kind), label).join(', ') })}
			/>
			{@render place('City', 'customer.city', customer.city, (city) => set({ city }))}
			{@render text('Address', 'customer.address', customer.address ?? '', (address) =>
				set({ address })
			)}
			{@render text(
				'Email',
				'customer.email',
				customer.email ?? '',
				(email) => set({ email }),
				'email'
			)}
			{@render text(
				'Phone',
				'customer.phone',
				customer.phone ?? '',
				(phone) => set({ phone }),
				'tel'
			)}
			{@render text(
				'Website',
				'customer.website',
				customer.website ?? '',
				(website) => set({ website }),
				'url'
			)}
			<ImageField
				label="Background Picture"
				value={customer.photo ?? ''}
				target={{ table: 'customer', column: 'picture', id: customer.id }}
				help={look.helpOf('customer.picture')}
				hint="The picture behind its Page. Without one, its type's stock picture shows."
				onpick={(url) => set({ photo: url })}
			/>
		{:else if member}
			<Picker
				label="Role"
				options={ROLES.map((role) => ({ id: role, label: ROLE_LABELS[role] }))}
				value={member.role}
				icon="icon-[mdi--shield-account-outline]"
				isDisabled={!look.isAdmin}
				help={look.helpOf('team.role')}
				onpick={(role) => set({ role })}
			/>
			{@render text('Title', 'team.title', member.title, (title) => set({ title }))}
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
				help={look.helpOf('team.labels')}
				onpick={(label) => set({ label: toggle(labelsOf(member), label).join(', ') })}
			/>
			{@render text('Phone', 'team.phone', member.phone, (phone) => set({ phone }), 'tel')}
			{@render text('Email', 'team.email', member.email, (email) => set({ email }), 'email')}
			{@render place('Location', 'team.location', member.location, (location) => set({ location }))}
		{:else if transport}
			<Picker
				label="Transport Mode"
				options={MODES.map((mode) => ({ id: mode, label: mode, icon: MODE_ICONS[mode] }))}
				value={transport.mode}
				icon="icon-[mdi--cube-send]"
				help={look.helpOf('transport.mode')}
				onpick={(mode) => set({ mode, type: typeOfMode(mode) })}
			/>
			<ImageField
				label="Picture"
				value={transport.photo ?? ''}
				target={{ table: 'transport', column: 'picture', id: transport.id }}
				help={look.helpOf('transport.picture')}
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
				help={look.helpOf('facility.kind')}
				onpick={(kind) => set({ kind: kind as FacilityKindType })}
			/>
			{@render place('City', 'facility.city', facility.city, (city) => set({ city }))}
			{@render text('Address', 'facility.address', facility.address ?? '', (address) =>
				set({ address })
			)}
			<ImageField
				label="Picture"
				value={facility.photo ?? ''}
				target={{ table: 'facility', column: 'picture', id: facility.id }}
				help={look.helpOf('facility.picture')}
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
						target={{ table: 'contact', column: 'photo', id: contact.id }}
						help={look.helpOf('contact.photo')}
						onpick={(url) => setContact(contact.id, { photo: url })}
					/>
					{@render text(
						'Name',
						'contact.name',
						contact.name,
						(name) => setContact(contact.id, { name }),
						'text',
						`${uid}-${contact.id}-name`
					)}
					{@render text(
						'Title',
						'contact.title',
						contact.title,
						(title) => setContact(contact.id, { title }),
						'text',
						`${uid}-${contact.id}-title`
					)}
					{@render text(
						'Email',
						'contact.email',
						contact.email,
						(email) => setContact(contact.id, { email }),
						'email',
						`${uid}-${contact.id}-email`
					)}
					{@render text(
						'Phone',
						'contact.phone',
						contact.phone,
						(phone) => setContact(contact.id, { phone }),
						'tel',
						`${uid}-${contact.id}-phone`
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
			{@render text('Name', 'facility.contactName', facility.contact ?? '', (contact) =>
				set({ contact })
			)}
			{@render text(
				'Phone',
				'facility.phone',
				facility.phone ?? '',
				(phone) => set({ phone }),
				'tel'
			)}
			{@render text(
				'Email',
				'facility.email',
				facility.email ?? '',
				(email) => set({ email }),
				'email'
			)}
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
				{@render text(label, particularKeyOf(label), transport.details?.[label] ?? '', (text) =>
					set({ details: { ...transport.details, [label]: text } })
				)}
			{/each}
		</div>
	{/if}
</div>
