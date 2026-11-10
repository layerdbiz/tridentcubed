<script
	module
	lang="ts"
>
	const ASKED = new Map<string, PlaceType[]>();
</script>

<script lang="ts">
	// PROTOTYPE (#161) run 17: the one location field, on every form that asks where something is (Justin,
	// 2026-11-10: type, pause, and the place comes up). It is smart about its calls. As you type it first offers the
	// places already saved (LookState.places), which cost nothing. Only after typing pauses, with three letters or
	// more and no saved place of that exact name, does it ask the server once (look/places), and it remembers that
	// answer for the visit. Picking a suggestion saves the place with its coordinates, so the map can pin it and
	// nobody ever looks it up again. Typing a place without picking still keeps the words; it just has no pin.
	import type { LookState } from './look.state.svelte';
	import type { PlaceType } from './map.data';

	let {
		look,
		value,
		oninput,
		inputClass,
		placeholder = 'Start typing a city or address'
	}: {
		look: LookState;
		value: string;
		oninput: (text: string) => void;
		inputClass: string;
		placeholder?: string;
	} = $props();

	const PAUSE = 350;
	// What the server said for a text, kept for the visit, shared by every location field on the page.
	const asked = ASKED;

	let isOpen = $state(false);
	let isAsking = $state(false);
	let found = $state<PlaceType[]>([]);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let request: AbortController | undefined;

	const text = $derived(value.trim().toLowerCase());
	const saved = $derived(
		text ? look.places.filter((place) => place.name.toLowerCase().includes(text)).slice(0, 5) : []
	);
	const fresh = $derived(found.filter((place) => !saved.some((item) => item.name === place.name)));
	const pinned = $derived(look.placeOf(value));

	async function ask(query: string) {
		if (asked.has(query)) return (found = asked.get(query)!);
		request?.abort();
		request = new AbortController();
		isAsking = true;
		try {
			const response = await fetch(`/prototype/look/places?text=${encodeURIComponent(query)}`, {
				signal: request.signal
			});
			const body = (await response.json()) as { places: PlaceType[] };
			asked.set(query, body.places);
			if (query === text) found = body.places;
		} catch {
			// A newer letter cancelled this one, or the network is away: the saved places still show.
		} finally {
			isAsking = false;
		}
	}

	function type(event: Event) {
		const next = (event.currentTarget as HTMLInputElement).value;
		oninput(next);
		isOpen = true;
		found = [];
		clearTimeout(timer);
		const query = next.trim().toLowerCase();
		if (query.length < 3 || look.placeOf(next)) return;
		timer = setTimeout(() => ask(query), PAUSE);
	}

	function pick(place: PlaceType) {
		look.keepPlace(place);
		oninput(place.name);
		isOpen = false;
		found = [];
	}
</script>

<div class="relative">
	<input
		class={inputClass}
		{value}
		{placeholder}
		autocomplete="off"
		role="combobox"
		aria-expanded={isOpen && (saved.length > 0 || fresh.length > 0)}
		aria-controls="place-suggestions"
		aria-autocomplete="list"
		oninput={type}
		onfocus={() => (isOpen = true)}
		onblur={() => setTimeout(() => (isOpen = false), 180)}
		onkeydown={(event) => event.key === 'Escape' && (isOpen = false)}
	/>
	{#if isOpen && text && (saved.length || fresh.length || isAsking)}
		<!-- In the flow, under the field, so no scrolling box or sheet can cut it off. -->
		<ul
			id="place-suggestions"
			class="mt-1.5 overflow-hidden rounded-2xl bg-white p-1 text-left shadow-[0_2px_6px_rgb(15_23_42/0.06),0_12px_28px_-12px_rgb(15_23_42/0.25)] ring-1 ring-slate-900/[0.06]"
			role="listbox"
		>
			{#each saved as place (place.name)}
				<li>
					<button
						type="button"
						class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-900/[0.04]"
						role="option"
						aria-selected={place.name === value}
						onpointerdown={(event) => event.preventDefault()}
						onclick={() => pick(place)}
					>
						<span class="icon-[mdi--map-marker] size-[18px] shrink-0 text-primary"></span>
						<span class="min-w-0 flex-1 truncate">{place.name}</span>
						<span class="shrink-0 text-[11px] text-slate-400">Saved</span>
					</button>
				</li>
			{/each}
			{#each fresh as place (place.name)}
				<li>
					<button
						type="button"
						class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-900/[0.04]"
						role="option"
						aria-selected="false"
						onpointerdown={(event) => event.preventDefault()}
						onclick={() => pick(place)}
					>
						<span class="icon-[mdi--map-marker-plus-outline] size-[18px] shrink-0 text-slate-400"
						></span>
						<span class="min-w-0 flex-1">
							<span class="block truncate">{place.name}</span>
							{#if place.detail && place.detail !== place.name}
								<span class="block truncate text-[11px] text-slate-400">{place.detail}</span>
							{/if}
						</span>
					</button>
				</li>
			{/each}
			{#if isAsking && !fresh.length}
				<li class="px-3 py-2 text-xs text-slate-400">Looking it up…</li>
			{/if}
			{#if fresh.length}
				<li class="px-3 pt-1 pb-1.5 text-right text-[10px] text-slate-400">
					Powered by <a
						class="underline"
						href="https://www.geoapify.com/"
						target="_blank"
						rel="noreferrer">Geoapify</a
					>
				</li>
			{/if}
		</ul>
	{/if}
	{#if value.trim()}
		<p class="mt-1.5 flex items-center gap-1 text-xs {pinned ? 'text-success' : 'text-slate-400'}">
			<span
				class="{pinned
					? 'icon-[mdi--map-marker-check]'
					: 'icon-[mdi--map-marker-off-outline]'} size-3.5"
			></span>{pinned ? 'On the map' : 'No pin yet. Pick a suggestion to put it on the map.'}
		</p>
	{/if}
</div>
