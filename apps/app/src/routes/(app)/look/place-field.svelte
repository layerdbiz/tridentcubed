<script lang="ts">
	// PROTOTYPE (#161) run 17: the one location field, on every form that asks where something is (Justin,
	// 2026-11-10: type, pause, and the place comes up). Since #298 it is the library's Select with the place lookup
	// (places.ts), which is smart about its calls: as you type it first offers the places already saved
	// (LookState.places), which cost nothing, and only after typing pauses, with three letters or more and no saved
	// place of that exact name, does it ask the server once, remembering that answer for the visit. Picking a
	// suggestion saves the place with its coordinates, so the map can pin it and nobody ever looks it up again. Typing
	// a place without picking still keeps the words; it just has no pin, which the line under it says. Since #373 it is
	// the notched field, its label on the border, on every form that has it.
	import { Select } from '@layerd/ui';
	import type { LookState } from './look.state.svelte';
	import { foundPlace, PLACES, toSavedChoice } from './places';

	let {
		look,
		label,
		value,
		oninput,
		help = '',
		isRequired = false,
		class: className = undefined
	}: {
		look: LookState;
		label: string;
		value: string;
		oninput: (text: string) => void;
		// The input's Help text (#299).
		help?: string;
		isRequired?: boolean;
		class?: string;
	} = $props();

	const saved = $derived(look.places.map(toSavedChoice));
	const pinned = $derived(look.placeOf(value));

	function pick(name: string) {
		const place = foundPlace(name);
		if (place) look.keepPlace(place);
		oninput(name);
	}
</script>

<div class={className}>
	<Select
		{label}
		{help}
		required={isRequired}
		options={saved}
		lookup={PLACES}
		{value}
		{oninput}
		onpick={pick}
	/>
	{#if value.trim()}
		<p
			class="mt-1.5 flex items-center gap-1 px-1 text-xs {pinned
				? 'text-success'
				: 'text-slate-400'}"
		>
			<span
				class="{pinned
					? 'icon-[mdi--map-marker-check]'
					: 'icon-[mdi--map-marker-off-outline]'} size-3.5"
			></span>{pinned ? 'On the map' : 'No pin yet. Pick a suggestion to put it on the map.'}
		</p>
	{/if}
</div>
