<script lang="ts">
	// The app: look B of the look prototype (#161), carried over whole as V1 (#180) without its prototype selector.
	// What is on screen rides in the address (look.utils.ts), so a reload or the back button lands on the same place.
	// What is saved (#183) starts from the server's rows (`rows`, the lists query) and goes back through the sync loop:
	// the mapper turns the state into rows, the loop sends the difference about a second after the last change, and
	// the header's cloud shows how that went. Coming back to the tab or opening a record takes in what others saved,
	// while nothing here waits to be sent.
	import './look.css';
	import { untrack } from 'svelte';
	import { Toast } from '@layerd/ui';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { noteActivity } from '#lib/activity/activity.note.js';
	import { fetchLists, fetchProject, saveRows } from '#lib/rows/rows.remote.js';
	import { type RowType, type SavedRowType, TABLES } from '#lib/rows/rows.schema.js';
	import { SyncLoop } from '#lib/rows/rows.state.svelte.js';
	import { LookState } from './look.state.svelte';
	import Confirm from './confirm.svelte';
	import SaveSheet from './save-sheet.svelte';
	import Shell from './shell.svelte';
	import StatusSheet from './status-sheet.svelte';
	import TranslateSheet from './translate-sheet.svelte';
	import { IS_TRANSLATING } from './translation';
	import { openAddress, placeOf, toAddress } from './look.utils';
	import { isOfProject, takeProject, takeReads, takeRows, toRows } from './mapper';
	import { downloadToast, photoToasts } from './toasts';
	import { toEmptyNote } from './tally';

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

	// What keeps a percent under 100% (#305): the empty inputs the toast lists, read anew as each is filled in. Once
	// nothing is left, or the project is left, the toast is done and goes.
	const empties = $derived(look.empties);
	const emptyPanel = $derived(
		look.panels.find((panel) => panel.id === look.emptyFor?.panelId)?.name
	);
	$effect(() => {
		if (look.emptyFor && !empties.length) untrack(() => look.closeEmpty());
	});

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

	// Opening a project loads its panels and what is in them (#186), and takes in what others saved to it. It shows
	// in an Admin's Activity too (#306): an opening again soon after counts once.
	$effect(() => {
		if (look.screen !== 'workspace' || !look.projectId) return;
		const id = look.projectId;
		untrack(() => {
			void openProject(id);
			noteActivity({ kind: 'open', projectId: id });
		});
	});

	// The Cards view shows each project's photos, and those are among the rows a project loads as it opens. So
	// while the cards are on screen, every project not loaded yet is loaded, three at a time, saying nothing if one
	// does not come (Justin, 2026-11-17: after a reload, "all I see is a bunch of no photos yet"). #350: every list of
	// projects shows how many photos, videos, PDFs and spreadsheets each holds, counted from those rows too, so the
	// list, the board and a record's own projects load them as the cards do.
	let isFilling = false;
	$effect(() => {
		const isProjects = look.screen === 'dashboard' && look.dataset === 'projects';
		if (!isProjects && look.screen !== 'record') return;
		const ids = look.projects
			.filter((project) => !look.isLoaded(project.id))
			.map((each) => each.id);
		if (ids.length) untrack(() => void fill(ids));
	});

	async function fill(ids: string[]) {
		if (isFilling) return;
		isFilling = true;
		const waiting = [...ids];
		async function next() {
			for (let id = waiting.shift(); id; id = waiting.shift()) await openProject(id, true);
		}
		await Promise.all([next(), next(), next()]);
		isFilling = false;
	}

	// Quiet: for the Cards view, which asks for projects nobody opened. It says nothing and takes nothing away.
	async function openProject(id: string, isQuiet = false) {
		const isLoaded = look.isLoaded(id);
		if (isLoaded && sync.isPending) return;
		let found: Awaited<ReturnType<typeof fetchProject>>;
		try {
			const query = fetchProject(id);
			if (isLoaded) await query.refresh();
			found = await query;
		} catch {
			if (!look.isLoaded(id) && !isQuiet)
				look.say('This project could not load. Check the connection and open it again.');
			return;
		}
		if (!found.isFound && isQuiet) return;
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
	{#if IS_TRANSLATING && look.translateFor && look.workspaces[look.translateFor]}
		<TranslateSheet
			{look}
			projectId={look.translateFor}
			onclose={() => (look.translateFor = undefined)}
		/>
	{/if}
	<Confirm {look} />
	<SaveSheet {look} />
</div>

<!-- The toasts, one over the other (#293): the download's progress (#240), one for each set of photos picked
     together, what keeps a percent under 100% (#305), then the short notes. -->
<div
	class="pointer-events-none fixed inset-x-0 bottom-28 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-20"
>
	<Toast
		progress={downloadToast()}
		label="Download PDF"
	/>
	{#each photoToasts() as toast (toast)}
		<Toast
			progress={toast}
			label="Upload photos"
		/>
	{/each}
	<Toast
		text={toEmptyNote(empties.length, emptyPanel)}
		items={empties.map((input) => ({ label: input.text, onclick: () => look.openInput(input) }))}
		onclose={() => look.closeEmpty()}
	/>
	<Toast text={look.toast} />
</div>
