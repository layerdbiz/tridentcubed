<script lang="ts">
	// PROTOTYPE (#161) run 11: what the floating bar's blue + opens (Justin, 2026-10-26 19:22): one sheet from the
	// bottom to add a project, customer, team member, transport or facility. It opens on the page being looked at; the
	// chips at its top switch what is added. A new project opens straight away, as New project did; anything else
	// lands in its page's list, and that page shows.
	import BottomSheet from './bottom-sheet.svelte';
	import {
		FACILITY_ICONS,
		PAGE_ICONS,
		PAGES,
		TRANSPORT_TYPES,
		type DatasetType,
		type FacilityKindType,
		type TransportTypeType
	} from './look.data';
	import type { LookState } from './look.state.svelte';
	import type { TeamMemberType } from './team.data';

	let { look }: { look: LookState } = $props();

	const KINDS: Record<DatasetType, string> = {
		projects: 'Project',
		customers: 'Customer',
		team: 'Team member',
		transport: 'Transport',
		facilities: 'Facility'
	};
	const HINTS: Record<DatasetType, string> = {
		projects: "You'll be the Owner. Add the rest inside.",
		customers: 'A company Trident Cubed works for.',
		team: 'They get an email to sign in.',
		transport: 'A ship, barge, plane, train or truck, picked in any project.',
		facilities: 'A port, airport, rail yard or depot, picked in any project.'
	};
	const ROLES: { id: TeamMemberType['role']; label: string }[] = [
		{ id: 'team', label: 'Team' },
		{ id: 'manager', label: 'Manager' },
		{ id: 'admin', label: 'Admin' }
	];
	const FIELD =
		'w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary';
	const LABEL = 'mb-1 block text-xs font-medium text-slate-500';

	let kind = $derived<DatasetType>(look.adding ?? 'projects');
	let name = $state('');
	let city = $state('');
	let email = $state('');
	let customer = $derived(look.customers[0]);
	let role = $state<TeamMemberType['role']>('team');
	let type = $state<TransportTypeType>('Sea');
	let mode = $derived(TRANSPORT_TYPES[type].modes[0]);
	let facility = $state<FacilityKindType>('Port');

	function close() {
		look.adding = undefined;
		name = city = email = '';
	}

	function add() {
		const title = name.trim();
		if (kind === 'projects') {
			look.create(title, customer);
			name = '';
			return;
		}
		if (!title) return;
		if (kind === 'customers') look.addCustomer(title, city.trim());
		else if (kind === 'team') look.addMember({ name: title, email: email.trim(), role });
		else if (kind === 'transport') look.addTransport({ name: title, type, mode });
		else look.addFacility({ name: title, kind: facility, city: city.trim() });
		const page = kind;
		close();
		if (look.dataset !== page) look.pick(page);
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

{#if look.adding}
	<BottomSheet
		label="Add"
		onclose={close}
	>
		<form
			onsubmit={(event) => {
				event.preventDefault();
				add();
			}}
		>
			<div class="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5">
				{#each PAGES as id (id)}
					{@render chip(kind === id, KINDS[id], () => (kind = id), PAGE_ICONS[id].icon)}
				{/each}
			</div>
			<div class="mb-5 flex items-center gap-3">
				<span
					class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
					><span class="{PAGE_ICONS[kind].active} size-6"></span></span
				>
				<div>
					<p class="text-lg font-semibold text-slate-900">New {KINDS[kind].toLowerCase()}</p>
					<p class="text-xs text-slate-500">{HINTS[kind]}</p>
				</div>
			</div>
			<label class="mb-3 block">
				<span class={LABEL}>{kind === 'projects' ? 'Title' : 'Name'}</span>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					class={FIELD}
					placeholder={kind === 'projects'
						? 'e.g. Steel coil discharge'
						: kind === 'customers'
							? 'e.g. Gulf Coast Metals'
							: kind === 'team'
								? 'First and last name'
								: kind === 'transport'
									? 'e.g. MV Coral Dawn'
									: 'e.g. Berth 12'}
					bind:value={name}
					autofocus
				/>
			</label>
			{#if kind === 'projects'}
				<label class="mb-3 block">
					<span class={LABEL}>Customer</span>
					<select
						class={FIELD}
						bind:value={customer}
					>
						{#each look.customers as item (item)}<option>{item}</option>{/each}
					</select>
				</label>
			{:else if kind === 'team'}
				<label class="mb-3 block">
					<span class={LABEL}>Email</span>
					<input
						class={FIELD}
						type="email"
						placeholder="name@tridentcubed.com"
						bind:value={email}
					/>
				</label>
				<p class={LABEL}>Role</p>
				<div class="mb-3 flex gap-2">
					{#each ROLES as item (item.id)}
						{@render chip(role === item.id, item.label, () => (role = item.id))}
					{/each}
				</div>
			{:else if kind === 'transport'}
				<p class={LABEL}>Transport type</p>
				<div class="mb-3 flex flex-wrap gap-2">
					{#each Object.entries(TRANSPORT_TYPES) as [id, item] (id)}
						{@render chip(type === id, id, () => (type = id as TransportTypeType), item.icon)}
					{/each}
				</div>
				<p class={LABEL}>Transport mode</p>
				<div class="mb-3 flex flex-wrap gap-2">
					{#each TRANSPORT_TYPES[type].modes as item (item)}
						{@render chip(mode === item, item, () => (mode = item))}
					{/each}
				</div>
			{:else}
				{#if kind === 'facilities'}
					<p class={LABEL}>Kind</p>
					<div class="mb-3 flex flex-wrap gap-2">
						{#each Object.entries(FACILITY_ICONS) as [id, icon] (id)}
							{@render chip(facility === id, id, () => (facility = id as FacilityKindType), icon)}
						{/each}
					</div>
				{/if}
				<label class="mb-3 block">
					<span class={LABEL}>City</span>
					<input
						class={FIELD}
						placeholder="e.g. Houston, TX"
						bind:value={city}
					/>
				</label>
			{/if}
			<div class="mt-6 flex gap-2">
				<button
					type="button"
					class="flex-1 rounded-full border border-slate-200 py-2.5 font-medium text-slate-600"
					onclick={close}>Cancel</button
				>
				<button
					type="submit"
					class="flex-1 rounded-full bg-primary py-2.5 font-medium text-white disabled:opacity-40"
					disabled={kind !== 'projects' && !name.trim()}
					>{kind === 'projects' ? 'Create' : 'Add'}</button
				>
			</div>
		</form>
	</BottomSheet>
{/if}
