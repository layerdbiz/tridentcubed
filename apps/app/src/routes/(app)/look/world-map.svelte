<script lang="ts">
	// PROTOTYPE (#161) run 13: a real map (Justin, 2026-11-07: "use a real map … free … customized with a UI that
	// matches the app … zoom in and zoom out"). MapLibre GL draws OpenStreetMap data from OpenFreeMap, which is free and
	// needs no account or key; its light "positron" style is recoloured to the app's greys. Pins are one per city,
	// in the app's blue with how many are there, and pins that crowd together merge into one with their total until
	// you zoom in. City names hide rather than overlap. `route` draws a trip's line through its stops. The map fits its
	// pins inside `padding`, the part of it that is not under the cards or the sheet, and fits again when that part
	// changes size, until someone moves or zooms it themselves. The credit OpenStreetMap is owed sits at the bottom right
	// of the part that shows. Run 18 (Justin, 2026-11-10): a place with one thing in it shows that thing itself, as a
	// round marker with its logo, face or icon on its own colour, and a tap opens it. Places with several, and
	// places that crowd together when zoomed out, keep the round number, in the colour its things share (the app's
	// blue when they differ), until you zoom in far enough for them to come apart.
	// 2026-11-16 (Justin): spread (`isSpread`), no number stands in for anything: every logo, face and icon always
	// shows. Things that share a place are scattered round it, close together and in no pattern (map.utils.ts);
	// zoomed in by hand they move apart. The map always fits every place: only a person zooms past that. How
	// close it stands follows `closeness`: where the sheet under it rests (RESTS). Its markers keep one size (`size`).
	import { partsOf } from './location';
	import type {
		ExpressionSpecification,
		GeoJSONSource,
		LngLatLike,
		Map as MapType,
		Marker as MarkerType
	} from 'maplibre-gl';
	import { Avatar } from '@layerd/ui';
	import { mount, onMount, unmount, untrack } from 'svelte';
	import type { PinItemType, PinType } from './chart.data';
	import { PAGE_ICONS } from './look.data';
	import {
		extentOf,
		gapOf,
		reachOf,
		RESTS,
		scatterOf,
		type ClosenessType,
		type SeatType
	} from './map.utils';

	type PaddingType = { top: number; bottom: number; left: number; right: number };

	let {
		pins,
		route = [],
		padding = { top: 24, bottom: 24, left: 24, right: 24 },
		maxZoom = 9,
		isSpread = false,
		isDark = false,
		closeness = 1,
		size = 1,
		refit = 0,
		onpick
	}: {
		pins: PinType[];
		// A tap on a marker that is one thing.
		onpick?: (item: PinItemType) => void;
		route?: [number, number][];
		padding?: PaddingType;
		maxZoom?: number;
		// Map B (run 22): every thing is its own marker. Several in one city are scattered round it, and move apart
		// as the map is zoomed in. No numbers.
		isSpread?: boolean;
		// Where the sheet under the map rests (map.utils.ts RESTS); the middle, where there is no sheet.
		closeness?: ClosenessType;
		// How big its markers are, as a share of their full size (map.utils.ts PIN_SIZES).
		size?: number;
		// Any change to this fits the map to its markers again, even after someone moved it themselves: the
		// dashboard counts each time its sheet is let go.
		refit?: number;
		// Page Map B (run 25): OpenFreeMap's dark style, pulled toward the app's slate. Set once, as the map is made.
		isDark?: boolean;
	} = $props();

	const STYLE = 'https://tiles.openfreemap.org/styles/positron';
	const DARK = 'https://tiles.openfreemap.org/styles/dark';
	const GREYS: [string, 'background-color' | 'fill-color' | 'line-color', string][] = [
		['background', 'background-color', '#f1f5f9'],
		['water', 'fill-color', '#d6e0ea'],
		['waterway', 'line-color', '#d6e0ea'],
		['park', 'fill-color', '#e8eef3'],
		['landcover_wood', 'fill-color', '#e6ecf1'],
		['landuse_residential', 'fill-color', '#edf1f5'],
		['building', 'fill-color', '#e7ecf1'],
		['boundary_2', 'line-color', '#c3cdd8'],
		['boundary_3', 'line-color', '#cfd8e1']
	];

	let node: HTMLDivElement | undefined = $state();
	let map = $state<MapType>();
	let isReady = $state(false);
	let isFree = false;
	let workerUrl: string | undefined;
	let blue = '#3b82f6';
	// The marker class, kept from the library once it has loaded.
	let Marker: typeof MarkerType | undefined;
	// The markers on the map now, and the single things they stand for, by key.
	const markers = new Map<string, MarkerType>();
	// Each marker's avatar, by the marker's element, let go of when the marker goes.
	const avatars = new WeakMap<HTMLElement, ReturnType<typeof mount>>();
	let singles = new Map<string, PinItemType>();
	// Spread: each marker with its place, its seat in the scatter round it, and how many share the place.
	type SpotType = { marker: MarkerType; centre: [number, number]; seat: SeatType; count: number };
	let spots: SpotType[] = [];
	// A gap of the scatter on the ground, in degrees: about a kilometre, so the gap in pixels (gapOf) is the bigger
	// one until the map is zoomed in past where it fits a city, and from there the things move apart.
	const GROUND = 0.012;
	// The rest the map is showing; it follows `closeness` once the sheet has settled.
	let shown = $state<ClosenessType>(untrack(() => closeness));
	const rest = $derived(RESTS[shown]);
	// The colours the pins use, as the map needs them, in the order `tone` numbers them.
	let palette: string[] = [];

	// The theme's blue as rgb, which the map's paint needs.
	function rgbOf(color: string) {
		const context = document.createElement('canvas').getContext('2d');
		if (!context) return '#3b82f6';
		context.fillStyle = color;
		context.fillRect(0, 0, 1, 1);
		const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
		return `rgb(${r},${g},${b})`;
	}

	// The dark map: slate for land and water, place names kept quiet, road and water names off.
	function restyleDark(target: MapType) {
		if (target.getLayer('background'))
			target.setPaintProperty('background', 'background-color', '#0f172a');
		if (target.getLayer('water')) target.setPaintProperty('water', 'fill-color', '#1b2740');
		for (const layer of target.getStyle().layers ?? []) {
			if (layer.type !== 'symbol') continue;
			if (/highway|road|shield|airport|water|poi/.test(layer.id))
				target.setLayoutProperty(layer.id, 'visibility', 'none');
			else {
				target.setPaintProperty(layer.id, 'text-color', '#8291a8');
				target.setPaintProperty(layer.id, 'text-halo-color', '#0f172a');
			}
		}
	}

	function restyle(target: MapType) {
		if (isDark) return restyleDark(target);
		for (const [layer, property, value] of GREYS)
			if (target.getLayer(layer)) target.setPaintProperty(layer, property, value);
		for (const layer of target.getStyle().layers ?? []) {
			if (layer.type !== 'symbol') continue;
			// Place names stay quiet, so the pins and the numbers over the map read first.
			if (layer.id.startsWith('label_')) {
				target.setPaintProperty(layer.id, 'text-color', '#a3afbf');
				target.setPaintProperty(layer.id, 'text-halo-color', '#f1f5f9');
			}
			if (
				/highway-name|road_shield|highway-shield|airport|water_name|waterway_line_label|label_other/.test(
					layer.id
				)
			)
				target.setLayoutProperty(layer.id, 'visibility', 'none');
		}
	}

	// A background class as the colour the map paints with.
	function colorOf(tone: string) {
		if (!node) return blue;
		const probe = document.createElement('span');
		probe.className = tone;
		node.append(probe);
		const color = rgbOf(getComputedStyle(probe).backgroundColor);
		probe.remove();
		return color;
	}

	// The pins as the map's data. A pin whose things share one colour carries its number in `tone`; mixed is -1.
	function featuresOf(items: PinType[]) {
		const tones = [
			...new Set(items.flatMap((pin) => pin.items.map((item) => item.tone ?? '')))
		].filter(Boolean);
		palette = tones.map(colorOf);
		singles = new Map();
		if (isSpread) {
			// One point a place, for its name alone, set clear of the ring of markers round it (in ems of the name).
			return {
				type: 'FeatureCollection' as const,
				features: items.map((pin) => ({
					type: 'Feature' as const,
					properties: {
						key: pin.city,
						city: partsOf(pin.city).city || pin.city.split(',')[0],
						count: 1,
						tone: -1,
						reach: (reachOf(pin.items.length) + 26) / 12
					},
					geometry: { type: 'Point' as const, coordinates: [pin.lng, pin.lat] }
				}))
			};
		}
		return {
			type: 'FeatureCollection' as const,
			features: items.map((pin) => {
				const shared = new Set(pin.items.map((item) => item.tone ?? ''));
				const key = `${pin.city}|${pin.items[0]?.page ?? ''}|${pin.items[0]?.id ?? pin.names[0]}`;
				if (pin.count === 1 && pin.items[0]) singles.set(key, pin.items[0]);
				return {
					type: 'Feature' as const,
					properties: {
						key,
						city: partsOf(pin.city).city || pin.city.split(',')[0],
						count: pin.count,
						tone: shared.size === 1 ? tones.indexOf([...shared][0]) : -1
					},
					geometry: { type: 'Point' as const, coordinates: [pin.lng, pin.lat] }
				};
			})
		};
	}

	// The number circles take the colour their things share, else the app's blue.
	function paintOf(): ExpressionSpecification | string {
		if (!palette.length) return blue;
		const low: ExpressionSpecification = ['coalesce', ['get', 'low'], ['get', 'tone']];
		const high: ExpressionSpecification = ['coalesce', ['get', 'high'], ['get', 'tone']];
		return [
			'case',
			['all', ['==', low, high], ['>=', low, 0]],
			['match', low, ...palette.flatMap((color, index) => [index, color]), blue],
			blue
		] as unknown as ExpressionSpecification;
	}

	// One thing on the map: the library's avatar, like every other round picture in the app (#379; Justin,
	// 2026-11-26): its logo, face or letters, or its icon on its own colour, in a white ring.
	function elementOf(item: PinItemType) {
		const button = document.createElement('button');
		button.type = 'button';
		button.title = item.name;
		button.setAttribute('aria-label', item.name);
		button.className =
			'flex [scale:var(--pin,1)] cursor-pointer rounded-full shadow-[0_2px_8px_rgb(15_23_42/0.35)] transition-[scale] duration-500 ease-out';
		button.addEventListener('click', (event) => {
			event.stopPropagation();
			onpick?.(item);
		});
		// The map moves the box; the button inside grows and shrinks with where the sheet rests (--pin).
		const box = document.createElement('div');
		box.append(button);
		avatars.set(
			box,
			mount(Avatar, {
				target: button,
				props: {
					src: item.image ?? '',
					alt: '',
					size: 40,
					fit: item.page === 'team' ? 'cover' : 'contain',
					fallback: item.icon ?? PAGE_ICONS.projects,
					tint: `${item.tone ?? 'bg-primary'} text-white`,
					ring: 'ring-[2.5px] ring-white'
				}
			})
		);
		return box;
	}

	// Takes a marker off the map, and lets its avatar go.
	function removeMarker(marker: MarkerType) {
		const avatar = avatars.get(marker.getElement());
		if (avatar) void unmount(avatar);
		marker.remove();
	}

	// Markers follow the map: a single thing that stands alone at this zoom has one; one swallowed by a number does
	// not.
	function sync(target: MapType) {
		if (isSpread) return;
		if (!Marker || !target.getSource('pins') || !target.isSourceLoaded('pins')) return;
		const shown = new Set<string>();
		for (const feature of target.querySourceFeatures('pins')) {
			const properties = feature.properties ?? {};
			if (properties.point_count || properties.count !== 1) continue;
			const key = String(properties.key);
			const item = singles.get(key);
			if (!item) continue;
			shown.add(key);
			if (markers.has(key)) continue;
			const [lng, lat] = (feature.geometry as { coordinates: [number, number] }).coordinates;
			markers.set(
				key,
				new Marker({ element: elementOf(item) }).setLngLat([lng, lat]).addTo(target)
			);
		}
		for (const [key, marker] of markers)
			if (!shown.has(key)) {
				removeMarker(marker);
				markers.delete(key);
			}
	}

	function clearMarkers() {
		for (const marker of markers.values()) removeMarker(marker);
		markers.clear();
		spots = [];
	}

	// What each thing at a place is known by: its seat in the scatter comes from it.
	function keysOf(pin: PinType) {
		return pin.items.map((item) => `${item.page ?? ''}|${item.id ?? item.name}`);
	}

	// Spread: a marker for every thing, scattered round its place.
	function spread(target: MapType) {
		if (!Marker) return;
		clearMarkers();
		for (const pin of pins) {
			const keys = keysOf(pin);
			const seats = scatterOf(keys);
			const centre: [number, number] = [pin.lng, pin.lat];
			for (const [index, item] of pin.items.entries()) {
				const marker = new Marker({ element: elementOf(item) }).setLngLat(centre).addTo(target);
				markers.set(`${pin.city}|${keys[index]}|${index}`, marker);
				spots.push({ marker, centre, seat: seats[index], count: keys.length });
			}
		}
		fan(target);
	}

	// Each marker's seat, in pixels from its place: a gap is never less than keeps the markers apart, and zoomed
	// in it is the gap on the ground, so the scatter opens up.
	function fan(target: MapType) {
		for (const spot of spots) {
			if (spot.count < 2) continue;
			const [lng, lat] = spot.centre;
			const [here, there] = [target.project(spot.centre), target.project([lng + GROUND, lat])];
			const gap = Math.max(
				gapOf(spot.count) * size,
				Math.hypot(there.x - here.x, there.y - here.y)
			);
			spot.marker.setOffset([spot.seat.x * gap, spot.seat.y * gap]);
		}
	}

	function lineOf(points: [number, number][]) {
		return {
			type: 'Feature' as const,
			properties: {},
			geometry: { type: 'LineString' as const, coordinates: points }
		};
	}

	function addLayers(target: MapType) {
		blue = rgbOf(getComputedStyle(node!).getPropertyValue('--color-primary') || '#3b82f6');
		target.addSource('route', { type: 'geojson', data: lineOf(route) });
		target.addLayer({
			id: 'route',
			type: 'line',
			source: 'route',
			layout: { 'line-cap': 'round', 'line-join': 'round' },
			paint: { 'line-color': blue, 'line-width': 3, 'line-dasharray': [1, 2] }
		});
		target.addSource('pins', {
			type: 'geojson',
			data: featuresOf(pins),
			// Spread, nothing is ever swallowed by a number.
			cluster: !isSpread,
			clusterRadius: 36,
			clusterMaxZoom: 12,
			clusterProperties: {
				total: ['+', ['get', 'count']],
				low: ['min', ['get', 'tone']],
				high: ['max', ['get', 'tone']]
			}
		});
		const count: ExpressionSpecification = ['coalesce', ['get', 'total'], ['get', 'count']];
		// A place with one thing draws as that thing's own marker, so the circles are only for numbers.
		const isNumber: ExpressionSpecification = ['>', count, 1];
		target.addLayer({
			id: 'pin-halo',
			type: 'circle',
			source: 'pins',
			filter: isNumber,
			paint: {
				'circle-color': paintOf(),
				'circle-opacity': 0.16,
				'circle-radius': ['+', 14, ['*', 4, ['sqrt', count]]]
			}
		});
		target.addLayer({
			id: 'pin',
			type: 'circle',
			source: 'pins',
			filter: isNumber,
			paint: {
				'circle-color': paintOf(),
				'circle-radius': ['+', 6, ['*', 3, ['sqrt', count]]],
				'circle-stroke-color': '#ffffff',
				'circle-stroke-width': 2.5
			}
		});
		target.addLayer({
			id: 'pin-count',
			type: 'symbol',
			source: 'pins',
			filter: ['>', count, 1],
			layout: {
				'text-field': ['to-string', count],
				'text-font': ['Noto Sans Bold'],
				'text-size': 12,
				'text-allow-overlap': true
			},
			paint: { 'text-color': '#ffffff' }
		});
		target.addLayer({
			id: 'pin-name',
			type: 'symbol',
			source: 'pins',
			filter: ['!', ['has', 'point_count']],
			layout: {
				'text-field': ['get', 'city'],
				'text-font': ['Noto Sans Bold'],
				'text-size': 12,
				'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
				'text-radial-offset': ['coalesce', ['get', 'reach'], 1.9]
			},
			paint: { 'text-color': '#475569', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 }
		});
	}

	// Leave room around the pins, but never more than the map has, or it cannot fit them at all.
	function room(): PaddingType {
		const width = node?.clientWidth ?? 0;
		const height = node?.clientHeight ?? 0;
		// What the fit must always keep for the places themselves. Spread, the markers' own room is counted apart.
		const keep = isSpread ? 16 : 48;
		const scale = (space: number, a: number, b: number) =>
			a + b > space - keep ? Math.max(0, (space - keep) / (a + b)) : 1;
		// Spread, a place's markers sit round it, so each side of the fit leaves room for the scatters on its half of
		// the map, as far as they go that way, and half a marker: a crowd in the west takes its room on the left,
		// not on the right as well.
		const free = { top: 0, bottom: 0, left: 0, right: 0 };
		if (isSpread && pins.length) {
			const lngs = pins.map((pin) => pin.lng);
			const lats = pins.map((pin) => pin.lat);
			const middle = {
				lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
				lat: (Math.min(...lats) + Math.max(...lats)) / 2
			};
			const half = 24 * size;
			for (const pin of pins) {
				const far = extentOf(keysOf(pin));
				const gap = gapOf(pin.items.length) * size;
				if (pin.lng <= middle.lng) free.left = Math.max(free.left, far.left * gap + half);
				if (pin.lng >= middle.lng) free.right = Math.max(free.right, far.right * gap + half);
				if (pin.lat >= middle.lat) free.top = Math.max(free.top, far.up * gap + half);
				if (pin.lat <= middle.lat) free.bottom = Math.max(free.bottom, far.down * gap + half);
			}
		}
		// The higher the sheet rests, the more of the part that shows is left empty round the places (RESTS).
		// It is taken only from what is left once the markers have their room: in a short strip the markers come
		// first, so none of them slips behind the cards or the header.
		const spare = (space: number, used: number) => Math.max(0, (space - used - keep) / 2);
		const across = Math.min(
			Math.max(0, width - padding.left - padding.right) * rest.inset,
			spare(width, padding.left + padding.right + free.left + free.right)
		);
		const down = Math.min(
			Math.max(0, height - padding.top - padding.bottom) * rest.inset,
			spare(height, padding.top + padding.bottom + free.top + free.bottom)
		);
		const top = padding.top + down + free.top;
		const bottom = padding.bottom + down + free.bottom;
		const left = padding.left + across + free.left;
		const right = padding.right + across + free.right;
		const v = scale(height, top, bottom);
		const h = scale(width, left, right);
		return { top: top * v, bottom: bottom * v, left: left * h, right: right * h };
	}

	function fit(duration = 600) {
		if (!map || !isReady) return;
		const points: LngLatLike[] = [
			...pins.map((pin) => [pin.lng, pin.lat] as [number, number]),
			...route
		];
		const closest = maxZoom + rest.zoom;
		const space = room();
		// No place, or one: the map is moved to it with an offset that puts it in the middle of the part that shows.
		// It used to be given the padding, which the map then keeps as its own; every fit after that had the padding
		// counted twice, found no room, and left the map where it was (Justin's phone, 2026-11-16: after Projects,
		// which had no place, Customers never came into view).
		const offset: [number, number] = [
			(space.left - space.right) / 2,
			(space.top - space.bottom) / 2
		];
		if (!points.length) return map.easeTo({ center: [-92, 31], zoom: 3, duration, offset });
		if (points.length === 1)
			return map.easeTo({ center: points[0], zoom: closest, duration, offset });
		let [west, south, east, north] = [180, 90, -180, -90];
		for (const point of points as [number, number][]) {
			west = Math.min(west, point[0]);
			east = Math.max(east, point[0]);
			south = Math.min(south, point[1]);
			north = Math.max(north, point[1]);
		}
		map.fitBounds(
			[
				[west, south],
				[east, north]
			],
			{ padding: space, duration, maxZoom: closest }
		);
	}

	onMount(() => {
		let isGone = false;
		let observer: ResizeObserver | undefined;
		void Promise.all([
			import('maplibre-gl'),
			import('maplibre-gl/dist/maplibre-gl-worker.mjs?raw'),
			import('maplibre-gl/dist/maplibre-gl.css')
		]).then(([maplibre, worker]) => {
			if (isGone || !node) return;
			// Its helper script runs from its own text, untouched by the bundler, which would otherwise lose it.
			workerUrl ??= URL.createObjectURL(new Blob([worker.default], { type: 'text/javascript' }));
			maplibre.setWorkerUrl(workerUrl);
			Marker = maplibre.Marker;
			const target = new maplibre.Map({
				container: node,
				style: isDark ? DARK : STYLE,
				center: [-92, 31],
				zoom: 3,
				attributionControl: false,
				dragRotate: false,
				pitchWithRotate: false,
				touchPitch: false
			});
			target.touchZoomRotate.disableRotation();
			target.on('style.load', () => {
				restyle(target);
				addLayers(target);
				isReady = true;
				if (isSpread) spread(target);
				fit(0);
			});
			target.on('render', () => sync(target));
			target.on('zoom', () => fan(target));
			// Once someone moves or zooms it, the map stays where they left it.
			target.on('movestart', (event) => {
				if ((event as { originalEvent?: Event }).originalEvent) isFree = true;
			});
			target.on('click', 'pin', (event) => {
				const feature = event.features?.[0];
				if (!feature?.properties?.point_count) return;
				const [lng, lat] = (feature.geometry as { coordinates: [number, number] }).coordinates;
				target.easeTo({ center: [lng, lat], zoom: target.getZoom() + 2 });
			});
			observer = new ResizeObserver(() => {
				target.resize();
				if (!isFree) fit(0);
			});
			observer.observe(node);
			map = target;
		});
		return () => {
			isGone = true;
			observer?.disconnect();
			clearMarkers();
			map?.remove();
		};
	});

	// New pins or a new route: show them, and fit to them again, even if someone had moved the map themselves. So
	// a new page of the dashboard always shows all its markers. Only the pins, the route and the map being ready
	// set this off: a change of rest must not make the markers anew.
	$effect(() => {
		void isSpread;
		const data = featuresOf(pins);
		const line = lineOf(route);
		const target = map;
		if (!target || !isReady) return;
		untrack(() => {
			// The things may have changed their pictures or colours, so the markers are made again.
			clearMarkers();
			if (isSpread) spread(target);
			(target.getSource('pins') as GeoJSONSource | undefined)?.setData(data);
			(target.getSource('route') as GeoJSONSource | undefined)?.setData(line);
			for (const layer of ['pin', 'pin-halo'])
				if (target.getLayer(layer)) target.setPaintProperty(layer, 'circle-color', paintOf());
			isFree = false;
			fit();
		});
	});

	$effect(() => {
		void padding.top;
		void padding.bottom;
		void padding.left;
		void padding.right;
		untrack(() => !isFree && fit(0));
	});

	// The sheet was let go (`refit`), at another rest or the same one: once it has settled, the map eases back to
	// all its markers at how close that rest stands, even if someone had moved the
	// map themselves. Until then it keeps fitting what it was showing, so it does not jump.
	let isSettled = false;
	$effect(() => {
		const next = closeness;
		void refit;
		// Not as the map is first drawn: there is nothing to come back from.
		if (!isSettled) return void (isSettled = true);
		const timer = setTimeout(() => {
			shown = next;
			isFree = false;
			if (map) fan(map);
			fit(700);
		}, 320);
		return () => clearTimeout(timer);
	});

	export function zoomBy(by: number) {
		map?.easeTo({ zoom: (map.getZoom() ?? 3) + by });
	}
</script>

<div class="relative size-full">
	<div
		bind:this={node}
		class="size-full {isDark ? 'bg-slate-900' : 'bg-slate-100'}"
		style:--pin={size}
		role="region"
		aria-label="Map"
	></div>
	<a
		class="absolute z-10 rounded-full bg-white/70 px-1.5 text-[10px] leading-4 text-slate-500 backdrop-blur"
		style="bottom: {Math.max(4, padding.bottom - 20)}px; right: {Math.max(6, padding.right - 16)}px"
		href="https://www.openstreetmap.org/copyright"
		target="_blank"
		rel="noreferrer">© OpenStreetMap</a
	>
</div>
