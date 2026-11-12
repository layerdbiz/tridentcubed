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
	import type {
		ExpressionSpecification,
		GeoJSONSource,
		LngLatLike,
		Map as MapType,
		Marker as MarkerType
	} from 'maplibre-gl';
	import { onMount, untrack } from 'svelte';
	import type { PinItemType, PinType } from './chart.data';

	type PaddingType = { top: number; bottom: number; left: number; right: number };

	let {
		pins,
		route = [],
		padding = { top: 24, bottom: 24, left: 24, right: 24 },
		maxZoom = 9,
		isSpread = false,
		onpick
	}: {
		pins: PinType[];
		// A tap on a marker that is one thing.
		onpick?: (item: PinItemType) => void;
		route?: [number, number][];
		padding?: PaddingType;
		maxZoom?: number;
		// Map B (run 22): every thing is its own point, set a little way out from its place in a ring, so several in
		// one city come apart into their own markers once the map is zoomed in far enough.
		isSpread?: boolean;
	} = $props();

	const STYLE = 'https://tiles.openfreemap.org/styles/positron';
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
	let singles = new Map<string, PinItemType>();
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

	function restyle(target: MapType) {
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
			// About five kilometres out: far enough to come apart by zoom 10, near enough to still read as the city.
			const RING = 0.045;
			return {
				type: 'FeatureCollection' as const,
				features: items.flatMap((pin) =>
					pin.items.map((item, at) => {
						const key = `${pin.city}|${item.page ?? ''}|${item.id ?? item.name}|${at}`;
						const angle = (at / pin.items.length) * Math.PI * 2 - Math.PI / 2;
						const out = pin.items.length > 1 ? RING : 0;
						singles.set(key, item);
						return {
							type: 'Feature' as const,
							properties: {
								key,
								city: pin.city.split(',')[0],
								count: 1,
								tone: tones.indexOf(item.tone ?? '')
							},
							geometry: {
								type: 'Point' as const,
								coordinates: [
									pin.lng + (Math.cos(angle) * out) / Math.cos((pin.lat * Math.PI) / 180),
									pin.lat + Math.sin(angle) * out
								]
							}
						};
					})
				)
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
						city: pin.city.split(',')[0],
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

	// One thing on the map: its picture or icon in a white-ringed circle of its own colour.
	function elementOf(item: PinItemType) {
		const button = document.createElement('button');
		button.type = 'button';
		button.title = item.name;
		button.setAttribute('aria-label', item.name);
		button.className = `flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full text-white shadow-[0_2px_8px_rgb(15_23_42/0.35)] ring-[2.5px] ring-white ${item.image ? 'bg-white' : (item.tone ?? 'bg-primary')}`;
		if (item.image) {
			const image = document.createElement('img');
			image.src = item.image;
			image.alt = '';
			image.draggable = false;
			image.className =
				item.page === 'team' ? 'size-full object-cover' : 'size-full object-contain';
			button.append(image);
		} else if (item.icon) {
			const icon = document.createElement('span');
			icon.className = `${item.icon} size-5`;
			button.append(icon);
		} else {
			const letter = document.createElement('span');
			letter.className = 'text-sm font-semibold';
			letter.textContent = item.name.slice(0, 1).toUpperCase();
			button.append(letter);
		}
		button.addEventListener('click', (event) => {
			event.stopPropagation();
			onpick?.(item);
		});
		return button;
	}

	// Markers follow the map: a single thing that stands alone at this zoom has one; one swallowed by a number does
	// not.
	function sync(target: MapType) {
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
				marker.remove();
				markers.delete(key);
			}
	}

	function clearMarkers() {
		for (const marker of markers.values()) marker.remove();
		markers.clear();
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
			cluster: true,
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
				'text-radial-offset': 1.9
			},
			paint: { 'text-color': '#475569', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 }
		});
	}

	// Leave room around the pins, but never more than the map has, or it cannot fit them at all.
	function room(): PaddingType {
		const width = node?.clientWidth ?? 0;
		const height = node?.clientHeight ?? 0;
		const scale = (space: number, a: number, b: number) =>
			a + b > space - 48 ? Math.max(0, (space - 48) / (a + b)) : 1;
		const v = scale(height, padding.top, padding.bottom);
		const h = scale(width, padding.left, padding.right);
		return {
			top: padding.top * v,
			bottom: padding.bottom * v,
			left: padding.left * h,
			right: padding.right * h
		};
	}

	function fit(duration = 600) {
		if (!map || !isReady) return;
		const points: LngLatLike[] = [
			...pins.map((pin) => [pin.lng, pin.lat] as [number, number]),
			...route
		];
		const options = { padding: room(), duration, maxZoom };
		if (!points.length) return map.easeTo({ center: [-92, 31], zoom: 3, ...options });
		if (points.length === 1) return map.easeTo({ center: points[0], zoom: maxZoom, ...options });
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
			options
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
				style: STYLE,
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
				fit(0);
			});
			target.on('render', () => sync(target));
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

	// New pins or a new route: show them, and fit to them again.
	$effect(() => {
		void isSpread;
		const data = featuresOf(pins);
		const line = lineOf(route);
		if (!map || !isReady) return;
		// The things may have changed their pictures or colours, so the markers are made again.
		clearMarkers();
		(map.getSource('pins') as GeoJSONSource | undefined)?.setData(data);
		(map.getSource('route') as GeoJSONSource | undefined)?.setData(line);
		for (const layer of ['pin', 'pin-halo'])
			if (map.getLayer(layer)) map.setPaintProperty(layer, 'circle-color', paintOf());
		isFree = false;
		fit();
	});

	$effect(() => {
		void padding.top;
		void padding.bottom;
		void padding.left;
		void padding.right;
		untrack(() => !isFree && fit(0));
	});

	export function zoomBy(by: number) {
		map?.easeTo({ zoom: (map.getZoom() ?? 3) + by });
	}
</script>

<div class="relative size-full">
	<div
		bind:this={node}
		class="size-full bg-slate-100"
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
