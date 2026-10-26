<script lang="ts">
	// PROTOTYPE (#161): the inputs inside one panel, by kind: project, transport, items, time log or photo groups.
	// Everything is live: typing moves the panel's count, its bar, the project's bar and the preview. The Project panel is
	// its fields with the Team after Customer; its drop-downs offer "Add new", a quick sheet (note 26). The Transport panel
	// (Justin, 2026-10-25) is the trip, one stop per place in trip order: its point (Start, Stop, End, each with its
	// colour), Transport type, Transport mode, the transport from the organization's list, and the facility, whose list
	// puts the kind that suits the transport type first. Stops, photo groups and time log days are the same Group, with
	// Delete at the far right of its bottom row (run 8 note 10); every delete asks first. Each photo has its own
	// description: tap it, or Edit description in its ⋮ (notes 12 and 14). The time log can add a sample day (note 9).
	// Run 9: Items is rows of quantity and description, like the time log's entries (note 24); a photo with a
	// description shows an icon instead of its text (note 16), its ⋮ is bare dots (note 15), and the photos-per-page
	// buttons draw their own layout (note 17). Uploads are shrunk here, as V1 will, so the browser can keep them.
	import type { Attachment } from 'svelte/attachments';
	import { flip } from 'svelte/animate';
	import Avatar from './avatar.svelte';
	import BottomSheet from './bottom-sheet.svelte';
	import Group from './group.svelte';
	import {
		createId,
		FACILITY_ICONS,
		itemOf,
		LAYOUTS,
		MODE_ICONS,
		PEOPLE,
		photoOf,
		POINTS,
		stopOf,
		TRANSPORT_TYPES,
		type FacilityKindType,
		type FieldType,
		type PanelType,
		type PhotoType,
		type PointType,
		type StopType,
		type TransportTypeType
	} from './look.data';
	import type { LookState } from './look.state.svelte';
	import Menu, { type OptionType } from './menu.svelte';
	import { sortable } from './sortable';

	let { look, panel }: { look: LookState; panel: PanelType } = $props();

	let openDays = $state<string[]>([panel.days[0]?.id ?? '']);
	let openGroups = $state<string[]>([panel.groups[0]?.id ?? '']);
	let openStops = $state<string[]>([panel.stops[0]?.id ?? '']);

	function toggle(list: string[], id: string) {
		return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
	}

	// A picked image comes back at most 1280 px on its long side, as a JPEG small enough for the browser to keep.
	async function shrink(file: File) {
		try {
			const bitmap = await createImageBitmap(file);
			const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
			const canvas = document.createElement('canvas');
			canvas.width = Math.round(bitmap.width * scale);
			canvas.height = Math.round(bitmap.height * scale);
			canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
			bitmap.close();
			return canvas.toDataURL('image/jpeg', 0.78);
		} catch {
			return URL.createObjectURL(file);
		}
	}

	async function pick(event: Event, onfile: (url: string, name: string) => void) {
		const input = event.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		input.value = '';
		for (const file of files)
			onfile(file.type.startsWith('image/') ? await shrink(file) : '', file.name);
		look.saved();
	}

	// Asks first, then takes the item out of its list.
	function remove<T>(list: T[], item: T, title: string, note?: string) {
		look.confirm({
			title,
			note,
			onyes: () => {
				const index = list.indexOf(item);
				if (index >= 0) list.splice(index, 1);
				look.saved();
			}
		});
	}

	// "Add new" in a drop-down: the quick sheet adds the name to its list and picks it. A new facility also asks its
	// kind; a new transport takes the stop's type and mode.
	const ADD = '__add';
	type AskType = { label: string; kinds?: FacilityKindType[]; onadd: (name: string) => void };
	let asking = $state<AskType>();
	let draft = $state('');
	let draftKind = $state<FacilityKindType>('Port');

	const FACILITY_KINDS = Object.keys(FACILITY_ICONS) as FacilityKindType[];

	function ask(asked: AskType) {
		draft = '';
		draftKind = asked.kinds?.[0] ?? 'Port';
		asking = asked;
	}

	function choose(field: FieldType, event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		if (select.value !== ADD) return (field.value = select.value);
		select.value = field.value;
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

	// The Transport panel's stops.
	const TYPES = Object.keys(TRANSPORT_TYPES) as TransportTypeType[];
	const POINT_OPTIONS = (Object.keys(POINTS) as PointType[]).map((point) => ({
		id: point,
		label: `${point} (${POINTS[point].hint})`,
		dot: POINTS[point].dot
	}));

	function setPoint(stop: StopType, point: string) {
		stop.point = point as PointType;
		look.saved();
	}

	function setType(stop: StopType, type: string) {
		if (stop.type === type) return;
		const { modes } = TRANSPORT_TYPES[type as TransportTypeType];
		stop.type = type as TransportTypeType;
		stop.mode = modes.length === 1 ? modes[0] : '';
		stop.name = '';
		look.saved();
	}

	function setMode(stop: StopType, mode: string) {
		if (stop.mode === mode) return;
		stop.mode = mode;
		stop.name = '';
		look.saved();
	}

	function namesOf(stop: StopType) {
		const names = look.transports
			.filter((transport) => transport.mode === stop.mode)
			.map((transport) => transport.name);
		return stop.name && !names.includes(stop.name) ? [stop.name, ...names] : names;
	}

	function chooseName(stop: StopType, event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		if (select.value !== ADD) return (stop.name = select.value);
		select.value = stop.name;
		ask({
			label: stop.mode,
			onadd: (name) => {
				look.addTransport({ name, type: stop.type as TransportTypeType, mode: stop.mode });
				stop.name = name;
			}
		});
	}

	// Every facility, grouped by kind, the kind that suits the stop's transport type first (ports for Sea).
	function kindsOf(stop: StopType) {
		const suited = stop.type ? TRANSPORT_TYPES[stop.type].facility : undefined;
		return suited ? [suited, ...FACILITY_KINDS.filter((kind) => kind !== suited)] : FACILITY_KINDS;
	}

	function facilitiesOf(stop: StopType) {
		return kindsOf(stop)
			.map((kind) => ({
				kind,
				names: look.facilities
					.filter((facility) => facility.kind === kind)
					.map((facility) => facility.name)
			}))
			.filter((group) => group.names.length);
	}

	function chooseFacility(stop: StopType, event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		if (select.value !== ADD) return (stop.facility = select.value);
		select.value = stop.facility;
		ask({
			label: 'Facility',
			kinds: kindsOf(stop),
			onadd: (name) => {
				const location = look.panels
					.find((item) => item.kind === 'project')
					?.fields.find((item) => item.label === 'Location')?.value;
				look.addFacility({ name, kind: draftKind, city: location || look.project.location });
				stop.facility = name;
			}
		});
	}

	// The first stop starts the trip; a later one ends it, and the stop that ended it becomes a stop on the way.
	function addStop() {
		const stop = stopOf();
		stop.point = panel.stops.length ? 'End' : 'Start';
		for (const other of panel.stops) if (other.point === 'End') other.point = 'Stop';
		panel.stops.push(stop);
		openStops = [...openStops, stop.id];
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

	// A filled-in day the day after the last one, so the time log shows how a real day reads.
	const SAMPLE_DAY = [
		['07:00', 'Arrived on site, safety briefing with the terminal'],
		['07:45', 'Hatches opened, cargo condition checked before work'],
		['09:30', 'Discharge started, first lift landed on the quay'],
		['12:00', 'Break, cargo secured'],
		['13:00', 'Discharge resumed'],
		['16:15', 'Last lift landed, tally agreed with the stevedores'],
		['17:00', 'Left site']
	];

	function addSampleDay() {
		const last = panel.days.findLast((day) => day.date)?.date;
		const date = last ? new Date(`${last}T12:00`) : new Date();
		if (last) date.setDate(date.getDate() + 1);
		const day = {
			id: createId('day'),
			date: date.toISOString().slice(0, 10),
			entries: SAMPLE_DAY.map(([time, activity]) => ({ id: createId('entry'), time, activity }))
		};
		panel.days.push(day);
		openDays = [...openDays, day.id];
		look.saved();
	}

	// The photo whose description is open in the sheet. The sheet opens with the cursor at the end of the text, ready to
	// type: the browser's own autofocus skips a field that appears after a tap on a button.
	let editing = $state<PhotoType>();
	const focusEnd: Attachment<HTMLTextAreaElement> = (node) => {
		node.focus({ preventScroll: true });
		node.setSelectionRange(node.value.length, node.value.length);
	};

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
				{#each field.options ?? [] as option (option)}<option>{option}</option>{/each}
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
	options: OptionType[],
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
					{#if current?.dot}
						<span class="ml-0.5 size-2.5 shrink-0 rounded-full {current.dot}"></span>
						<span class="flex-1 truncate">{current.label}</span>
					{:else if current}
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

{#snippet unpicked(isShown: boolean)}
	{#if isShown}<span
			class="size-1.5 rounded-full bg-warning"
			title="Not picked yet"
		></span>{/if}
{/snippet}

{#snippet stopsBlock()}
	<p class="flex items-center gap-1.5 text-xs text-slate-400">
		<span class="icon-[mdi--map-marker-path] size-4"></span>
		{panel.stops.length}
		{panel.stops.length === 1 ? 'stop' : 'stops'} in trip order, first to last
	</p>
	<div
		class="space-y-3"
		{@attach sortable(`stops-${panel.id}`, (from, to) => move(panel.stops, from, to))}
	>
		{#each panel.stops as stop, stopIndex (stop.id)}
			<div animate:flip={{ duration: 200 }}>
				<Group
					title={stop.name || `Stop ${stopIndex + 1}`}
					note={[stop.point, stop.mode, stop.facility].filter(Boolean).join(' · ') ||
						'Pick where this sits on the trip first'}
					icon={MODE_ICONS[stop.mode] ??
						(stop.point ? POINTS[stop.point].icon : 'icon-[mdi--map-marker-outline]')}
					tone={stop.point ? POINTS[stop.point].chip : undefined}
					isOpen={openStops.includes(stop.id)}
					ontoggle={() => (openStops = toggle(openStops, stop.id))}
					ondelete={() =>
						remove(
							panel.stops,
							stop,
							`Delete ${stop.name || `stop ${stopIndex + 1}`}?`,
							'The stop and its page leave the report.'
						)}
					deleteLabel="Delete stop"
					sortKey="stops-{panel.id}"
					index={stopIndex}
				>
					<div class="grid gap-2 sm:grid-cols-2">
						{@render dropdown('Point', stop.point, POINT_OPTIONS, (point) => setPoint(stop, point))}
						{@render dropdown(
							'Transport type',
							stop.type,
							TYPES.map((type) => ({ id: type, label: type, icon: TRANSPORT_TYPES[type].icon })),
							(type) => setType(stop, type)
						)}
						{#if stop.type}
							{@render dropdown(
								'Transport mode',
								stop.mode,
								TRANSPORT_TYPES[stop.type].modes.map((mode) => ({
									id: mode,
									label: mode,
									icon: MODE_ICONS[mode]
								})),
								(mode) => setMode(stop, mode)
							)}
						{/if}
						{#if stop.mode}
							<label class="block">
								<span class={labelClass}>{stop.mode} {@render unpicked(!stop.name)}</span>
								<select
									class={inputClass}
									value={stop.name}
									onchange={(event) => chooseName(stop, event)}
								>
									<option value="">Choose…</option>
									{#each namesOf(stop) as name (name)}<option>{name}</option>{/each}
									<option value={ADD}>＋ Add new {stop.mode.toLowerCase()}…</option>
								</select>
							</label>
						{/if}
						{#if stop.type}
							<label class="block sm:col-span-2">
								<span class={labelClass}>Facility {@render unpicked(!stop.facility)}</span>
								<select
									class={inputClass}
									value={stop.facility}
									onchange={(event) => chooseFacility(stop, event)}
								>
									<option value="">Choose…</option>
									{#each facilitiesOf(stop) as group (group.kind)}
										<optgroup label="{group.kind}s">
											{#each group.names as name (name)}<option>{name}</option>{/each}
										</optgroup>
									{/each}
									<option value={ADD}>＋ Add new facility…</option>
								</select>
							</label>
						{/if}
					</div>
				</Group>
			</div>
		{:else}
			<div
				class="flex flex-col items-center gap-1 rounded-2xl bg-slate-900/[0.03] py-6 text-slate-400"
			>
				<span class="icon-[mdi--map-marker-path] size-8"></span>
				<p class="text-sm">No stops yet. Add where the trip starts.</p>
			</div>
		{/each}
	</div>
	<button
		type="button"
		class="{ghostButton} bg-slate-900 text-white hover:bg-slate-700"
		onclick={addStop}><span class="icon-[mdi--plus] size-4"></span>Add stop</button
	>
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
	disabled={!panel.isEnabled || look.isFrozen}
	class="min-w-0 space-y-3"
	oninput={() => look.saved()}
>
	{#if panel.kind === 'project'}
		<div class="grid gap-3 sm:grid-cols-2">
			{#each panel.fields as field (field.id)}
				{@render fieldBlock(field)}
				{#if field.label === 'Customer'}
					<div class="space-y-3 rounded-2xl bg-slate-900/[0.025] p-3 sm:col-span-2">
						<p class="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
							<span class="icon-[mdi--account-group] size-4 text-primary"></span>Team
						</p>
						{@render teamBlock()}
					</div>
				{/if}
			{/each}
		</div>
	{:else if panel.kind === 'transport'}
		{@render stopsBlock()}
	{:else if panel.kind === 'items'}
		{#if panel.items.length}
			<p class="flex gap-2 text-xs font-medium text-slate-500">
				<span class="w-20 shrink-0 pl-1">Quantity</span><span>Description</span>
			</p>
		{/if}
		{#each panel.items as item, itemIndex (item.id)}
			<div
				class="flex items-start gap-2"
				animate:flip={{ duration: 200 }}
			>
				<input
					class="{inputClass} w-20! shrink-0 text-center tabular-nums"
					inputmode="numeric"
					bind:value={item.quantity}
					placeholder="Qty"
					aria-label="Quantity of item {itemIndex + 1}"
				/>
				<input
					class={inputClass}
					bind:value={item.description}
					placeholder="What it is, e.g. Accessory crates"
					aria-label="Description of item {itemIndex + 1}"
				/>
				<button
					type="button"
					class="mt-2 flex size-7 shrink-0 items-center justify-center rounded-full text-slate-300 hover:bg-slate-100 hover:text-danger"
					aria-label="Delete item {itemIndex + 1}"
					onclick={() =>
						remove(
							panel.items,
							item,
							'Delete this item?',
							item.description
								? `"${item.description}" leaves the cargo description.`
								: 'It leaves the cargo description.'
						)}><span class="icon-[mdi--close] size-4"></span></button
				>
			</div>
		{:else}
			<p class="py-2 text-center text-sm text-slate-400">No items yet. Add the first one.</p>
		{/each}
		<button
			type="button"
			class="{ghostButton} bg-slate-900 text-white hover:bg-slate-700"
			onclick={() => {
				panel.items.push(itemOf());
				look.saved();
			}}><span class="icon-[mdi--plus] size-4"></span>Add item</button
		>
	{:else if panel.kind === 'timelog'}
		{#each panel.days as day, dayIndex (day.id)}
			<div animate:flip={{ duration: 200 }}>
				<Group
					title="Day {dayIndex + 1}"
					note="{day.entries.length} {day.entries.length === 1 ? 'entry' : 'entries'}"
					meta={day.date || 'No date'}
					icon="icon-[mdi--calendar-blank-outline]"
					isOpen={openDays.includes(day.id)}
					ontoggle={() => (openDays = toggle(openDays, day.id))}
					ondelete={() =>
						remove(
							panel.days,
							day,
							`Delete day ${dayIndex + 1}?`,
							`Its ${day.entries.length} time log entries go with it.`
						)}
					deleteLabel="Delete day"
				>
					<label class="block">
						<span class={labelClass}>Date</span>
						<input
							class={inputClass}
							type="date"
							bind:value={day.date}
						/>
					</label>
					{#each day.entries as entry (entry.id)}
						<div
							class="flex items-start gap-2"
							animate:flip={{ duration: 200 }}
						>
							<input
								class="{inputClass} w-32! shrink-0"
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
								aria-label="Delete entry"
								onclick={() =>
									remove(
										day.entries,
										entry,
										'Delete this entry?',
										entry.activity
											? `"${entry.activity}" leaves the time log.`
											: 'It leaves the time log.'
									)}><span class="icon-[mdi--close] size-4"></span></button
							>
						</div>
					{/each}
					{#snippet actions()}
						<button
							type="button"
							class="{ghostButton} bg-primary/10 text-primary hover:bg-primary/15"
							onclick={() => {
								day.entries.push({ id: createId('entry'), time: '', activity: '' });
								look.saved();
							}}><span class="icon-[mdi--plus] size-4"></span>Add entry</button
						>
					{/snippet}
				</Group>
			</div>
		{:else}
			<p class="py-2 text-center text-sm text-slate-400">No days yet. Add the first one.</p>
		{/each}
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				class="{ghostButton} bg-slate-900 text-white hover:bg-slate-700"
				onclick={addDay}><span class="icon-[mdi--calendar-plus] size-4"></span>Add day</button
			>
			<button
				type="button"
				class="{ghostButton} bg-primary/10 text-primary hover:bg-primary/15"
				onclick={addSampleDay}
				><span class="icon-[mdi--auto-fix] size-4"></span>Add a sample day</button
			>
		</div>
	{:else}
		<div
			class="space-y-3"
			{@attach sortable(`groups-${panel.id}`, (from, to) => move(panel.groups, from, to))}
		>
			{#each panel.groups as group, groupIndex (group.id)}
				<div animate:flip={{ duration: 200 }}>
					<Group
						title={group.title || 'Untitled group'}
						meta="{group.photos.length} photos"
						icon="icon-[mdi--image-multiple-outline]"
						isOpen={openGroups.includes(group.id)}
						ontoggle={() => (openGroups = toggle(openGroups, group.id))}
						ondelete={() =>
							remove(
								panel.groups,
								group,
								`Delete ${group.title || 'this group'}?`,
								`Its ${group.photos.length} photos leave the report.`
							)}
						deleteLabel="Delete group"
						sortKey="groups-{panel.id}"
						index={groupIndex}
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
										<!-- The page in miniature: one column for one or two, two columns from four up. -->
										<span
											class="grid h-4 w-3 gap-px {layout <= 2 ? 'grid-cols-1' : 'grid-cols-2'}"
											style="grid-template-rows: repeat({layout <= 2 ? layout : layout / 2}, 1fr)"
											aria-hidden="true"
										>
											{#each Array.from({ length: layout }, (_, at) => at) as cell (cell)}
												<span class="rounded-[1px] bg-current"></span>
											{/each}
										</span>{layout}
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
									class="relative aspect-square transition"
									data-sort="photos-{group.id}"
									data-index={photoIndex}
									animate:flip={{ duration: 200 }}
								>
									<button
										type="button"
										class="relative block size-full overflow-hidden rounded-xl bg-slate-100 select-none [-webkit-touch-callout:none]"
										aria-label="Describe photo {photoIndex + 1}"
										data-grip="photos-{group.id}"
										onclick={() => (editing = photo)}
									>
										<img
											src={photo.src}
											alt={photo.description}
											class="pointer-events-none size-full object-cover"
											draggable="false"
										/>
										{#if photo.description}
											<span
												class="absolute bottom-1 left-1 icon-[mdi--text-box] size-5 text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]"
												title="Has a description"
											></span>
										{/if}
									</button>
									<div
										class="absolute top-1 right-1"
										data-no-drag
									>
										<Menu
											label="More for photo {photoIndex + 1}"
											value=""
											align={photoIndex % 3 === 0 ? 'left' : 'right'}
											options={[
												{
													id: 'describe',
													label: 'Edit description',
													icon: 'icon-[mdi--pencil-outline]'
												},
												{
													id: 'delete',
													label: 'Delete',
													icon: 'icon-[mdi--trash-can-outline]',
													isDanger: true
												}
											]}
											onpick={(id) =>
												id === 'describe'
													? (editing = photo)
													: remove(
															group.photos,
															photo,
															'Delete this photo?',
															'It leaves the group and the report.'
														)}
										>
											{#snippet trigger()}
												<span class="flex size-7 items-center justify-center text-white"
													><span
														class="icon-[mdi--dots-vertical] size-6 drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]"
													></span></span
												>
											{/snippet}
										</Menu>
									</div>
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
											group.photos.push({ id: createId('photo'), src, description: '' })
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
											group.photos.push({ id: createId('photo'), src, description: '' })
										)}
								/>
							</label>
						</div>
						{#snippet actions()}
							<button
								type="button"
								class="{ghostButton} bg-primary/10 text-primary hover:bg-primary/15"
								onclick={() => {
									group.photos.push({
										id: createId('photo'),
										src: photoOf(createId('demo')),
										description: ''
									});
									look.saved();
								}}><span class="icon-[mdi--auto-fix] size-4"></span>Add a sample photo</button
							>
						{/snippet}
					</Group>
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
				<p class="{labelClass} mt-3">Facility kind</p>
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

{#if editing}
	{@const photo = editing}
	<BottomSheet
		label="Describe this photo"
		onclose={() => (editing = undefined)}
	>
		<form
			onsubmit={(event) => {
				event.preventDefault();
				editing = undefined;
			}}
		>
			<div class="flex items-center gap-3">
				<img
					src={photo.src}
					alt=""
					class="size-16 shrink-0 rounded-xl object-cover"
				/>
				<div>
					<b class="block text-lg text-slate-900">Photo description</b>
					<p class="text-sm text-slate-500">Shows on this photo in the report.</p>
				</div>
			</div>
			<label class="mt-4 block">
				<span class={labelClass}>Description</span>
				<textarea
					class="{inputClass} min-h-20"
					bind:value={photo.description}
					oninput={() => look.saved()}
					placeholder="e.g. Lashing on the forward stack, seen from the quay"
					{@attach focusEnd}></textarea>
			</label>
			<button class="mt-5 w-full rounded-full bg-primary py-3 text-sm font-semibold text-white"
				>Done</button
			>
		</form>
	</BottomSheet>
{/if}
