<script lang="ts">
	// PROTOTYPE (#161) run 26: the Transport Mode panel as legs (Justin, 2026-11-11: "without having to repeat
	// ourselves"). The trip is one leg after another (legs.ts), each a card. A leg's transport is picked once.
	// Run 28, from Justin's notes on the artifact (2026-11-12). Every pick is the app's one dropdown (picker.svelte).
	// A leg starts with one facility, and each facility is a Start, a Stop or an End, because the job does not
	// always begin at the Start. Add Stop is at the card's bottom left and Delete at its bottom right, as in every
	// other card. No line is drawn down the facilities: the report's page will show the trip that way.
	// Run 29: there is no Transport Type to pick; the Transport Mode (Vessel, Barge, Plane) says it.
	// Run 30, what he settled on after trying the versions. A card is named for its transport once one is picked
	// ("MV Coral Dawn", with its own photo in place of the icon when it has one) and is "Transport Mode 1" until
	// then; the line under the name counts what the leg holds (1 Vessel · 2 Facilities · 2 Locations). On a
	// facility's line the point comes first, as a pill in its colour (Start blue, Stop amber, End green), then the
	// facility. The facilities drag into another order (hold, then drag), and the points follow the order: the first
	// is the Start, the last the End, any between are Stops.
	import { untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import Group from '../group.svelte';
	import {
		addLeg,
		addRow,
		legsOf,
		moveRow,
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
	import { sortable } from '../sortable';

	let { look, panel, onsave }: { look: LookState; panel: PanelType; onsave: () => void } = $props();

	const POINT_NAMES = Object.keys(POINTS) as PointType[];
	const REMOVE = '__remove';
	// The panels' own small buttons (panel-body.svelte): tinted inside a card, black under the cards.
	const BUTTON =
		'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition';

	const legs = $derived(legsOf(panel.stops));
	// The legs standing open: the first, and any just added.
	let open = $state<string[]>(untrack(() => [legsOf(panel.stops)[0]?.id ?? '']));

	function toggle(id: string) {
		open = open.includes(id) ? open.filter((item) => item !== id) : [...open, id];
	}

	function headOf(leg: LegType) {
		return leg.stops[0];
	}

	// The transport's own picture, uploaded on its page; none, and the card keeps its mode's icon.
	function photoOf(leg: LegType) {
		const name = headOf(leg)?.name;
		return name ? look.transports.find((item) => item.name === name)?.photo : undefined;
	}

	function plural(count: number, one: string, many: string) {
		return `${count} ${count === 1 ? one : many}`;
	}

	// "1 Vessel · 2 Facilities · 2 Locations"
	function countsOf(leg: LegType) {
		const places = leg.stops.map((stop) => stop.facility).filter(Boolean);
		const cities = new Set(
			places
				.map((place) => look.facilities.find((item) => item.name === place)?.city ?? '')
				.filter(Boolean)
		);
		return [
			headOf(leg)?.mode ? `1 ${headOf(leg).mode}` : '',
			places.length ? plural(places.length, 'Facility', 'Facilities') : '',
			cities.size ? plural(cities.size, 'Location', 'Locations') : ''
		]
			.filter(Boolean)
			.join(' · ');
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

	function move(leg: LegType, from: number, to: number) {
		moveRow(panel.stops, leg.id, from, to);
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

<div class="space-y-3">
	{#each legs as leg, index (leg.id)}
		{@const first = headOf(leg)}
		<Group
			title={first.name || `Transport Mode ${index + 1}`}
			note={countsOf(leg) || 'Nothing picked yet'}
			icon={MODE_ICONS[first.mode] ?? 'icon-[mdi--transit-connection-variant]'}
			image={photoOf(leg)}
			isOpen={open.includes(leg.id)}
			ontoggle={() => toggle(leg.id)}
			ondelete={() => drop(leg)}
		>
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
			<!-- The point first, as a pill in its colour, then the facility. Hold a row, then drag, to reorder. -->
			<div
				class="space-y-2"
				{@attach sortable(`stops-${leg.id}`, (from, to) => move(leg, from, to))}
			>
				{#each leg.stops as stop, at (stop.id)}
					<div
						class="flex items-end gap-2 select-none [-webkit-touch-callout:none]"
						data-sort="stops-{leg.id}"
						data-index={at}
						data-grip={leg.stops.length > 1 ? `stops-${leg.id}` : undefined}
						title={leg.stops.length > 1 ? 'Hold and drag to reorder' : undefined}
						animate:flip={{ duration: 200 }}
					>
						<Menu
							label="Point"
							value={stop.point}
							options={pointsOf(leg)}
							align="left"
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
						<div class="min-w-0 flex-1">
							<Picker
								label="Facility"
								options={facilitiesOf(leg)}
								value={stop.facility}
								icon="icon-[mdi--domain]"
								hasLabel={at === 0}
								onpick={(name) => pickFacility(stop, name)}
								onadd={() => addFacility(leg, stop)}
								onedit={(name) => look.editRecord('facilities', name)}
							/>
						</div>
					</div>
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
