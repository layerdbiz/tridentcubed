<script lang="ts">
	// PROTOTYPE (#161) run 26: the Transport Mode panel as legs (Justin, 2026-11-11: "without having to repeat
	// ourselves"). The trip is one leg after another (legs.ts), each a card. A leg's transport is picked once: the
	// Transport Type (Sea, Air, Rail, Road), then the Transport Mode that type has (Vessel or Barge), then which one,
	// from a list of only those.
	// Run 28, from Justin's notes on the artifact (2026-11-12). Every pick is the app's one dropdown (picker.svelte),
	// not rows of buttons, to save room. A card's heading is only where the leg goes, city to city, as a project's
	// row shows it. A leg starts with one facility; each facility row is two dropdowns side by side, which point of
	// the leg it is (Start, Stop or End) and the facility, because the job does not always begin at the Start. The
	// facility list holds the kind that suits the type (ports for Sea) and the places the trip already uses. Add
	// Stop is at the card's bottom left and Delete at its bottom right, as in every other card; a facility row is
	// taken out from its own point dropdown. No line is drawn down the facilities: the report's page will show the
	// trip that way.
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
		POINTS,
		stopOf,
		TRANSPORT_TYPES,
		type PanelType,
		type PointType,
		type StopType,
		type TransportTypeType
	} from '../look.data';
	import type { LookState } from '../look.state.svelte';
	import Picker from '../picker.svelte';

	let { look, panel, onsave }: { look: LookState; panel: PanelType; onsave: () => void } = $props();

	const TYPES = Object.keys(TRANSPORT_TYPES) as TransportTypeType[];
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

	function iconOf(leg: LegType) {
		const head = headOf(leg);
		return (
			MODE_ICONS[head?.mode ?? ''] ??
			(head?.type ? TRANSPORT_TYPES[head.type].icon : 'icon-[mdi--transit-connection-variant]')
		);
	}

	// The cities the leg calls at, first to last, a city twice in a row said once.
	function citiesOf(leg: LegType) {
		const cities = leg.stops
			.map((stop) => look.facilities.find((item) => item.name === stop.facility)?.city ?? '')
			.filter(Boolean);
		return cities.filter((city, index) => city !== cities[index - 1]);
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
			.map((transport) => ({ id: transport.name, label: transport.name, image: transport.photo }));
	}

	function kindOf(leg: LegType) {
		const type = headOf(leg)?.type;
		return type ? TRANSPORT_TYPES[type].facility : undefined;
	}

	// The kind of facility the leg's type uses, and every place the trip already calls at.
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
		const points = (Object.keys(POINTS) as PointType[]).map((point) => ({
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
		const head = headOf(leg);
		look.addFor('transport', { type: head.type, mode: head.mode }, (name) => pickName(leg, name));
	}

	function addFacility(leg: LegType, stop: StopType) {
		const kind = kindOf(leg);
		look.addFor('facilities', kind ? { kind } : {}, (name) => pickFacility(stop, name));
	}
</script>

<div class="space-y-3">
	{#each legs as leg, index (leg.id)}
		{@const lead = headOf(leg)}
		{@const cities = citiesOf(leg)}
		<Group
			title="Transport Mode {index + 1}"
			icon={iconOf(leg)}
			isOpen={open.includes(leg.id)}
			ontoggle={() => toggle(leg.id)}
			ondelete={() => drop(leg)}
		>
			{#snippet head()}
				<span class="flex min-w-0 items-center gap-1 text-sm font-semibold text-slate-800">
					{#if cities.length}
						<span class="icon-[mdi--map-marker] size-4 shrink-0 text-primary"></span>
						{#each cities as city, at (at)}
							{#if at}
								<span class="icon-[mdi--arrow-right-thick] size-4 shrink-0 text-primary"></span>
							{/if}
							<span class="min-w-0 truncate">{city}</span>
						{/each}
					{:else}
						<span class="truncate font-medium text-slate-400">No location yet</span>
					{/if}
				</span>
			{/snippet}
			<div class="grid grid-cols-2 gap-2">
				<Picker
					label="Transport Type"
					options={TYPES.map((type) => ({
						id: type,
						label: type,
						icon: TRANSPORT_TYPES[type].icon
					}))}
					value={lead.type}
					icon="icon-[mdi--transit-connection-variant]"
					onpick={(type) => pickType(leg, type as TransportTypeType)}
				/>
				<Picker
					label="Transport Mode"
					options={(lead.type ? TRANSPORT_TYPES[lead.type].modes : []).map((mode) => ({
						id: mode,
						label: mode,
						icon: MODE_ICONS[mode]
					}))}
					value={lead.mode}
					icon="icon-[mdi--cube-send]"
					isDisabled={!lead.type}
					onpick={(mode) => pickMode(leg, mode)}
				/>
			</div>
			{#if lead.type && lead.mode}
				<Picker
					label={lead.mode}
					options={transportsOf(leg)}
					value={lead.name}
					icon={MODE_ICONS[lead.mode]}
					onpick={(name) => pickName(leg, name)}
					onadd={() => addTransport(leg)}
					onedit={(name) => look.editRecord('transport', name)}
				/>
			{/if}
			<div class="space-y-2">
				{#each leg.stops as stop, at (stop.id)}
					<div class="flex items-end gap-2">
						<div class="w-[6.25rem] shrink-0">
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
