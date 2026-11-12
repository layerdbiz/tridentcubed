<script lang="ts">
	// PROTOTYPE (#161) run 26: the Transport Mode panel as legs (Justin, 2026-11-11: "without having to repeat
	// ourselves"). The trip is one leg after another (legs.ts), each a card. A leg's transport is picked once.
	// Run 28, from Justin's notes on the artifact (2026-11-12). Every pick is the app's one dropdown (picker.svelte).
	// A leg starts with one facility, and each facility is a Start, a Stop or an End, because the job does not
	// always begin at the Start. Add Stop is at the card's bottom left and Delete at its bottom right, as in every
	// other card. No line is drawn down the facilities: the report's page will show the trip that way.
	// Run 29, his second round of notes. There is no Transport Type to pick: the Transport Mode (Vessel, Barge,
	// Plane) says it, and the type is read from the mode. A card is headed "Transport Mode 1" again, with one line
	// under it in three versions to choose from (`leg-heading`): A the cities, B the facilities with their cities, C
	// counts. Start, Stop or End sits on the facility's own line, never cut short, also in three versions
	// (`leg-facility`): A a dropdown before the facility, B a coloured pill after it, C picked inside the facility's
	// dropdown and shown as a tag before its name.
	import { untrack } from 'svelte';
	import Group from '../group.svelte';
	import {
		addLeg,
		addRow,
		legsOf,
		removeLeg,
		removeStop,
		setTransport,
		type LegType
	} from '../legs';
	import {
		FACILITY_ICONS,
		MODE_ICONS,
		MODES,
		POINTS,
		stopOf,
		TRANSPORT_TYPES,
		typeOfMode,
		type PanelType,
		type PointType,
		type StopType
	} from '../look.data';
	import type { LookState } from '../look.state.svelte';
	import Menu from '../menu.svelte';
	import Picker from '../picker.svelte';

	let { look, panel, onsave }: { look: LookState; panel: PanelType; onsave: () => void } = $props();

	const POINT_NAMES = Object.keys(POINTS) as PointType[];
	const REMOVE = '__remove';
	// The panels' own small buttons (panel-body.svelte): tinted inside a card, black under the cards.
	const BUTTON =
		'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition';

	const legs = $derived(legsOf(panel.stops));
	const heading = $derived(look.variant('leg-heading'));
	const row = $derived(look.variant('leg-facility'));
	// The legs standing open: the first, and any just added.
	let open = $state<string[]>(untrack(() => [legsOf(panel.stops)[0]?.id ?? '']));

	function toggle(id: string) {
		open = open.includes(id) ? open.filter((item) => item !== id) : [...open, id];
	}

	function headOf(leg: LegType) {
		return leg.stops[0];
	}

	function cityOf(facility: string) {
		return look.facilities.find((item) => item.name === facility)?.city ?? '';
	}

	// The places the leg calls at, first to last: its facilities, each with its city.
	function placesOf(leg: LegType) {
		return leg.stops
			.filter((stop) => stop.facility)
			.map((stop) => ({ facility: stop.facility, city: cityOf(stop.facility) }));
	}

	// A city twice in a row is said once.
	function citiesOf(leg: LegType) {
		const cities = placesOf(leg)
			.map((place) => place.city)
			.filter(Boolean);
		return cities.filter((city, index) => city !== cities[index - 1]);
	}

	function plural(count: number, one: string, many: string) {
		return `${count} ${count === 1 ? one : many}`;
	}

	// "1 Vessel · 2 Facilities · 2 Locations"
	function countsOf(leg: LegType) {
		const places = placesOf(leg);
		const cities = new Set(places.map((place) => place.city).filter(Boolean));
		return [
			headOf(leg)?.mode ? `1 ${headOf(leg).mode}` : '',
			places.length ? plural(places.length, 'Facility', 'Facilities') : '',
			cities.size ? plural(cities.size, 'Location', 'Locations') : ''
		].filter(Boolean);
	}

	// One pick: the mode, and with it the type it belongs to.
	function pickMode(leg: LegType, mode: string) {
		if (headOf(leg)?.mode === mode) return;
		setTransport(panel.stops, leg.id, { mode, type: typeOfMode(mode) ?? '', name: '' });
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
			.map((transport) => ({ id: transport.name, label: transport.name, image: transport.photo }));
	}

	function kindOf(leg: LegType) {
		const type = headOf(leg)?.type;
		return type ? TRANSPORT_TYPES[type].facility : undefined;
	}

	// The kind of facility the leg's mode uses (ports for a Vessel), and every place the trip already calls at.
	function facilitiesOf(leg: LegType) {
		const suited = kindOf(leg);
		const used = panel.stops.map((stop) => stop.facility);
		return look.facilities
			.filter((facility) => !suited || facility.kind === suited || used.includes(facility.name))
			.map((facility) => ({
				id: facility.name,
				label: facility.name,
				note: facility.city,
				image: facility.photo,
				icon: FACILITY_ICONS[facility.kind]
			}));
	}

	// Start, Stop or End; with more than one facility on the leg, also the way to take this one out.
	function pointsOf(leg: LegType) {
		const points = POINT_NAMES.map((point) => ({
			id: point,
			label: point,
			dot: POINTS[point].dot
		}));
		if (leg.stops.length < 2) return points;
		return [
			...points,
			{ id: REMOVE, label: 'Remove', icon: 'icon-[mdi--trash-can-outline]', isDanger: true }
		];
	}

	function pickPoint(stop: StopType, point: string) {
		if (point === REMOVE) removeStop(panel.stops, stop.id);
		else stop.point = point as PointType;
		onsave();
	}

	function pickFacility(stop: StopType, name: string) {
		stop.facility = name;
		onsave();
	}

	function addStop(leg: LegType) {
		addRow(panel.stops, leg.id, stopOf);
		onsave();
	}

	function add() {
		open = [...open, addLeg(panel.stops, stopOf)];
		onsave();
	}

	function drop(leg: LegType) {
		look.confirm({
			title: 'Delete Transport Mode?',
			note: 'Its facilities leave the trip and the report.',
			onyes: () => {
				removeLeg(panel.stops, leg.id);
				onsave();
			}
		});
	}

	// "Add new" opens the same sheet the + does, on that page, filled with what the leg already says.
	function addTransport(leg: LegType) {
		const { type, mode } = headOf(leg);
		look.addFor('transport', { type, mode }, (name) => pickName(leg, name));
	}

	function addFacility(leg: LegType, stop: StopType) {
		const kind = kindOf(leg);
		look.addFor('facilities', kind ? { kind } : {}, (name) => pickFacility(stop, name));
	}
</script>

<!-- The facility itself: the app's dropdown, with Add new and the pencils in its list. -->
{#snippet facility(leg: LegType, stop: StopType, hasLabel: boolean)}
	<Picker
		label="Facility"
		options={facilitiesOf(leg)}
		value={stop.facility}
		icon="icon-[mdi--domain]"
		{hasLabel}
		onpick={(name) => pickFacility(stop, name)}
		onadd={() => addFacility(leg, stop)}
		onedit={(name) => look.editRecord('facilities', name)}
	/>
{/snippet}

<div class="space-y-3">
	{#each legs as leg, index (leg.id)}
		{@const first = headOf(leg)}
		{@const places = placesOf(leg)}
		<Group
			title="Transport Mode {index + 1}"
			icon={MODE_ICONS[first.mode] ?? 'icon-[mdi--transit-connection-variant]'}
			isOpen={open.includes(leg.id)}
			ontoggle={() => toggle(leg.id)}
			ondelete={() => drop(leg)}
		>
			{#snippet head()}
				<span class="block truncate text-sm font-semibold text-slate-800"
					>Transport Mode {index + 1}</span
				>
				<span class="flex min-w-0 items-center gap-1 text-[11px] text-slate-400">
					{#if !places.length}
						<span class="truncate">No location yet</span>
					{:else if heading === 'A'}
						<span class="icon-[mdi--map-marker] size-3.5 shrink-0 text-primary"></span>
						{#each citiesOf(leg) as city, at (at)}
							{#if at}
								<span class="icon-[mdi--arrow-right-thick] size-3.5 shrink-0 text-primary"></span>
							{/if}
							<span class="min-w-0 truncate">{city}</span>
						{/each}
					{:else if heading === 'B'}
						<span class="icon-[mdi--map-marker] size-3.5 shrink-0 text-primary"></span>
						{#each places as place, at (at)}
							{#if at}
								<span class="icon-[mdi--arrow-right-thick] size-3.5 shrink-0 text-primary"></span>
							{/if}
							<span class="min-w-0 truncate"
								>{[place.facility, place.city].filter(Boolean).join(', ')}</span
							>
						{/each}
					{:else}
						<span class="truncate">{countsOf(leg).join(' · ')}</span>
					{/if}
				</span>
			{/snippet}
			<div class="grid gap-2 sm:grid-cols-2">
				<Picker
					label="Transport Mode"
					options={MODES.map((mode) => ({ id: mode, label: mode, icon: MODE_ICONS[mode] }))}
					value={first.mode}
					icon="icon-[mdi--cube-send]"
					onpick={(mode) => pickMode(leg, mode)}
				/>
				{#if first.mode}
					<Picker
						label={first.mode}
						options={transportsOf(leg)}
						value={first.name}
						icon={MODE_ICONS[first.mode]}
						onpick={(name) => pickName(leg, name)}
						onadd={() => addTransport(leg)}
						onedit={(name) => look.editRecord('transport', name)}
					/>
				{/if}
			</div>
			<div class="space-y-2">
				{#each leg.stops as stop, at (stop.id)}
					{#if row === 'A'}
						<!-- A: its own dropdown before the facility, wide enough that the word is never cut. -->
						<div class="flex items-end gap-2">
							<div class="w-[6.75rem] shrink-0">
								<Picker
									label="Point"
									options={pointsOf(leg)}
									value={stop.point}
									icon="icon-[mdi--map-marker-outline]"
									hasLabel={at === 0}
									isCompact
									isSearchable={false}
									onpick={(point) => pickPoint(stop, point)}
								/>
							</div>
							<div class="min-w-0 flex-1">{@render facility(leg, stop, at === 0)}</div>
						</div>
					{:else if row === 'B'}
						<!-- B: the facility has the line; its point is a pill in its colour at the right. -->
						<div class="flex items-end gap-2">
							<div class="min-w-0 flex-1">{@render facility(leg, stop, at === 0)}</div>
							<Menu
								label="Point"
								value={stop.point}
								options={pointsOf(leg)}
								onpick={(point) => pickPoint(stop, point)}
							>
								{#snippet trigger()}
									<span
										class="flex h-[44px] min-w-[4.5rem] items-center justify-center gap-0.5 rounded-full pr-2 pl-3.5 text-xs font-semibold whitespace-nowrap {stop.point
											? POINTS[stop.point].chip
											: 'bg-slate-900/[0.05] text-slate-500'}"
										>{stop.point || 'Point'}<span class="icon-[mdi--chevron-down] size-4"
										></span></span
									>
								{/snippet}
							</Menu>
						</div>
					{:else}
						<!-- C: one dropdown. Start, Stop or End is picked at the top of its list and shows as a tag. -->
						<Picker
							label="Facility"
							options={facilitiesOf(leg)}
							value={stop.facility}
							hasLabel={at === 0}
							onpick={(name) => pickFacility(stop, name)}
							onadd={() => addFacility(leg, stop)}
							onedit={(name) => look.editRecord('facilities', name)}
						>
							{#snippet lead()}
								<span
									class="ml-0.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap {stop.point
										? POINTS[stop.point].chip
										: 'bg-slate-900/[0.05] text-slate-500'}">{stop.point || 'Point'}</span
								>
							{/snippet}
							{#snippet top()}
								<div class="flex items-center gap-1">
									{#each POINT_NAMES as point (point)}
										<button
											type="button"
											class="flex-1 rounded-full py-1.5 text-xs font-semibold transition {stop.point ===
											point
												? POINTS[point].solid
												: 'bg-slate-900/[0.04] text-slate-600 hover:bg-slate-900/[0.07]'}"
											aria-pressed={stop.point === point}
											onclick={() => pickPoint(stop, point)}>{point}</button
										>
									{/each}
									{#if leg.stops.length > 1}
										<button
											type="button"
											class="flex size-8 shrink-0 items-center justify-center rounded-full text-danger transition hover:bg-danger/10"
											aria-label="Remove"
											title="Remove"
											onclick={() => pickPoint(stop, REMOVE)}
											><span class="icon-[mdi--trash-can-outline] size-[18px]"></span></button
										>
									{/if}
								</div>
							{/snippet}
						</Picker>
					{/if}
				{/each}
			</div>
			{#snippet actions()}
				<button
					type="button"
					class="{BUTTON} bg-primary/10 text-primary hover:bg-primary/15"
					onclick={() => addStop(leg)}><span class="icon-[mdi--plus] size-4"></span>Add Stop</button
				>
			{/snippet}
		</Group>
	{/each}
</div>

<button
	type="button"
	class="{BUTTON} bg-slate-900 text-white hover:bg-slate-700"
	onclick={add}><span class="icon-[mdi--plus] size-4"></span>Add Transport Mode</button
>
