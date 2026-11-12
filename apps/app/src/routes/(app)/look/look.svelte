<script lang="ts">
	// The app: look B of the look prototype (#161), carried over whole as V1 (#180) without its prototype selector.
	// What is on screen rides in the address (look.utils.ts), so a reload or the back button lands on the same place.
	import './look.css';
	import { fly } from 'svelte/transition';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { LookState } from './look.state.svelte';
	import Confirm from './confirm.svelte';
	import Shell from './shell.svelte';
	import StatusSheet from './status-sheet.svelte';
	import { openAddress, placeOf, toAddress } from './look.utils';

	let { onready }: { onready: (look: LookState) => void } = $props();

	const look = new LookState();
	openAddress(look, page.url.searchParams);
	// svelte-ignore state_referenced_locally
	onready(look);

	// What is on screen goes into the address. Opening another screen, project or record is a new history entry, so
	// the back button returns to the one before; a tab, view or panel change replaces the entry it is on.
	$effect(() => {
		const url = toAddress(look, new URL(location.href));
		if (url.search === location.search) return;
		const isNewPlace = placeOf(url.searchParams) !== placeOf(new URLSearchParams(location.search));
		goto(url, { shallow: true, replace: !isNewPlace });
	});

	// The back and forward buttons: the browser has already moved to the address, so its place goes back on screen.
	function onpopstate() {
		openAddress(look, new URLSearchParams(location.search));
	}
</script>

<svelte:window {onpopstate} />

<div class="look font-sans text-slate-900 [color-scheme:light]">
	<Shell {look} />
	<StatusSheet {look} />
	<Confirm {look} />
</div>

{#if look.toast}
	<div
		class="fixed inset-x-0 bottom-28 z-[90] flex justify-center px-4 md:bottom-20"
		transition:fly={{ y: 16, duration: 200 }}
	>
		<p class="rounded-full bg-slate-900 px-4 py-2.5 text-sm text-white shadow-xl">{look.toast}</p>
	</div>
{/if}
