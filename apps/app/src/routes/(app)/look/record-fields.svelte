<script lang="ts">
	// PROTOTYPE (#161) run 16: every field of a customer, a team, a transport mode or a facility, written once
	// (Justin, 2026-11-10: "turn the data into a component so we don't repeat ourselves"). The + sheet shows it over
	// an empty draft and a record's Edit tab over the record itself, so the two always ask for the same things. It
	// only reads `value` and reports each change through `set`; who keeps the change is the caller's business. A
	// customer has any number of contacts (2026-11-10). Since #373 every input is the library's notched field with its
	// ? on the border, like the Project panel's: Input for what is typed, Select for what is picked.
	import { Button, initialsOf, Input, Select, toCode, toInitialsPicture } from '@layerd/ui';
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

	// How each kind of input is typed into: words with capitals and spelling help; an email, a phone or a web address
	// on its own keyboard, without.
	const TYPING = { autocapitalize: 'sentences', autocorrect: 'on', spellcheck: true } as const;
	const KEYBOARDS = {
		email: { inputmode: 'email', autocapitalize: 'off', spellcheck: false },
		tel: { inputmode: 'tel' },
		url: { inputmode: 'url', autocapitalize: 'off', spellcheck: false }
	} as const;
	type InputKindType = 'text' | keyof typeof KEYBOARDS;
	const CARD = 'space-y-4 rounded-3xl bg-white p-4 ring-1 ring-slate-900/[0.05]';
	const HEADING = 'text-sm font-semibold text-slate-900';
	const ROLES: TeamMemberType['role'][] = ['admin', 'manager', 'team'];

	const customer = $derived(page === 'customers' ? (value as ClientType) : undefined);
	const member = $derived(page === 'team' ? (value as TeamMemberType) : undefined);
	const transport = $derived(page === 'transport' ? (value as TransportType) : undefined);
	const facility = $derived(page === 'facilities' ? (value as FacilityType) : undefined);
	const contacts = $derived(customer?.contacts ?? []);
	// The Short Code the app makes from the name (a Generated value), shown until someone types over it; none before
	// the name is typed.
	const madeCode = $derived(customer?.name.trim() ? toCode(customer.name) : '');
	// With no logo yet, its code in the Logo field, as every other circle shows it (#355); with no letters either,
	// the field's own empty frame.
	const codePicture = $derived(
		customer?.name.trim() ? toInitialsPicture(toCode(customer.name, customer.code), 'customer') : ''
	);
	// A record's name as it is typed, kept here until the Name is left; then the record is renamed.
	let typedName = $state<string>();
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

	// A new record's form opens on its Name, as the input's own autofocus did: once everything around it is drawn and
	// the sheet it sits in is open, since an input in a closed sheet takes no focus.
	function focusName(node: HTMLElement) {
		queueMicrotask(() => node.querySelector('input')?.focus());
	}

	// The Name is left: the record takes the name typed. Turned down, the field shows the record's own name again. A
	// customer whose Short Code is still the one made from its name, and that no project uses yet, takes the code of
	// its new name (a + makes "New Customer", code NEW); once a project uses it, its project numbers keep their code.
	function rename() {
		const name = typedName;
		typedName = undefined;
		if (name === undefined || !onname) return;
		const isFollowing =
			customer?.code === toCode(customer?.name ?? '') &&
			!look.projects.some((project) => project.client === customer?.name);
		if (onname(name) && isFollowing) set({ code: toCode(name) });
	}

	function keyboardOf(type: InputKindType) {
		return type === 'text' ? TYPING : KEYBOARDS[type];
	}

	// What an input holds, as text: the library's Input may hand back no value at all.
	function toText(value: unknown) {
		return String(value ?? '');
	}

	function leaveOnEnter(event: KeyboardEvent) {
		if (event.key === 'Enter') (event.target as HTMLElement).blur();
	}

	function keepCode(text: unknown) {
		set({
			code: toText(text)
				.replace(/[^a-z0-9]/gi, '')
				.toUpperCase()
		});
	}

	// A customer that exists always has a Short Code, since its project numbers start with it: left empty or reset, it
	// takes the one made from its name. A new one's stays empty and follows the name until it is added (look.add).
	function fillCode() {
		if (!isNew && customer && !customer.code) set({ code: madeCode });
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

<!-- A typed input: the library's notched field, its ? from the Help text table (#299). -->
{#snippet text(
	label: string,
	key: string,
	current: string,
	oninput: (text: string) => void,
	type: InputKindType = 'text'
)}
	<Input
		{label}
		{type}
		{...keyboardOf(type)}
		bind:value={() => current, (text) => oninput(toText(text))}
		help={look.helpOf(key)}
	/>
{/snippet}

<!-- Where it is: one field everywhere, which suggests places and saves the one picked (place-field.svelte). -->
{#snippet place(label: string, key: string, current: string, oninput: (text: string) => void)}
	<PlaceField
		{look}
		{label}
		help={look.helpOf(key)}
		value={current}
		{oninput}
	/>
{/snippet}

<div class="space-y-4">
	<div class={CARD}>
		{#if customer}
			<ImageField
				label="Logo"
				shape="logo"
				value={customer.icon || codePicture}
				canRemove={Boolean(customer.icon)}
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
		{#if isNew}
			<!-- A new record's name is typed like any field; the form opens on it. -->
			<div {@attach focusName}>
				<Input
					label="Name"
					{...TYPING}
					bind:value={() => value.name, (name) => set({ name: toText(name) })}
					help={look.helpOf(`${record}.name`)}
				/>
			</div>
		{:else}
			<Input
				label="Name"
				{...TYPING}
				bind:value={() => typedName ?? value.name, (name) => (typedName = toText(name))}
				onchange={rename}
				onfocusout={() => (typedName = undefined)}
				onkeydown={leaveOnEnter}
				help={look.helpOf(`${record}.name`)}
			/>
		{/if}

		{#if customer}
			<div>
				<Input
					label="Short Code"
					maxlength={5}
					autocapitalize="characters"
					bind:value={() => customer.code, keepCode}
					generated={madeCode || undefined}
					onreset={fillCode}
					onchange={fillCode}
					help={look.helpOf('customer.code')}
				/>
				<span class="mt-1.5 block px-1 text-xs text-slate-400"
					>Starts its project numbers and document IDs, like {customer.code ||
						madeCode ||
						'SGL'}-2026-05-12-J01.</span
				>
			</div>
			<Select
				label="Type"
				options={CUSTOMER_TYPES.map((label) => ({ value: label, label }))}
				multiple
				value={typesOf(customer.kind)}
				many="types"
				icon="icon-[mdi--tag-outline]"
				required
				help={look.helpOf('customer.types')}
				onpick={(label) => set({ kind: toggle(typesOf(customer.kind), label).join(', ') })}
			/>
			{@render place('Location', 'customer.city', customer.city, (city) => set({ city }))}
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
			<Select
				label="Role"
				options={ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
				value={member.role}
				icon="icon-[mdi--shield-account-outline]"
				disabled={!look.isAdmin}
				required
				help={look.helpOf('team.role')}
				onpick={(role) => set({ role })}
			/>
			{@render text('Title', 'team.title', member.title, (title) => set({ title }))}
			<Select
				label="Labels"
				options={[...new Set([...TEAM_LABELS, ...labelsOf(member)])].map((label) => ({
					value: label,
					label
				}))}
				multiple
				value={labelsOf(member)}
				many="labels"
				icon="icon-[mdi--tag-outline]"
				help={look.helpOf('team.labels')}
				onpick={(label) => set({ label: toggle(labelsOf(member), label).join(', ') })}
			/>
			{@render text('Phone', 'team.phone', member.phone, (phone) => set({ phone }), 'tel')}
			{@render text('Email', 'team.email', member.email, (email) => set({ email }), 'email')}
			{@render place('Location', 'team.location', member.location, (location) => set({ location }))}
		{:else if transport}
			<Select
				label="Transport Mode"
				options={MODES.map((mode) => ({ value: mode, label: mode, icon: MODE_ICONS[mode] }))}
				value={transport.mode}
				icon="icon-[mdi--cube-send]"
				required
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
			<Select
				label="Kind"
				options={Object.entries(FACILITY_ICONS).map(([kind, icon]) => ({
					value: kind,
					label: kind,
					icon
				}))}
				value={facility.kind}
				icon="icon-[mdi--domain]"
				required
				help={look.helpOf('facility.kind')}
				onpick={(kind) => set({ kind: kind as FacilityKindType })}
			/>
			{@render place('Location', 'facility.city', facility.city, (city) => set({ city }))}
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
						value={contact.photo ||
							(contact.name.trim() ? toInitialsPicture(initialsOf(contact.name), 'customer') : '')}
						canRemove={Boolean(contact.photo)}
						target={{ table: 'contact', column: 'photo', id: contact.id }}
						help={look.helpOf('contact.photo')}
						onpick={(url) => setContact(contact.id, { photo: url })}
					/>
					{@render text('Name', 'contact.name', contact.name, (name) =>
						setContact(contact.id, { name })
					)}
					{@render text('Title', 'contact.title', contact.title, (title) =>
						setContact(contact.id, { title })
					)}
					{@render text(
						'Email',
						'contact.email',
						contact.email,
						(email) => setContact(contact.id, { email }),
						'email'
					)}
					{@render text(
						'Phone',
						'contact.phone',
						contact.phone,
						(phone) => setContact(contact.id, { phone }),
						'tel'
					)}
				</div>
			{/each}
			<Button
				neutral
				lite
				sm
				width="full"
				align="center"
				icon="icon-[mdi--plus]"
				label="Add a contact"
				onclick={() => set({ contacts: [...contacts, newContact()] })}
			/>
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
