<script lang="ts">
	// PROTOTYPE (#161): the inputs inside one panel, by kind: fields, project, time log or photo groups. Everything is
	// live: typing moves the panel's count, its bar, the project's bar and the preview. The Project panel is its fields
	// with the Team and then the Transport section after Client; its drop-downs offer "Add new", a quick sheet (note 26).
	// Transport (Justin, 2026-10-25): one row per transport, added like a photo group and dragged into route order;
	// each row picks a Transport type (Sea, Air, Rail, Road), then a Transport mode (Vessel, Barge …), then the transport from the organization's list. The
	// Facility drop-down offers the facilities that suit the rows' types.
	import { flip } from 'svelte/animate';
	import { slide } from 'svelte/transition';
	import Avatar from './avatar.svelte';
	import BottomSheet from './bottom-sheet.svelte';
	import {
		createId,
		FACILITY_ICONS,
		MODE_ICONS,
		LAYOUTS,
		legOf,
		PEOPLE,
		photoOf,
		TRANSPORT_TYPES,
		type FacilityKindType,
		type FieldType,
		type LegType,
		type PanelType,
		type TransportTypeType
	} from './look.data';
	import type { LookState } from './look.state.svelte';
	import Menu from './menu.svelte';
	import { sortable } from './sortable';

	let { look, panel }: { look: LookState; panel: PanelType } = $props();

	let openDays = $state<string[]>([panel.days[0]?.id ?? '']);
	let openGroups = $state<string[]>([panel.groups[0]?.id ?? '']);

	function toggle(list: string[], id: string) {
		return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
	}

	function pick(event: Event, onfile: (url: string, name: string) => void) {
		const input = event.currentTarget as HTMLInputElement;
		for (const file of input.files ?? []) onfile(URL.createObjectURL(file), file.name);
		input.value = '';
		look.saved();
	}

	// "Add new" in a drop-down: the quick sheet adds the name to its list and picks it. A new facility also asks its
	// kind; a new transport takes the row's type and mode.
	const ADD = '__add';
	type AskType = { label: string; kinds?: FacilityKindType[]; onadd: (name: string) => void };
	let asking = $state<AskType>();
	let draft = $state('');
	let draftKind = $state<FacilityKindType>('Port');

	const FACILITY_KINDS = Object.keys(FACILITY_ICONS) as FacilityKindType[];
	// The facility kinds the rows' transport types use; none picked yet means every kind.
	const suited = $derived([
		...new Set(
			panel.legs
				.filter((leg) => leg.type)
				.map((leg) => TRANSPORT_TYPES[leg.type as TransportTypeType].facility)
		)
	]);

	function optionsOf(field: FieldType) {
		if (field.label !== 'Facility') return field.options ?? [];
		const names = look.facilities
			.filter((facility) => !suited.length || suited.includes(facility.kind))
			.map((facility) => facility.name);
		return field.value && !names.includes(field.value) ? [field.value, ...names] : names;
	}

	function ask(asked: AskType) {
		draft = '';
		draftKind = asked.kinds?.[0] ?? 'Port';
		asking = asked;
	}

	function choose(field: FieldType, event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		if (select.value !== ADD) return (field.value = select.value);
		select.value = field.value;
		if (field.label === 'Facility')
			return ask({
				label: 'Facility',
				kinds: [...suited, ...FACILITY_KINDS.filter((kind) => !suited.includes(kind))],
				onadd: (name) => {
					const city = panel.fields.find((item) => item.label === 'Location')?.value;
					look.addFacility({ name, kind: draftKind, city: city || look.project.location });
					field.value = name;
				}
			});
		ask({
			label: field.label,
			onadd: (name) => {
				field.options = [...(field.options ?? []), name];
				field.value = name;
			}
		});
	}

	function add() {
		if (!asking || !draft.trim()) return;
		asking.onadd(draft.trim());
		asking = undefined;
		look.saved();
	}

	// The Transport section's rows.
	const TYPES = Object.keys(TRANSPORT_TYPES) as TransportTypeType[];

	function setType(leg: LegType, type: string) {
		if (leg.type === type) return;
		const { modes } = TRANSPORT_TYPES[type as TransportTypeType];
		leg.type = type as TransportTypeType;
		leg.mode = modes.length === 1 ? modes[0] : '';
		leg.name = '';
		look.saved();
	}

	function setMode(leg: LegType, mode: string) {
		if (leg.mode === mode) return;
		leg.mode = mode;
		leg.name = '';
		look.saved();
	}

	function namesOf(leg: LegType) {
		const names = look.transports
			.filter((transport) => transport.mode === leg.mode)
			.map((transport) => transport.name);
		return leg.name && !names.includes(leg.name) ? [leg.name, ...names] : names;
	}

	function chooseName(leg: LegType, event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		if (select.value !== ADD) return (leg.name = select.value);
		select.value = leg.name;
		ask({
			label: leg.mode,
			onadd: (name) => {
				look.addTransport({ name, type: leg.type as TransportTypeType, mode: leg.mode });
				leg.name = name;
			}
		});
	}

	function addLeg() {
		panel.legs.push(legOf(''));
		look.saved();
	}

	function setImage(field: FieldType, event: Event) {
		pick(event, (url, name) => (field.value = field.type === 'file' ? name : url));
	}

	function addDay() {
		const day = {
			id: createId('day'),
			date: '',
			entries: [{ id: createId('entry'), time: '', activity: '' }]
		};
		panel.days.push(day);
		openDays = [...openDays, day.id];
		look.saved();
	}

	function sortEntries(index: number) {
		panel.days[index].entries.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
		look.saved();
	}

	function addGroup() {
		const group = { id: createId('group'), title: '', description: '', layout: 4, photos: [] };
		panel.groups.push(group);
		openGroups = [...openGroups, group.id];
		look.saved();
	}

	function move<T>(list: T[], from: number, to: number) {
		const [item] = list.splice(from, 1);
		list.splice(to, 0, item);
		look.saved();
	}

	// Run 3: borderless. Inputs are soft filled shapes that light up when you type, nothing boxed in.
	const inputClass =
		'w-full rounded-xl border-0 bg-slate-900/[0.04] px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:bg-white focus:ring-2 focus:ring-primary/40 disabled:bg-transparent disabled:px-0 disabled:text-slate-500';
	const labelClass = 'mb-1 flex items-center gap-1 text-xs font-medium text-slate-500';
	const ghostButton =
		'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition';
</script>

{#snippet fieldBlock(field: FieldType)}
	<label class="block {field.type === 'textarea' || field.type === 'image' ? 'sm:col-span-2' : ''}">
		<span class={labelClass}>
			{field.label}
			{#if !field.value && !field.isReadonly}<span
					class="size-1.5 rounded-full bg-warning"
					title="Not filled in yet"
				></span>{/if}
		</span>
		{#if field.type === 'select' && field.isAddable}
			<select
				class={inputClass}
				value={field.value}
				onchange={(event) => choose(field, event)}
			>
				<option value="">Choose…</option>
				{#each optionsOf(field) as option (option)}<option>{option}</option>{/each}
				<option value={ADD}>＋ Add new {field.label.toLowerCase()}…</option>
			</select>
		{:else if field.type === 'select'}
			<select
				class={inputClass}
				bind:value={field.value}
				disabled={field.isReadonly}
			>
				<option value="">Choose…</option>
				{#each field.options ?? [] as option (option)}<option>{option}</option>{/each}
			</select>
		{:else if field.type === 'textarea'}
			<textarea
				class="{inputClass} min-h-20 resize-y"
				bind:value={field.value}
				disabled={field.isReadonly}
				placeholder="Type here"></textarea>
		{:else if field.type === 'image'}
			<span class="flex items-center gap-3">
				<span
					class="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-900/[0.04]"
				>
					{#if field.value}
						<img
							src={field.value}
							alt=""
							class="size-full object-cover"
						/>
					{:else}
						<span class="icon-[mdi--image-plus-outline] size-7 text-slate-300"></span>
					{/if}
				</span>
				{#if !field.isReadonly}
					<span class="{ghostButton} cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200">
						<span class="icon-[mdi--upload] size-4"></span>{field.value ? 'Replace' : 'Upload'}
						<input
							type="file"
							accept="image/*"
							class="sr-only"
							onchange={(event) => setImage(field, event)}
						/>
					</span>
				{/if}
			</span>
		{:else if field.type === 'file'}
			<span class="flex items-center gap-2">
				<span class="{inputClass} flex items-center gap-2 truncate">
					<span class="icon-[mdi--file-document-outline] size-4 shrink-0 text-slate-400"></span>
					<span class="truncate {field.value ? '' : 'text-slate-300'}"
						>{field.value || 'No file yet'}</span
					>
				</span>
				<span
					class="{ghostButton} shrink-0 cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200"
				>
					<span class="icon-[mdi--paperclip] size-4"></span>Add
					<input
						type="file"
						class="sr-only"
						onchange={(event) => setImage(field, event)}
					/>
				</span>
			</span>
		{:else}
			<input
				class={inputClass}
				type={field.type}
				bind:value={field.value}
				disabled={field.isReadonly}
				placeholder="Type here"
			/>
		{/if}
	</label>
{/snippet}

{#snippet teamBlock()}
	<label class="block">
		<span class={labelClass}>Owner</span>
		<select
			class={inputClass}
			bind:value={panel.owner}
		>
			<option value="">Choose…</option>
			{#each PEOPLE as person (person.name)}<option>{person.name}</option>{/each}
		</select>
	</label>
	<div>
		<p class={labelClass}>Assigned · tap to add or remove</p>
		<div class="flex flex-wrap gap-2">
			{#each PEOPLE.filter((person) => person.name !== panel.owner) as person (person.name)}
				{@const isOn = panel.assigned.includes(person.name)}
				<button
					type="button"
					class="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs font-medium transition {isOn
						? 'bg-primary text-white shadow-md shadow-primary/25'
						: 'bg-slate-900/[0.04] text-slate-600 hover:bg-primary/10'}"
					aria-pressed={isOn}
					onclick={() => {
						panel.assigned = isOn
							? panel.assigned.filter((name) => name !== person.name)
							: [...panel.assigned, person.name];
						look.saved();
					}}
				>
					<Avatar
						name={person.name}
						size={24}
						ring={isOn ? 'ring-primary' : 'ring-white'}
					/>
					{person.name}
				</button>
			{/each}
		</div>
	</div>
{/snippet}

{#snippet dropdown(
	label: string,
	value: string,
	options: { id: string; label: string; icon: string }[],
	onpick: (id: string) => void
)}
	<div>
		<p class={labelClass}>
			{label}
			{#if !value}<span
					class="size-1.5 rounded-full bg-warning"
					title="Not picked yet"
				></span>{/if}
		</p>
		<Menu
			{label}
			{value}
			{options}
			{onpick}
			align="left"
			isWide
		>
			{#snippet trigger(current, isOpen)}
				<span
					class="{inputClass} flex items-center gap-2 text-left {isOpen
						? 'bg-white ring-2 ring-primary/40'
						: ''}"
				>
					{#if current}
						<span class="{current.icon} size-[18px] shrink-0 text-primary"></span>
						<span class="flex-1 truncate">{current.label}</span>
					{:else}
						<span class="flex-1 text-slate-400">Choose…</span>
					{/if}
					<span class="icon-[mdi--chevron-down] size-4 shrink-0 text-slate-400"></span>
				</span>
			{/snippet}
		</Menu>
	</div>
{/snippet}

{#snippet transportBlock()}
	<div class="space-y-3 rounded-2xl bg-slate-900/[0.025] p-3 sm:col-span-2">
		<p class="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
			<span class="icon-[mdi--ferry] size-4 text-primary"></span>Transport
			<span class="font-normal text-slate-400">· {panel.legs.length} in order, first to last</span>
		</p>
		<div
			class="space-y-2"
			{@attach sortable(`legs-${panel.id}`, (from, to) => move(panel.legs, from, to))}
		>
			{#each panel.legs as leg, legIndex (leg.id)}
				<div
					class="rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgb(15_23_42/0.05)] transition"
					data-sort="legs-{panel.id}"
					data-index={legIndex}
					animate:flip={{ duration: 200 }}
				>
					<div class="mb-2 flex items-center gap-2">
						<span
							class="-ml-1 flex size-7 cursor-grab touch-none items-center justify-center rounded-lg text-slate-300 hover:bg-slate-100 hover:text-slate-500"
							data-grip="legs-{panel.id}"
							title="Drag to reorder"><span class="icon-[mdi--drag] size-5"></span></span
						>
						<span
							class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
							><span class="{MODE_ICONS[leg.mode] ?? 'icon-[mdi--map-marker-path]'} size-5"
							></span></span
						>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-semibold text-slate-800"
								>{leg.name || `Transport ${legIndex + 1}`}</span
							>
							<span class="block text-[11px] text-slate-400"
								>{[leg.type, leg.mode].filter(Boolean).join(' · ') || 'Pick its type first'}</span
							>
						</span>
						<button
							type="button"
							class="flex size-7 shrink-0 items-center justify-center rounded-full text-slate-300 hover:bg-danger/10 hover:text-danger"
							aria-label="Remove {leg.name || `transport ${legIndex + 1}`}"
							onclick={() => {
								panel.legs.splice(legIndex, 1);
								look.saved();
							}}><span class="icon-[mdi--close] size-4"></span></button
						>
					</div>
					<div class="grid gap-2 sm:grid-cols-3">
						{@render dropdown(
							'Transport type',
							leg.type,
							TYPES.map((type) => ({ id: type, label: type, icon: TRANSPORT_TYPES[type].icon })),
							(type) => setType(leg, type)
						)}
						{#if leg.type}
							{@render dropdown(
								'Transport mode',
								leg.mode,
								TRANSPORT_TYPES[leg.type].modes.map((mode) => ({
									id: mode,
									label: mode,
									icon: MODE_ICONS[mode]
								})),
								(mode) => setMode(leg, mode)
							)}
						{/if}
						{#if leg.mode}
							<label class="block">
								<span class={labelClass}>
									{leg.mode}
									{#if !leg.name}<span
											class="size-1.5 rounded-full bg-warning"
											title="Not picked yet"
										></span>{/if}
								</span>
								<select
									class={inputClass}
									value={leg.name}
									onchange={(event) => chooseName(leg, event)}
								>
									<option value="">Choose…</option>
									{#each namesOf(leg) as name (name)}<option>{name}</option>{/each}
									<option value={ADD}>＋ Add new {leg.mode.toLowerCase()}…</option>
								</select>
							</label>
						{/if}
					</div>
				</div>
			{:else}
				<p class="py-2 text-center text-sm text-slate-400">No transport yet. Add the first one.</p>
			{/each}
		</div>
		<button
			type="button"
			class="{ghostButton} bg-slate-900 text-white hover:bg-slate-700"
			onclick={addLeg}><span class="icon-[mdi--plus] size-4"></span>Add transport</button
		>
	</div>
{/snippet}

{#if !panel.isEnabled}
	<p
		class="mb-3 flex items-start gap-2 rounded-xl bg-slate-900/[0.04] px-3 py-2.5 text-xs text-slate-500"
	>
		<span class="mt-px icon-[mdi--eye-off-outline] size-4 shrink-0"></span>
		This panel is off, so it is left out of the report. Switch it on to fill it in.
	</p>
{/if}

<fieldset
	disabled={!panel.isEnabled}
	class="space-y-3"
	oninput={() => look.saved()}
>
	{#if panel.kind === 'fields'}
		{#if panel.fields[0]?.isReadonly}
			<p class="flex items-center gap-1.5 text-xs text-slate-400">
				<span class="icon-[mdi--lock-outline] size-4"></span> Comes from your organization settings.
			</p>
		{/if}
		<div class="grid gap-3 sm:grid-cols-2">
			{#each panel.fields as field (field.id)}
				{@render fieldBlock(field)}
			{/each}
		</div>
	{:else if panel.kind === 'project'}
		<div class="grid gap-3 sm:grid-cols-2">
			{#each panel.fields as field (field.id)}
				{@render fieldBlock(field)}
				{#if field.label === 'Client'}
					<div class="space-y-3 rounded-2xl bg-slate-900/[0.025] p-3 sm:col-span-2">
						<p class="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
							<span class="icon-[mdi--account-group] size-4 text-primary"></span>Team
						</p>
						{@render teamBlock()}
					</div>
					{@render transportBlock()}
				{/if}
			{/each}
		</div>
	{:else if panel.kind === 'timelog'}
		{#each panel.days as day, dayIndex (day.id)}
			{@const isOpen = openDays.includes(day.id)}
			<div class="overflow-hidden rounded-2xl bg-slate-900/[0.03]">
				<button
					type="button"
					class="flex w-full items-center gap-3 px-4 py-3 text-left"
					onclick={() => (openDays = toggle(openDays, day.id))}
				>
					<span class="icon-[mdi--calendar-blank-outline] size-5 text-slate-400"></span>
					<span class="flex-1 text-sm font-semibold text-slate-800"
						>Day {dayIndex + 1}
						<span class="ml-1 font-normal text-slate-400">{day.entries.length} entries</span></span
					>
					<span class="text-xs text-slate-400">{day.date || 'No date'}</span>
					<span
						class="icon-[mdi--chevron-down] size-5 text-slate-400 transition {isOpen
							? 'rotate-180'
							: ''}"
					></span>
				</button>
				{#if isOpen}
					<div
						class="space-y-3 px-4 pb-4"
						transition:slide={{ duration: 180 }}
					>
						<label class="block">
							<span class={labelClass}>Date</span>
							<input
								class={inputClass}
								type="date"
								bind:value={day.date}
							/>
						</label>
						{#each day.entries as entry, entryIndex (entry.id)}
							<div
								class="flex items-start gap-2"
								animate:flip={{ duration: 200 }}
							>
								<input
									class="{inputClass} w-28 shrink-0"
									type="time"
									bind:value={entry.time}
									onchange={() => sortEntries(dayIndex)}
									aria-label="Time"
								/>
								<input
									class={inputClass}
									bind:value={entry.activity}
									placeholder="What happened"
									aria-label="Activity"
								/>
								<button
									type="button"
									class="mt-2 flex size-7 shrink-0 items-center justify-center rounded-full text-slate-300 hover:bg-slate-100 hover:text-danger"
									aria-label="Remove entry"
									onclick={() => {
										day.entries.splice(entryIndex, 1);
										look.saved();
									}}><span class="icon-[mdi--close] size-4"></span></button
								>
							</div>
						{/each}
						<div class="flex flex-wrap justify-between gap-2">
							<button
								type="button"
								class="{ghostButton} bg-primary/10 text-primary hover:bg-primary/15"
								onclick={() => {
									day.entries.push({ id: createId('entry'), time: '', activity: '' });
									look.saved();
								}}><span class="icon-[mdi--plus] size-4"></span>Add entry</button
							>
							<button
								type="button"
								class="{ghostButton} text-slate-400 hover:bg-danger/10 hover:text-danger"
								onclick={() => {
									panel.days.splice(dayIndex, 1);
									look.saved();
								}}><span class="icon-[mdi--trash-can-outline] size-4"></span>Delete day</button
							>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<p class="py-2 text-center text-sm text-slate-400">No days yet. Add the first one.</p>
		{/each}
		<button
			type="button"
			class="{ghostButton} bg-slate-900 text-white hover:bg-slate-700"
			onclick={addDay}><span class="icon-[mdi--calendar-plus] size-4"></span>Add day</button
		>
	{:else}
		<div
			class="space-y-3"
			{@attach sortable(`groups-${panel.id}`, (from, to) => move(panel.groups, from, to))}
		>
			{#each panel.groups as group, groupIndex (group.id)}
				{@const isOpen = openGroups.includes(group.id)}
				<div
					class="overflow-hidden rounded-2xl bg-slate-900/[0.03] transition"
					data-sort="groups-{panel.id}"
					data-index={groupIndex}
					animate:flip={{ duration: 200 }}
				>
					<div class="flex items-center gap-2 px-2 py-2">
						<span
							class="flex size-8 cursor-grab touch-none items-center justify-center rounded-lg text-slate-300 hover:bg-slate-100 hover:text-slate-500"
							data-grip="groups-{panel.id}"
							title="Drag to reorder"><span class="icon-[mdi--drag] size-5"></span></span
						>
						<button
							type="button"
							class="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
							onclick={() => (openGroups = toggle(openGroups, group.id))}
						>
							<span class="truncate text-sm font-semibold text-slate-800"
								>{group.title || 'Untitled group'}</span
							>
							<span class="shrink-0 text-xs text-slate-400">{group.photos.length} photos</span>
						</button>
						<span
							class="mr-2 icon-[mdi--chevron-down] size-5 text-slate-400 transition {isOpen
								? 'rotate-180'
								: ''}"
						></span>
					</div>
					{#if isOpen}
						<div
							class="space-y-3 px-4 pb-4"
							transition:slide={{ duration: 180 }}
						>
							<label class="block">
								<span class={labelClass}>Title</span>
								<input
									class={inputClass}
									bind:value={group.title}
									placeholder="e.g. Hatch 2 before discharge"
								/>
							</label>
							<label class="block">
								<span class={labelClass}>Description</span>
								<textarea
									class="{inputClass} min-h-16"
									bind:value={group.description}
									placeholder="Optional"></textarea>
							</label>
							<div>
								<p class={labelClass}>Photos per page</p>
								<div class="flex gap-1.5">
									{#each LAYOUTS as layout (layout)}
										<button
											type="button"
											class="flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold transition {group.layout ===
											layout
												? 'bg-primary text-white shadow-md shadow-primary/25'
												: 'bg-white text-slate-500 hover:text-primary'}"
											onclick={() => {
												group.layout = layout;
												look.saved();
											}}
										>
											<span
												class="{layout === 2
													? 'icon-[mdi--view-agenda-outline]'
													: layout === 4
														? 'icon-[mdi--view-grid-outline]'
														: 'icon-[mdi--view-module-outline]'} size-4"
											></span>{layout}
										</button>
									{/each}
								</div>
							</div>
							<div
								class="grid grid-cols-3 gap-2"
								{@attach sortable(`photos-${group.id}`, (from, to) => move(group.photos, from, to))}
							>
								{#each group.photos as photo, photoIndex (photo.id)}
									<div
										class="group relative aspect-square overflow-hidden rounded-xl bg-slate-100 transition"
										data-sort="photos-{group.id}"
										data-index={photoIndex}
										animate:flip={{ duration: 200 }}
									>
										<img
											src={photo.src}
											alt={photo.caption}
											class="size-full cursor-grab touch-none object-cover select-none"
											draggable="false"
											data-grip="photos-{group.id}"
										/>
										<button
											type="button"
											class="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-slate-900/70 text-white backdrop-blur"
											aria-label="Remove photo"
											onclick={() => {
												group.photos.splice(photoIndex, 1);
												look.saved();
											}}><span class="icon-[mdi--close] size-4"></span></button
										>
									</div>
								{/each}
								<label
									class="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-primary/[0.06] text-primary/70 transition hover:bg-primary/10 hover:text-primary"
								>
									<span class="icon-[mdi--image-plus-outline] size-6"></span>
									<span class="text-[11px] font-medium">Upload</span>
									<input
										type="file"
										accept="image/*"
										multiple
										class="sr-only"
										onchange={(event) =>
											pick(event, (src, name) =>
												group.photos.push({ id: createId('photo'), src, caption: name })
											)}
									/>
								</label>
								<label
									class="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-primary/[0.06] text-primary/70 transition hover:bg-primary/10 hover:text-primary"
								>
									<span class="icon-[mdi--camera-outline] size-6"></span>
									<span class="text-[11px] font-medium">Camera</span>
									<input
										type="file"
										accept="image/*"
										capture="environment"
										class="sr-only"
										onchange={(event) =>
											pick(event, (src, name) =>
												group.photos.push({ id: createId('photo'), src, caption: name })
											)}
									/>
								</label>
							</div>
							<div class="flex flex-wrap justify-between gap-2">
								<button
									type="button"
									class="{ghostButton} bg-primary/10 text-primary hover:bg-primary/15"
									onclick={() => {
										group.photos.push({
											id: createId('photo'),
											src: photoOf(createId('demo')),
											caption: `${group.title || 'Photo'}`
										});
										look.saved();
									}}><span class="icon-[mdi--auto-fix] size-4"></span>Add a sample photo</button
								>
								<button
									type="button"
									class="{ghostButton} text-slate-400 hover:bg-danger/10 hover:text-danger"
									onclick={() => {
										panel.groups.splice(groupIndex, 1);
										look.saved();
									}}><span class="icon-[mdi--trash-can-outline] size-4"></span>Delete group</button
								>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<div
					class="flex flex-col items-center gap-1 rounded-2xl bg-slate-900/[0.03] py-6 text-slate-400"
				>
					<span class="icon-[mdi--image-filter-hdr] size-8"></span>
					<p class="text-sm">No photo groups yet.</p>
				</div>
			{/each}
		</div>
		<button
			type="button"
			class="{ghostButton} bg-slate-900 text-white hover:bg-slate-700"
			onclick={addGroup}><span class="icon-[mdi--plus] size-4"></span>Add group</button
		>
	{/if}
</fieldset>

{#if asking}
	{@const noun = asking.label.toLowerCase()}
	<BottomSheet
		label="Add a new {noun}"
		onclose={() => (asking = undefined)}
	>
		<form
			onsubmit={(event) => {
				event.preventDefault();
				add();
			}}
		>
			<b class="block text-lg text-slate-900">New {noun}</b>
			<p class="text-sm text-slate-500">
				Added here and to the {asking.kinds ? 'Facilities' : noun} list, without leaving the project.
			</p>
			<label class="mt-4 block">
				<span class={labelClass}>Name</span>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					class={inputClass}
					bind:value={draft}
					placeholder="{asking.label} name"
					autofocus
				/>
			</label>
			{#if asking.kinds}
				<p class="{labelClass} mt-3">Kind</p>
				<div class="grid grid-cols-2 gap-1.5">
					{#each asking.kinds as kind (kind)}
						<button
							type="button"
							class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition {draftKind ===
							kind
								? 'bg-primary text-white shadow-md shadow-primary/25'
								: 'bg-slate-900/[0.04] text-slate-600 hover:bg-primary/10'}"
							aria-pressed={draftKind === kind}
							onclick={() => (draftKind = kind)}
							><span class="{FACILITY_ICONS[kind]} size-[18px]"></span>{kind}</button
						>
					{/each}
				</div>
			{/if}
			<button
				class="mt-5 w-full rounded-full bg-primary py-3 text-sm font-semibold text-white disabled:opacity-40"
				disabled={!draft.trim()}>Add {noun}</button
			>
		</form>
	</BottomSheet>
{/if}
