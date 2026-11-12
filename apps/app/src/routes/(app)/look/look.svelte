<script lang="ts">
	// The app: look B of the look prototype (#161), carried over whole as V1 (#180) without its prototype selector.
	// What is on screen rides in the address (look.utils.ts), so a reload or the back button lands on the same place.
	// What is saved (#183) starts from the server's rows (`rows`, the lists query) and goes back through the sync loop:
	// the mapper turns the state into rows, the loop sends the difference about a second after the last change, and
	// the header's cloud shows how that went. Coming back to the tab or opening a record takes in what others saved,
	// while nothing here waits to be sent.
	import './look.css';
	import { fly } from 'svelte/transition';
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { fetchLists, saveRows } from '#lib/rows/rows.remote.js';
	import type { SavedRowType } from '#lib/rows/rows.schema.js';
	import { SyncLoop } from '#lib/rows/rows.state.svelte.js';
	import { LookState } from './look.state.svelte';
	import Confirm from './confirm.svelte';
	import SaveSheet from './save-sheet.svelte';
	import Shell from './shell.svelte';
	import StatusSheet from './status-sheet.svelte';
	import { openAddress, placeOf, toAddress } from './look.utils';
	import { takeRows, toRows } from './mapper';

	type SelfType = { userId: string; role: LookState['role'] | null; isSuperAdmin: boolean };

	let {
		rows,
		self,
		onready
	}: { rows: SavedRowType[]; self: SelfType; onready: (look: LookState) => void } = $props();

	const look = new LookState();
	// Who is signed in (#185), before the rows arrive, so their own Team record is known as they are taken in.
	// svelte-ignore state_referenced_locally
	look.userId = self.userId;
	// svelte-ignore state_referenced_locally
	look.role = self.role ?? '';
	// svelte-ignore state_referenced_locally
	look.isSuperAdmin = self.isSuperAdmin;
	const sync = new SyncLoop({
		read: () => toRows(look),
		take: (taken) => takeRows(look, taken),
		send: (batch) => saveRows(batch),
		fetch: async () => {
			const lists = fetchLists();
			await lists.refresh();
			return await lists;
		}
	});
	// svelte-ignore state_referenced_locally
	sync.load(rows);
	look.sync = sync;
	openAddress(look, page.url.searchParams);
	// svelte-ignore state_referenced_locally
	onready(look);

	// Any change to what saves: the sync loop sends it a second after the last one.
	$effect(() => {
		JSON.stringify(toRows(look));
		untrack(() => sync.notice());
	});

	// Opening a record takes in what others saved to it.
	$effect(() => {
		if (look.screen !== 'record' || !look.record) return;
		untrack(() => void sync.refresh());
	});

	// A change that did not save says so wherever the User is, not only beside a cloud.
	$effect(() => {
		if (sync.state !== 'failed') return;
		const reason = sync.reason;
		untrack(() => look.say(`Not saved: ${reason}`));
	});

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

	// Leaving or closing the tab while something is not saved asks first.
	function onbeforeunload(event: BeforeUnloadEvent) {
		if (sync.isPending) event.preventDefault();
	}

	// Back on the tab: take in what others saved meanwhile.
	function onvisibilitychange() {
		if (document.visibilityState === 'visible') void sync.refresh();
	}
</script>

<svelte:window
	{onpopstate}
	{onbeforeunload}
/>
<svelte:document {onvisibilitychange} />

<div class="look font-sans text-slate-900 [color-scheme:light]">
	<Shell {look} />
	<StatusSheet {look} />
	<Confirm {look} />
	<SaveSheet {look} />
</div>

{#if look.toast}
	<div
		class="fixed inset-x-0 bottom-28 z-[90] flex justify-center px-4 md:bottom-20"
		transition:fly={{ y: 16, duration: 200 }}
	>
		<p class="rounded-full bg-slate-900 px-4 py-2.5 text-sm text-white shadow-xl">{look.toast}</p>
	</div>
{/if}
