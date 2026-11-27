<script lang="ts">
	// Several photos selected (#402; Justin on #287, 2026-11-24): the library's Selection bar in the menu bar's place, at
	// its exact size (variants/bar-c.svelte: the phone's floating bar, or the desktop's beside the panels), with white
	// icons in his order: one description for all (asking first when any already has one), Delete (asking first) and
	// Move to…, and an X at its far right. Escape, or a tap anywhere but the selection's photos, the bar and its sheets,
	// ends it and does nothing else; a Ctrl, Cmd or Shift click on another panel's photo starts a selection there. The
	// selection itself is selection.svelte.ts; selecting is in the photo tiles (panel-body.svelte, sortable.ts).
	import { Button, Dialog, Input, SelectionBar, Textarea } from '@layerd/ui';
	import { fade } from 'svelte/transition';
	import { groupWordOf } from './look.data';
	import type { LookState } from './look.state.svelte';
	import { countLabelOf, deletePhotos, describePhotos, movePhotos } from './photos';
	import { countsOfPhotos } from './counts';
	import FileCounts from './file-counts.svelte';

	let { look, isWide, left }: { look: LookState; isWide: boolean; left: string } = $props();

	const selection = $derived(look.selection);
	const photos = $derived(selection.photosIn(look.panels));
	const label = $derived(countLabelOf(photos));
	const described = $derived(photos.filter((photo) => photo.description.trim()));
	const isShown = $derived(look.isSelecting && photos.length > 0);
	let words = $state('');
	let search = $state('');

	// The selection goes with what it was made in: another project, another tab, or its last photo gone (deleted on
	// another device). A panel opened beside by a dragged selection shuts with its project.
	let projectId = '';
	$effect(() => {
		if (look.projectId !== projectId) selection.alsoOpen = '';
		projectId = look.projectId;
		if (selection.isOn && !isShown) selection.end();
	});

	function describe() {
		// One for all starts from the words they share, when they all share the same.
		const shared = new Set(photos.map((photo) => photo.description.trim()));
		words = shared.size === 1 ? [...shared][0] : '';
		selection.sheet = described.length ? 'replace' : 'describe';
	}

	function saveWords() {
		const what = label;
		describePhotos(look.panels, selection.ids, words);
		look.say(words.trim() ? `Description added to ${what}` : `Description cleared on ${what}`);
		selection.end();
		look.saved();
	}

	function remove() {
		const ids = [...selection.ids];
		const what = label;
		look.confirm({
			title: `Delete ${what}?`,
			note: `${photos.length === 1 ? 'It leaves' : 'They leave'} the report.`,
			onyes: () => {
				deletePhotos(look.panels, ids);
				look.say(`${what} deleted`);
				selection.end();
				look.saved();
			}
		});
	}

	function moveTo(id: string, title: string) {
		const what = label;
		if (!movePhotos(look.panels, selection.ids, id)) return;
		look.say(`${what} moved to ${title}`);
		selection.end();
		look.saved();
	}

	// Every photo panel that is on, and its stages or groups, the search keeping those whose name or panel matches.
	const places = $derived(
		look.panels
			.filter((panel) => panel.kind === 'photos' && panel.isEnabled)
			.map((panel) => ({
				panel,
				word: groupWordOf(panel),
				groups: (panel.groups ?? []).filter((group) =>
					`${panel.name} ${group.title}`.toLowerCase().includes(search.trim().toLowerCase())
				)
			}))
			.filter((place) => place.groups.length)
	);

	// Whether every selected photo is in this group already: moving there would change nothing.
	function isHere(groupId: string) {
		const group = look.panels
			.flatMap((panel) => panel.groups ?? [])
			.find((each) => each.id === groupId);
		return Boolean(group) && photos.every((photo) => group!.photos.includes(photo));
	}

	// A tap anywhere but the selection's own photos, the bar and its sheets ends the selection, and does nothing else.
	function outside(event: MouseEvent) {
		if (!isShown) return;
		const target = event.target as HTMLElement;
		if (target.closest('[data-selection-bar], [role="dialog"], dialog, [popover]')) return;
		const tile = target.closest<HTMLElement>('[data-photo-panel]');
		// The click a drag or a hold ends on, wherever it lands, is not a tap.
		if (performance.now() < selection.quietUntil && !tile) return swallow(event);
		if (tile && !target.closest('[data-no-drag]')) {
			if (tile.dataset.photoPanel === selection.panelId) return;
			if (event.ctrlKey || event.metaKey || event.shiftKey) return;
		}
		selection.end();
		swallow(event);
	}

	function swallow(event: Event) {
		event.stopPropagation();
		event.preventDefault();
	}
</script>

<svelte:window
	onclickcapture={outside}
	onkeydown={(event) => {
		if (event.key === 'Escape' && isShown && !selection.sheet && !look.asking) selection.end();
	}}
/>

{#if isShown}
	<div
		class="fixed z-[56] {isWide
			? 'bottom-6 w-[26rem] -translate-x-1/2'
			: 'inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+14px)]'}"
		style:left={isWide ? left : undefined}
		data-selection-bar
		transition:fade={{ duration: 160 }}
	>
		<SelectionBar
			count={photos.length}
			actions={[
				{
					label: 'One description for all',
					icon: 'icon-[mdi--text-box-edit-outline]',
					onclick: describe
				},
				{ label: 'Delete', icon: 'icon-[mdi--trash-can-outline]', onclick: remove },
				{
					label: 'Move to…',
					icon: 'icon-[mdi--folder-move-outline]',
					onclick: () => {
						search = '';
						selection.sheet = 'move';
					}
				}
			]}
			onclose={() => selection.end()}
		/>
	</div>
{/if}

{#if isShown && selection.sheet === 'replace'}
	<Dialog
		label="Replace descriptions?"
		onclose={() => (selection.sheet = '')}
	>
		<div class="flex items-center gap-3">
			<span
				class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
				><span class="icon-[mdi--text-box-edit-outline] size-6"></span></span
			>
			<p>
				<b class="block text-lg leading-snug text-slate-900">Replace descriptions?</b>
				<span class="text-sm text-slate-500"
					>{described.length === photos.length
						? photos.length === 1
							? 'It already has one.'
							: photos.length === 2
								? 'Both already have one.'
								: `All ${photos.length} already have one.`
						: `${described.length} of the ${photos.length} already ${described.length === 1 ? 'has' : 'have'} one.`}
					One description for all takes their place.</span
				>
			</p>
		</div>
		<div class="mt-6 grid grid-cols-2 gap-2">
			<Button
				neutral
				lite
				sm
				width="full"
				label="Cancel"
				onclick={() => (selection.sheet = '')}
			/>
			<Button
				primary
				heavy
				sm
				width="full"
				label="Replace"
				onclick={() => (selection.sheet = 'describe')}
			/>
		</div>
	</Dialog>
{/if}

{#if isShown && selection.sheet === 'describe'}
	<Dialog
		label="One Description for All"
		onclose={() => (selection.sheet = '')}
	>
		<form
			class="space-y-4"
			onsubmit={(event) => {
				event.preventDefault();
				saveWords();
			}}
		>
			<p>
				<b class="block text-lg text-slate-900">One Description for All</b>
				<span class="text-sm text-slate-500">Printed on each of the {label}.</span>
			</p>
			<div {@attach (node) => node.querySelector('textarea')?.focus()}>
				<Textarea
					label="Description"
					autocapitalize="sentences"
					spellcheck
					rows={3}
					bind:value={words}
				/>
			</div>
			<Button
				primary
				heavy
				sm
				width="full"
				type="submit"
				label="Save"
			/>
		</form>
	</Dialog>
{/if}

{#if isShown && selection.sheet === 'move'}
	<Dialog
		label="Move to…"
		onclose={() => (selection.sheet = '')}
	>
		<b class="block text-lg text-slate-900">Move {label} to…</b>
		<div class="mt-4">
			<Input
				label="Search"
				icon="icon-[mdi--magnify]"
				autocomplete="off"
				bind:value={search}
			/>
		</div>
		<div class="-mx-2 mt-2 max-h-[min(360px,50vh)] overflow-y-auto overscroll-contain">
			{#each places as place (place.panel.id)}
				<p class="px-2 pt-3 pb-1 text-xs font-bold tracking-widest text-slate-500 uppercase">
					{place.panel.name}
				</p>
				{#each place.groups as group, index (group.id)}
					{@const here = isHere(group.id)}
					<Button
						unstyled
						class="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-primary/[0.06] disabled:opacity-40"
						disabled={here}
						aria-label="Move to {group.title || `${place.panel.name} ${place.word} ${index + 1}`}"
						onclick={() => moveTo(group.id, group.title || `the ${place.word}`)}
					>
						<span
							class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
							><span class="icon-[mdi--image-multiple-outline] size-5"></span></span
						>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-semibold text-slate-900"
								>{group.title || `Untitled ${place.word}`}</span
							>
							{#if here || !group.photos.length}
								<span class="block text-xs text-slate-500"
									>{here
										? photos.length === 1
											? 'It is here'
											: 'They are here'
										: countLabelOf(group.photos)}</span
								>
							{:else}
								<!-- #350: what it holds, as the group's own header shows it. -->
								<span class="mt-0.5 flex"><FileCounts count={countsOfPhotos(group.photos)} /></span>
							{/if}
						</span>
						<span class="icon-[mdi--chevron-right] size-5 shrink-0 text-slate-300"></span>
					</Button>
				{/each}
			{:else}
				<p class="px-2 py-6 text-center text-sm text-slate-400">No stage or group by that name.</p>
			{/each}
		</div>
	</Dialog>
{/if}
