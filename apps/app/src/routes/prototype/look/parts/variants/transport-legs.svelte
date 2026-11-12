<script lang="ts">
	// PROTOTYPE (#161) run 26: the Transport Mode panel as legs, variants B and C (Justin, 2026-11-11: "if you're a
	// vessel, you always have a start and you always have an end ... without having to repeat ourselves"). The trip
	// is one leg after another (legs.ts). For each leg you pick, in this order: the Transport Type (Sea, Air, Rail,
	// Road), then the mode that type has (Vessel or Barge), then which one, from a list of only those. That is
	// picked once. Under it are the leg's facilities in order: a Start, an End, and any Stops between; each facility
	// is one of the three by where it sits, never more. The facility list holds the kind that suits the type (ports
	// for Sea) and the places the trip already uses, so a truck can start where the vessel ended. Add Transport Mode
	// starts the next leg at the facility the last one ended at.
	// B draws each leg as a card of its own that opens and closes. C (`isLine`) draws the whole trip as one line
	// down the panel, in each transport type's colour, with the transport as a band at the head of its stretch.
	import { untrack } from 'svelte';
	import { slide } from 'svelte/transition';
	import Group from '../group.svelte';
	import {
		addLeg,
		addRow,
		legsOf,
		removeLeg,
		removeStop,
		rowsOf,
		setTransport,
		type LegType,
		type RowType
	} from '../legs';
	import {
		FACILITY_ICONS,
		MODE_ICONS,
		POINTS,
		stopOf,
		TRANSPORT_TYPES,
		type FacilityKindType,
		type PanelType,
		type TransportTypeType
	} from '../look.data';
	import type { LookState } from '../look.state.svelte';
	import Picker from '../picker.svelte';

	let {
		look,
		panel,
		isLine = false,
		onsave,
		onaddtransport,
		onaddfacility
	}: {
		look: LookState;
		panel: PanelType;
		isLine?: boolean;
		onsave: () => void;
		// "Add new": the panel asks for the name, adds it to its page, and hands the name back.
		onaddtransport: (type: TransportTypeType, mode: string, done: (name: string) => void) => void;
		onaddfacility: (kinds: FacilityKindType[], done: (name: string) => void) => void;
	} = $props();

	const TYPES = Object.keys(TRANSPORT_TYPES) as TransportTypeType[];
	const KINDS = Object.keys(FACILITY_ICONS) as FacilityKindType[];
	const LABEL = 'mb-1 flex items-center gap-1 text-xs font-medium text-slate-500';
	// Each transport type's colour, the ones its stat card and map marker use.
	const LINES: Record<TransportTypeType, string> = {
		Sea: 'bg-blue-900',
		Air: 'bg-sky-400',
		Rail: 'bg-red-900',
		Road: 'bg-zinc-500'
	};

	const legs = $derived(legsOf(panel.stops));
	// The legs standing open: the first, and any just added.
	let open = $state<string[]>(untrack(() => [legsOf(panel.stops)[0]?.id ?? '']));

	function toggle(id: string) {
		open = open.includes(id) ? open.filter((item) => item !== id) : [...open, id];
	}

	function headOf(leg: LegType) {
		return leg.stops[0];
	}

	function titleOf(leg: LegType, index: number) {
		return headOf(leg)?.name || `Transport Mode ${index + 1}`;
	}

	function routeOf(leg: LegType) {
		const places = leg.stops.map((stop) => stop.facility).filter(Boolean);
		return places.length > 1 ? `${places[0]} → ${places.at(-1)}` : (places[0] ?? '');
	}

	function iconOf(leg: LegType) {
		const head = headOf(leg);
		return (
			MODE_ICONS[head?.mode ?? ''] ??
			(head?.type ? TRANSPORT_TYPES[head.type].icon : 'icon-[mdi--transit-connection-variant]')
		);
	}

	function pickType(leg: LegType, type: TransportTypeType) {
		if (headOf(leg)?.type === type) return;
		const { modes } = TRANSPORT_TYPES[type];
		setTransport(panel.stops, leg.id, { type, mode: modes.length === 1 ? modes[0] : '', name: '' });
		onsave();
	}

	function pickMode(leg: LegType, mode: string) {
		if (headOf(leg)?.mode === mode) return;
		setTransport(panel.stops, leg.id, { mode, name: '' });
		onsave();
	}

	function pickName(leg: LegType, name: string) {
		setTransport(panel.stops, leg.id, { name });
		onsave();
	}

	// Only the ones of the mode picked: every Vessel, never the trucks.
	function transportsOf(leg: LegType) {
		const mode = headOf(leg)?.mode;
		return look.transports
			.filter((transport) => transport.mode === mode)
			.map((transport) => ({
				id: transport.name,
				label: transport.name,
				note: `${transport.type} · ${transport.mode}`,
				image: transport.photo,
				icon: MODE_ICONS[transport.mode]
			}));
	}

	// The kind of facility the leg's type uses, and every place the trip already calls at.
	function facilitiesOf(leg: LegType) {
		const type = headOf(leg)?.type;
		const suited = type ? TRANSPORT_TYPES[type].facility : undefined;
		const used = panel.stops.map((stop) => stop.facility);
		return look.facilities
			.filter((facility) => !suited || facility.kind === suited || used.includes(facility.name))
			.map((facility) => ({
				id: facility.name,
				label: facility.name,
				note: [facility.kind, facility.city].filter(Boolean).join(' · '),
				image: facility.photo,
				icon: FACILITY_ICONS[facility.kind]
			}));
	}

	function kindsOf(leg: LegType) {
		const type = headOf(leg)?.type;
		const suited = type ? TRANSPORT_TYPES[type].facility : undefined;
		return suited ? [suited, ...KINDS.filter((kind) => kind !== suited)] : KINDS;
	}

	function pickFacility(leg: LegType, row: RowType, name: string) {
		if (row.stop) row.stop.facility = name;
		else addRow(panel.stops, leg.id, row.point, name, stopOf);
		onsave();
	}

	function addStop(leg: LegType) {
		// A leg with one end still missing gets it first, so the new stop sits between two ends.
		for (const row of rowsOf(leg))
			if (!row.stop) addRow(panel.stops, leg.id, row.point, '', stopOf);
		addRow(panel.stops, leg.id, 'Stop', '', stopOf);
		onsave();
	}

	function dropStop(id: string) {
		removeStop(panel.stops, id);
		onsave();
	}

	function add() {
		open = [...open, addLeg(panel.stops, stopOf)];
		onsave();
	}

	function drop(leg: LegType, index: number) {
		look.confirm({
			title: `Delete ${titleOf(leg, index)}?`,
			note: 'Its facilities leave the trip and the report.',
			onyes: () => {
				removeLeg(panel.stops, leg.id);
				onsave();
			}
		});
	}

	function cityOf(facility: string) {
		return look.facilities.find((item) => item.name === facility)?.city ?? '';
	}
</script>

<!-- The transport, picked once for the leg: its type, then that type's mode, then which one. -->
{#snippet transport(leg: LegType)}
	{@const head = headOf(leg)}
	<div>
		<p class={LABEL}>
			Transport Type
			{#if !head?.type}<span
					class="size-1.5 rounded-full bg-warning"
					title="Not picked yet"
				></span>{/if}
		</p>
		<div
			class="grid grid-cols-4 gap-1.5"
			role="radiogroup"
			aria-label="Transport Type"
		>
			{#each TYPES as type (type)}
				{@const isOn = head?.type === type}
				<button
					type="button"
					role="radio"
					aria-checked={isOn}
					class="flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-semibold transition {isOn
						? 'bg-primary text-white'
						: 'bg-slate-900/[0.04] text-slate-600 hover:bg-slate-900/[0.07]'}"
					onclick={() => pickType(leg, type)}
					><span class="{TRANSPORT_TYPES[type].icon} size-5"></span>{type}</button
				>
			{/each}
		</div>
	</div>
	{#if head?.type && TRANSPORT_TYPES[head.type].modes.length > 1}
		<div transition:slide={{ duration: 160 }}>
			<p class={LABEL}>
				{head.type} by
				{#if !head.mode}<span
						class="size-1.5 rounded-full bg-warning"
						title="Not picked yet"
					></span>{/if}
			</p>
			<div
				class="flex flex-wrap gap-1.5"
				role="radiogroup"
				aria-label="Mode"
			>
				{#each TRANSPORT_TYPES[head.type].modes as mode (mode)}
					{@const isOn = head.mode === mode}
					<button
						type="button"
						role="radio"
						aria-checked={isOn}
						class="flex items-center gap-1.5 rounded-full py-1.5 pr-3.5 pl-2.5 text-sm font-medium transition {isOn
							? 'bg-primary text-white'
							: 'bg-slate-900/[0.04] text-slate-600 hover:bg-slate-900/[0.07]'}"
						onclick={() => pickMode(leg, mode)}
						><span class="{MODE_ICONS[mode]} size-[18px]"></span>{mode}</button
					>
				{/each}
			</div>
		</div>
	{/if}
	{#if head?.type && head.mode}
		<div transition:slide={{ duration: 160 }}>
			<Picker
				label={head.mode}
				options={transportsOf(leg)}
				value={head.name}
				icon={MODE_ICONS[head.mode]}
				placeholder="Choose the {head.mode}…"
				onpick={(name) => pickName(leg, name)}
				onadd={() =>
					onaddtransport(head.type as TransportTypeType, head.mode, (name) => pickName(leg, name))}
			/>
		</div>
	{/if}
{/snippet}

<!-- The leg's facilities down a line: Start, any Stops, End. `line` is the colour of the line between them. -->
{#snippet facilities(leg: LegType, line: string)}
	{@const rows = rowsOf(leg)}
	<div>
		{#each rows as row, index (row.stop?.id ?? row.point)}
			<div class="flex gap-2.5">
				<span class="flex w-3 shrink-0 flex-col items-center">
					<span class="mt-9 size-3 shrink-0 rounded-full ring-2 ring-white {POINTS[row.point].dot}"
					></span>
					{#if index < rows.length - 1}<span class="-mb-9 w-0.5 flex-1 {line}"></span>{/if}
				</span>
				<div class="relative min-w-0 flex-1 pb-2.5">
					<Picker
						label={row.point}
						addLabel="Facility"
						options={facilitiesOf(leg)}
						value={row.stop?.facility ?? ''}
						icon="icon-[mdi--domain]"
						placeholder="Choose the {row.point.toLowerCase()} facility…"
						onpick={(name) => pickFacility(leg, row, name)}
						onadd={() => onaddfacility(kindsOf(leg), (name) => pickFacility(leg, row, name))}
					/>
					{#if row.point === 'Stop' && row.stop}
						{@const id = row.stop.id}
						<button
							type="button"
							class="absolute top-0 right-0 text-xs font-medium text-danger hover:underline"
							onclick={() => dropStop(id)}>Remove</button
						>
					{/if}
					{#if row.stop?.facility}
						<p class="mt-1 flex items-center gap-1 text-xs text-slate-500">
							<span class="icon-[mdi--map-marker] size-3.5 shrink-0 {POINTS[row.point].text}"
							></span>
							{cityOf(row.stop.facility) || 'This facility has no city yet'}
						</p>
					{/if}
				</div>
			</div>
			{#if index === rows.length - 2}
				<div class="flex gap-2.5">
					<span class="flex w-3 shrink-0 justify-center"
						><span class="-mb-9 w-0.5 {line}"></span></span
					>
					<button
						type="button"
						class="mb-2.5 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
						onclick={() => addStop(leg)}
						><span class="icon-[mdi--plus] size-4"></span>Add a Stop on the way</button
					>
				</div>
			{/if}
		{/each}
	</div>
{/snippet}

<p class="flex items-center gap-1.5 text-xs text-slate-400">
	<span class="icon-[mdi--map-marker-path] size-4 shrink-0"></span>
	<span class="truncate"
		>{legs.length}
		{legs.length === 1 ? 'Transport Mode' : 'Transport Modes'}, {panel.stops.length}
		{panel.stops.length === 1 ? 'facility' : 'facilities'}, first to last</span
	>
</p>

{#if isLine}
	<!-- C: the trip as one line. Each transport is a band at the head of its stretch; a tap opens its three picks. -->
	<div class="rounded-2xl bg-slate-900/[0.03] p-3">
		{#each legs as leg, index (leg.id)}
			{@const head = headOf(leg)}
			{@const line = head?.type ? LINES[head.type] : 'bg-slate-300'}
			{@const isOpen = open.includes(leg.id) || !head?.name}
			{#if index}
				{@const from = legs[index - 1].stops.at(-1)?.facility}
				<p class="flex items-center gap-2.5 py-1.5 pl-5 text-[11px] font-medium text-slate-400">
					<span class="flex w-3 shrink-0 justify-center"
						><span class="icon-[mdi--dots-vertical] size-4"></span></span
					>
					{from && from === head?.facility ? `Handed over at ${from}` : 'Then'}
				</p>
			{/if}
			<button
				type="button"
				class="flex w-full items-center gap-2.5 rounded-2xl bg-white py-2 pr-3 pl-2 text-left shadow-[0_1px_2px_rgb(15_23_42/0.06)]"
				aria-expanded={isOpen}
				onclick={() => toggle(leg.id)}
			>
				<span
					class="flex size-9 shrink-0 items-center justify-center rounded-full text-white {line}"
					><span class="{iconOf(leg)} size-5"></span></span
				>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-semibold text-slate-800"
						>{titleOf(leg, index)}</span
					>
					<span class="block truncate text-[11px] text-slate-400"
						>{[head?.type, head?.mode].filter(Boolean).join(' · ') ||
							'Pick how this part of the trip travels'}</span
					>
				</span>
				<span
					class="icon-[mdi--chevron-down] size-5 shrink-0 text-slate-400 transition {isOpen
						? 'rotate-180'
						: ''}"
				></span>
			</button>
			{#if isOpen}
				<div
					class="space-y-3 px-1 pt-3"
					transition:slide={{ duration: 180 }}
				>
					{@render transport(leg)}
					{#if legs.length > 1}
						<button
							type="button"
							class="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-danger transition hover:bg-danger/10"
							onclick={() => drop(leg, index)}
							><span class="icon-[mdi--trash-can-outline] size-4"></span>Delete Transport Mode</button
						>
					{/if}
				</div>
			{/if}
			<div class="pt-2 pl-5">{@render facilities(leg, line)}</div>
		{/each}
	</div>
{:else}
	<!-- B: one card for each leg. -->
	<div class="space-y-3">
		{#each legs as leg, index (leg.id)}
			{@const head = headOf(leg)}
			<Group
				title={titleOf(leg, index)}
				note={[head?.type, head?.mode, routeOf(leg)].filter(Boolean).join(' · ') ||
					'Pick how this part of the trip travels'}
				icon={iconOf(leg)}
				isOpen={open.includes(leg.id)}
				ontoggle={() => toggle(leg.id)}
				ondelete={legs.length > 1 ? () => drop(leg, index) : undefined}
				deleteLabel="Delete Transport Mode"
			>
				{@render transport(leg)}
				{#if head?.type}
					<div>
						<p class="{LABEL} mb-0">Facilities, in order</p>
						{@render facilities(leg, 'bg-slate-300')}
					</div>
				{/if}
			</Group>
		{/each}
	</div>
{/if}

<button
	type="button"
	class="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
	onclick={add}><span class="icon-[mdi--plus] size-5"></span>Add Transport Mode</button
>
{#if !legs.length}
	<p class="text-center text-xs text-slate-400">
		A vessel, a truck, a plane: each has a Start and an End, and can have Stops between.
	</p>
{/if}
