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
	import { fetchLists, fetchProject, saveRows } from '#lib/rows/rows.remote.js';
	import { type RowType, type SavedRowType, TABLES } from '#lib/rows/rows.schema.js';
	import { SyncLoop } from '#lib/rows/rows.state.svelte.js';
	import { LookState } from './look.state.svelte';
	import Confirm from './confirm.svelte';
	import SaveSheet from './save-sheet.svelte';
	import Shell from './shell.svelte';
	import StatusSheet from './status-sheet.svelte';
	import { openAddress, placeOf, toAddress } from './look.utils';
	import { isOfProject, takeProject, takeReads, takeRows, toRows } from './mapper';

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
		takeReads: (reads) => takeReads(look, reads),
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

	// Opening a project loads its panels and what is in them (#186), and takes in what others saved to it.
	$effect(() => {
		if (look.screen !== 'workspace' || !look.projectId) return;
		const id = look.projectId;
		untrack(() => void openProject(id));
	});

	async function openProject(id: string) {
		const isLoaded = look.isLoaded(id);
		if (isLoaded && sync.isPending) return;
		let found: Awaited<ReturnType<typeof fetchProject>>;
		try {
			const query = fetchProject(id);
			if (isLoaded) await query.refresh();
			found = await query;
		} catch {
			if (!look.isLoaded(id))
				look.say('This project could not load. Check the connection and open it again.');
			return;
		}
		// Not there at all yet is a project made here whose first save has not arrived.
		if (!found.isFound)
			return found.isTrashed || !isLoaded ? loseProject(id, found.reason) : undefined;
		// While a change waits to be sent, the project's row and Team Assigned stay as they are on screen; what is
		// inside it has nothing waiting, since it had not loaded.
		const isIdle = !sync.isPending;
		if (look.isLoaded(id) && !isIdle) return;
		const isPart = isOfProject(id);
		const isInside = (row: RowType) => isPart(row) && TABLES[row.table].scope === 'project';
		const rows = [found.project, ...found.rows].filter((row) => isIdle || isInside(row));
		sync.merge(rows, isIdle ? isPart : isInside, (taken) => takeProject(look, id, taken));
	}

	// A project someone else moved to the Trash: the User is told, and it leaves the screens.
	function loseProject(id: string, reason: string) {
		look.say(reason);
		if (look.screen === 'workspace' && look.projectId === id) look.home();
		look.projects = look.projects.filter((project) => project.id !== id);
		delete look.workspaces[id];
		void sync.refresh();
	}

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

	// While the tab is shown, take in what others saved once a minute: their online dots come from when they were
	// last in the app, and this User's own request stamps them as seen (story 26).
	$effect(() => sync.keepFresh({ isVisible: () => document.visibilityState === 'visible' }));

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
