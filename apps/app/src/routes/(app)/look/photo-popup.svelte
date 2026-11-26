<script
	lang="ts"
	module
>
	/** What the pop-up opens on: looking, cropping or typing the description. */
	export type PopupModeType = 'view' | 'crop' | 'text';
</script>

<script lang="ts">
	// #312: a photo opened from its group in an edit panel, as Justin signed it off in the prototype (#286): the whole
	// screen on a phone, a box in the middle of the window over the dimmed app from tablet width up, the same tools in
	// both. The X leaves without saving; Save shows while cropping or typing and keeps the change, as Enter in the
	// description does. The group's photos sit side by side on a strip to swipe through, with the photo slider's dots
	// under them (on a desktop also arrows either side of the dots, and the arrow keys); the ends do not wrap. Crop is
	// the photo component's crop (lib/components/photo) in a frame of the photo's own shape, with a zoom slider in place of the dots;
	// Text edits the description over the photo's bottom left; Reset brings back the whole photo, as a change that
	// waits for Save; More holds Delete, which asks first and moves on to the next photo (the last one closes).
	// #376: More is the library's Menu, with Delete as its red choice; it opens over the pop-up, as every menu does.
	// #343: the i at the top right opens the Details under the photo: the file as it arrived beside the file the app
	// kept (type, size, pixel size), how much smaller it got, and whether its metadata came across. They follow the
	// photo open as the strip is swiped; a PDF or a video says what its own file is. Justin's ask (2026-11-26): when
	// and where it was taken come first, and under the rest every metadata field the original had, group by group,
	// to read through or copy out whole; the Details scroll on their own when they run long.
	import { tick, untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { MediaQuery } from 'svelte/reactivity';
	import { fade } from 'svelte/transition';
	import Photo from '#lib/components/photo/photo.svelte';
	import type { CropType, SizeType } from '#lib/components/photo/photo.types.js';
	import { isWhole, toCrop } from '#lib/components/photo/photo.utils.js';
	import {
		ATTACHMENT_NOUNS,
		type FileFactsType,
		toCarriedLabel,
		toFieldGroups,
		toFieldText,
		toFileId,
		toMapLink,
		toPlaceLabel,
		toSizeLabel,
		toSmallerPercent,
		toTakenFromLabel,
		toTypeLabel
	} from '#lib/files/files.schema.js';
	import { fieldListOf, fileDetailsOf } from '#lib/files/files.state.svelte.js';
	import { toLengthLabel, toVideoLink } from '#lib/video/video.utils.js';
	import Dots from './dots.svelte';
	import type { GroupType, PhotoType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import { Button, Menu, type MenuOptionType } from '@layerd/ui';

	let {
		look,
		group,
		id,
		mode: firstMode = 'view',
		word,
		onsave,
		onclose
	}: {
		look: LookState;
		group: GroupType;
		/** The photo it opens on. */
		id: string;
		mode?: PopupModeType;
		/** "stage" or "group", for the question before a delete. */
		word: string;
		onsave: () => void;
		onclose: () => void;
	} = $props();

	// The room between the photos on the strip; in crop mode the frame stands in from the stage's edge, so a finger can
	// take hold of a corner or an edge.
	const GAP = 24;
	const INSET = 28;
	const SLIDE_MS = 300;

	let openId = $state(untrack(() => id));
	let mode = $state<PopupModeType>(untrack(() => firstMode));
	// Cropping or typing works on a copy of the photo's crop and description, kept only on Save.
	let draft = $state<{ crop?: CropType; words: string } | null>(null);
	let moreBox = $state<HTMLElement>();
	let isDetailsOpen = $state(false);
	let copiedAt = $state(0);
	let savedAt = $state(0);
	let stageWidth = $state(0);
	let stageHeight = $state(0);
	let offset = $state(0);
	let isGliding = $state(false);
	let isStepping = false;
	let shapes = $state<Record<string, SizeType | undefined>>({});
	let photoRef = $state<ReturnType<typeof Photo>>();

	const photos = $derived(group.photos);
	const index = $derived(photos.findIndex((photo) => photo.id === openId));
	const photo = $derived<PhotoType | undefined>(photos[index]);
	const crop = $derived(draft ? draft.crop : photo?.crop);
	const percent = $derived(Math.round((crop?.zoom ?? 1) * 100));
	// #343: the file the Details are about: a photo's own, or a PDF's or a video's (not the picture made of it).
	const detailsAddress = $derived(photo ? (photo.kind ? (photo.source ?? '') : photo.src) : '');
	const details = $derived(isDetailsOpen ? fileDetailsOf(detailsAddress) : undefined);
	const smaller = $derived(details ? toSmallerPercent(details.original, details.saved) : undefined);
	// Every field the original had, read only once the Details are open on a file that kept them.
	const fields = $derived(details?.hasFieldList ? fieldListOf(detailsAddress) : undefined);
	const fieldGroups = $derived(toFieldGroups(fields ?? undefined));
	const fieldCount = $derived(fieldGroups.reduce((count, each) => count + each.fields.length, 0));
	// The photo open, and while looking the one either side of it, waiting just off the stage.
	const slides = $derived.by(() => {
		const wheres = mode === 'view' ? [-1, 0, 1] : [0];
		return wheres.flatMap((where) => {
			const each = photos[index + where];
			return each ? [{ where, photo: each }] : [];
		});
	});

	untrack(() => {
		if (firstMode !== 'view') startDraft();
	});

	// The pop-up closes once its photo has gone.
	$effect(() => {
		if (!photo) onclose();
	});

	// The photo's frame: its own shape, as big as the stage allows.
	function frameOf(each: PhotoType, isHere: boolean) {
		const inset = isHere && mode === 'crop' ? INSET : 0;
		const room = {
			width: Math.max(0, stageWidth - inset * 2),
			height: Math.max(0, stageHeight - inset * 2)
		};
		const shape = shapes[each.id];
		if (!shape) return room;
		const scale = Math.min(room.width / shape.width, room.height / shape.height);
		return { width: shape.width * scale, height: shape.height * scale };
	}

	// A file's facts on one line: its size and pixel size, or what was not recorded.
	function factsOf(facts: FileFactsType) {
		const size = toSizeLabel(facts.size) || 'Size not recorded';
		return facts.width && facts.height ? `${size} · ${facts.width} × ${facts.height}` : size;
	}

	// When it was taken, in the viewer's own time.
	function takenAtOf(at: string | undefined) {
		return at
			? new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' })
			: '';
	}

	// Every field as plain text, onto the clipboard; "Copied" shows for a moment.
	async function copyFields() {
		await navigator.clipboard.writeText(toFieldText(fieldGroups));
		copiedAt = Date.now();
		setTimeout(() => {
			if (Date.now() - copiedAt >= 1900) copiedAt = 0;
		}, 2000);
	}

	// How much smaller it got, in words.
	function smallerOf(percent: number | undefined) {
		if (percent === undefined) return 'Not recorded';
		if (percent === 0) return 'Same size';
		return percent > 0 ? `${percent}% smaller` : `${-percent}% bigger`;
	}

	function startDraft() {
		if (draft || !photo) return;
		draft = { crop: photo.crop ? { ...photo.crop } : undefined, words: photo.description };
	}

	// Crop and Text are two tabs of one edit: moving between them keeps what was done in the other.
	function choose(next: 'crop' | 'text') {
		isDetailsOpen = false;
		startDraft();
		mode = next;
	}

	function save() {
		if (!draft || !photo) return;
		photo.crop = toCrop(draft.crop);
		photo.description = draft.words;
		draft = null;
		mode = 'view';
		savedAt = Date.now();
		onsave();
	}

	// Reset brings back the whole photo, as a change that waits for Save; from looking, it starts cropping.
	async function reset() {
		if (mode !== 'crop') {
			startDraft();
			mode = 'crop';
			await tick();
		}
		photoRef?.reset();
	}

	// Moves on to the next photo (1) or back (-1): the strip slides, then the new photo is the open one. With nowhere
	// to go, the strip slides back.
	function stepTo(by: number) {
		if (isStepping || mode !== 'view') return;
		const next = by ? photos[index + by] : undefined;
		isGliding = true;
		offset = next ? -by * (stageWidth + GAP) : 0;
		isStepping = Boolean(next);
		setTimeout(() => {
			isGliding = false;
			if (!next) return;
			isStepping = false;
			openId = next.id;
			offset = 0;
		}, SLIDE_MS);
	}

	function askDelete() {
		const gone = photo;
		if (!gone) return;
		look.confirm({
			title: `Delete ${ATTACHMENT_NOUNS[gone.kind ?? 'photo']}?`,
			note: `It leaves the ${word} and the report.`,
			onyes: () => {
				const at = group.photos.findIndex((each) => each.id === gone.id);
				if (at < 0) return;
				group.photos.splice(at, 1);
				const next = group.photos[at] ?? group.photos[at - 1];
				draft = null;
				mode = 'view';
				onsave();
				if (next) openId = next.id;
			}
		});
	}

	// A click beside the desktop box closes it, unless a change is waiting for Save.
	function dim() {
		if (!draft) onclose();
	}

	// Swiping while looking: past a fifth of the width, or a quick flick, goes on; anything less slides back.
	let swipe: {
		pointerId: number;
		x: number;
		y: number;
		way: '' | 'side' | 'down';
		trail: { time: number; x: number }[];
	} | null = null;

	function onpointerdown(event: PointerEvent) {
		if (mode !== 'view' || isStepping || isMoreOpen() || swipe) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		if ((event.target as HTMLElement).closest('button, input, textarea')) return;
		try {
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		} catch {
			// A pointer already gone cannot be held.
		}
		isGliding = false;
		swipe = {
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			way: '',
			trail: [{ time: event.timeStamp, x: event.clientX }]
		};
	}

	function onpointermove(event: PointerEvent) {
		if (!swipe || event.pointerId !== swipe.pointerId) return;
		const dx = event.clientX - swipe.x;
		const dy = event.clientY - swipe.y;
		if (!swipe.way) {
			if (Math.hypot(dx, dy) < 6) return;
			swipe.way = Math.abs(dx) >= Math.abs(dy) ? 'side' : 'down';
		}
		if (swipe.way !== 'side') return;
		const isEnd = (dx > 0 && index === 0) || (dx < 0 && index === photos.length - 1);
		offset = isEnd ? dx * 0.3 : dx;
		swipe.trail.push({ time: event.timeStamp, x: event.clientX });
		if (swipe.trail.length > 6) swipe.trail.shift();
	}

	function onpointerup(event: PointerEvent) {
		if (!swipe || event.pointerId !== swipe.pointerId) return;
		const { trail, way } = swipe;
		swipe = null;
		if (way !== 'side') return;
		const first = trail[0];
		const last = trail[trail.length - 1];
		const speed = last.time > first.time ? (last.x - first.x) / (last.time - first.time) : 0;
		let by = 0;
		if (offset < -stageWidth * 0.2 || (offset < -24 && speed < -0.35)) by = 1;
		else if (offset > stageWidth * 0.2 || (offset > 24 && speed > 0.35)) by = -1;
		stepTo(by);
	}

	// More's menu, while it is open, has the keys: Escape shuts it (the menu does that itself) and the pop-up stays.
	function isMoreOpen() {
		return Boolean(moreBox?.querySelector('[aria-expanded="true"]'));
	}

	// Escape leaves without saving; the arrow keys move between photos. A question on top (the delete) and More's
	// open menu keep their own keys.
	function onkeydown(event: KeyboardEvent) {
		if (look.asking || isMoreOpen()) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			onclose();
			return;
		}
		const isTyping = (event.target as HTMLElement | null)?.closest?.('input, textarea');
		if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !isTyping) {
			event.preventDefault();
			stepTo(event.key === 'ArrowLeft' ? -1 : 1);
		}
	}

	// It opens in the browser's top layer, as every sheet does, so it covers the floating bar; Safari 16 has no
	// popovers and keeps it on top by its z-index. The page behind does not scroll under it; the Details scroll.
	const lift: Attachment<HTMLElement> = (node) => {
		node.showPopover?.();
		const hold = (event: WheelEvent) => {
			if (!(event.target as Element | null)?.closest?.('[data-scroll]')) event.preventDefault();
		};
		node.addEventListener('wheel', hold, { passive: false });
		return () => node.removeEventListener('wheel', hold);
	};

	// The description grows with what is typed, and opens with the cursor at its end.
	function fit(area: HTMLTextAreaElement) {
		area.style.height = 'auto';
		area.style.height = `${area.scrollHeight}px`;
	}

	const focusWords: Attachment<HTMLTextAreaElement> = (area) => {
		fit(area);
		area.focus({ preventScroll: true });
		area.setSelectionRange(area.value.length, area.value.length);
	};

	const TOOLS = [
		{ id: 'crop', label: 'Crop', icon: 'icon-[mdi--crop]' },
		{ id: 'text', label: 'Text', icon: 'icon-[mdi--pencil-outline]' },
		{ id: 'reset', label: 'Reset', icon: 'icon-[mdi--restore]' }
	] as const;

	// #327: a PDF's pages print whole and a video is not cropped yet, so either has its description alone.
	const tools = $derived(photo?.kind ? TOOLS.filter((tool) => tool.id === 'text') : TOOLS);

	function pick(tool: (typeof TOOLS)[number]['id']) {
		if (tool === 'reset') reset();
		else choose(tool);
	}

	const MORE: MenuOptionType[] = [
		{ id: 'delete', label: 'Delete', icon: 'icon-[mdi--trash-can-outline]', isDanger: true }
	];
	// Its list opens over More, from More's right edge on a phone and its left edge on a wider screen, as it always has.
	const wide = new MediaQuery('min-width: 48rem');

	const toolClass =
		'flex w-[76px] flex-col items-center gap-[3px] rounded-[14px] pt-[7px] pb-1.5 text-[11px] font-semibold text-slate-300 transition disabled:opacity-30 md:h-11 md:w-auto md:flex-row md:gap-2 md:rounded-full md:px-[18px] md:py-0 md:text-sm md:enabled:hover:text-white';
</script>

<svelte:window {onkeydown} />

<div
	popover="manual"
	class="fixed z-[110] m-0 size-full max-h-none max-w-none overflow-visible border-0 bg-transparent p-0 text-white"
	style="inset: 0"
	{@attach lift}
>
	<button
		type="button"
		class="fixed inset-0 hidden cursor-default bg-slate-900/60 md:block"
		aria-label="Close"
		tabindex="-1"
		onclick={dim}
		transition:fade={{ duration: 180 }}
	></button>
	<div
		class="fixed inset-0 flex flex-col bg-[#05070b] md:inset-auto md:top-1/2 md:left-1/2 md:h-[min(812px,calc(100dvh-48px))] md:w-[min(1040px,calc(100vw-48px))] md:-translate-x-1/2 md:-translate-y-1/2 md:overflow-hidden md:rounded-3xl md:shadow-[0_30px_80px_-20px_rgb(0_0_0/0.7)]"
		role="dialog"
		aria-modal="true"
		aria-label="Photo"
		transition:fade={{ duration: 180 }}
	>
		<div
			class="box-content flex h-14 shrink-0 items-center justify-between px-2 pt-[env(safe-area-inset-top)] md:h-16 md:px-2.5 md:pt-0"
		>
			<Button
				ghost
				invert
				lg
				icon="icon-[mdi--close]"
				aria-label="Close without saving"
				title="Close without saving"
				onclick={onclose}
			/>
			{#if draft}
				<Button
					primary
					heavy
					sm
					icon="icon-[mdi--check]"
					label="Save"
					onclick={save}
				/>
			{:else}
				<div class="flex items-center">
					{#if savedAt}
						{#key savedAt}
							<span
								class="saved flex h-10 items-center gap-1.5 px-2.5 text-[15px] font-semibold text-emerald-400"
								role="status"><span class="icon-[mdi--check] size-5"></span>Saved</span
							>
						{/key}
					{/if}
					<Button
						ghost
						invert
						md
						icon="icon-[mdi--information-outline]"
						iconToggle="icon-[mdi--information]"
						toggled={isDetailsOpen}
						aria-label="Details"
						title="Details"
						aria-pressed={isDetailsOpen}
						onclick={() => (isDetailsOpen = !isDetailsOpen)}
					/>
				</div>
			{/if}
		</div>

		<!-- The swipe is for a finger or the mouse; the keys and the arrow buttons move between photos too. -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="relative min-h-0 flex-1 touch-none overflow-hidden md:mx-6"
			bind:clientWidth={stageWidth}
			bind:clientHeight={stageHeight}
			{onpointerdown}
			{onpointermove}
			{onpointerup}
			onpointercancel={onpointerup}
		>
			<div
				class="absolute inset-0 will-change-transform {isGliding
					? 'transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]'
					: ''}"
				style:transform="translateX({offset}px)"
			>
				{#each slides as slide (slide.photo.id)}
					{@const isHere = slide.where === 0}
					{@const frame = frameOf(slide.photo, isHere)}
					<div
						class="absolute inset-0 flex justify-center {isHere && mode === 'text'
							? 'items-start pt-4 md:items-center md:pt-0'
							: 'items-center'}"
						style:transform="translateX(calc({slide.where * 100}% + {slide.where * GAP}px))"
					>
						<Photo
							class="shrink-0 transition-opacity {shapes[slide.photo.id] ? '' : 'opacity-0'}"
							style="width: {frame.width}px; height: {frame.height}px"
							src={slide.photo.src}
							alt={slide.photo.description}
							cropping={isHere && mode === 'crop'}
							bind:crop={
								() => (isHere && draft ? draft.crop : slide.photo.crop),
								(value) => {
									if (isHere && draft) draft.crop = value;
								}
							}
							bind:shape={shapes[slide.photo.id]}
							bind:this={
								() => (isHere ? photoRef : undefined),
								(ref) => {
									if (isHere) photoRef = ref;
								}
							}
						>
							{#if isHere && mode === 'text' && draft}
								<div
									class="absolute inset-x-0 bottom-0 z-[4] bg-linear-to-t from-black/75 via-black/40 to-transparent px-3.5 pt-9 pb-3"
								>
									<textarea
										rows="1"
										class="-mx-[7px] -my-[5px] block min-h-7 w-[76%] resize-none overflow-hidden rounded-lg border-[1.5px] border-dashed border-white/75 bg-black/20 px-1.5 py-1 text-[15px] leading-snug font-medium text-white outline-none placeholder:text-white/65"
										placeholder="Describe this photo"
										aria-label="Description"
										bind:value={draft.words}
										oninput={(event) => fit(event.currentTarget)}
										onkeydown={(event) => {
											if (event.key === 'Enter' && !event.shiftKey) {
												event.preventDefault();
												save();
											}
										}}
										{@attach focusWords}></textarea>
								</div>
							{:else if !(isHere && mode === 'crop') && slide.photo.description}
								<div
									class="pointer-events-none absolute inset-x-0 bottom-0 z-[4] bg-linear-to-t from-black/75 via-black/40 to-transparent px-3.5 pt-9 pb-3 text-[15px] leading-snug font-medium"
								>
									<span class="block max-w-[76%]">{slide.photo.description}</span>
								</div>
							{/if}
						</Photo>
					</div>
				{/each}
			</div>
		</div>

		{#if isDetailsOpen && mode === 'view' && photo}
			<!-- #343: what the file was and became. -->
			<section
				class="mx-2.5 mt-2 max-h-[45dvh] shrink-0 overflow-y-auto overscroll-contain rounded-2xl bg-white/[0.07] p-3 text-[13px] text-slate-300 md:mx-auto md:max-h-[42vh] md:w-full md:max-w-2xl md:p-4"
				aria-label="Details"
				data-scroll
				transition:fade={{ duration: 150 }}
			>
				{#if detailsAddress.startsWith('blob:')}
					<p>The details show once it has uploaded.</p>
				{:else if !toFileId(detailsAddress)}
					<p>Details are kept for files added to a project. This one came with the sample.</p>
				{:else if details === null}
					<p>No details were kept for this file.</p>
				{:else if !details}
					<p class="flex items-center gap-2">
						<span class="icon-[svg-spinners--ring-resize] size-4 text-slate-400"></span>Reading the
						details
					</p>
				{:else}
					{@const isKept =
						details.original.type === details.saved.type &&
						details.original.size === details.saved.size}
					{@const place = toPlaceLabel(details.taken)}
					<p class="mb-2 truncate font-semibold text-white">{details.name}</p>
					<dl class="mb-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
						<dt class="text-slate-400">Taken</dt>
						<dd class="font-semibold text-white tabular-nums">
							{takenAtOf(details.taken.at) || 'Not recorded'}
						</dd>
						<dt class="text-slate-400">Place</dt>
						<dd class="font-semibold text-white tabular-nums">
							{#if place}
								<a
									class="underline decoration-white/40 underline-offset-2 hover:decoration-white"
									href={toMapLink(details.taken)}
									target="_blank"
									rel="noopener noreferrer">{place}</a
								>
							{:else}
								Not recorded
							{/if}
						</dd>
						{#if toTakenFromLabel(details.taken.from)}
							<dt class="text-slate-400">From</dt>
							<dd class="text-white">{toTakenFromLabel(details.taken.from)}</dd>
						{/if}
					</dl>
					<div class="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
						<div class="min-w-0 rounded-xl bg-white/[0.06] px-3 py-2.5">
							<p class="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
								As it arrived
							</p>
							<p class="mt-0.5 font-bold text-base text-white">
								{toTypeLabel(details.original.type) || 'Unknown'}
							</p>
							<p class="tabular-nums">{factsOf(details.original)}</p>
						</div>
						<span class="icon-[mdi--arrow-right] size-5 self-center text-slate-500"></span>
						<div class="min-w-0 rounded-xl bg-white/[0.06] px-3 py-2.5">
							<p class="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
								As it was saved
							</p>
							<p class="mt-0.5 font-bold text-base text-white">{toTypeLabel(details.saved.type)}</p>
							<p class="tabular-nums">{factsOf(details.saved)}</p>
						</div>
					</div>
					<dl class="mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
						<dt class="text-slate-400">Size</dt>
						<dd class="font-semibold text-white">
							{isKept ? 'Kept as it came' : smallerOf(smaller)}
						</dd>
						{#if photo.kind === 'pdf'}
							<dt class="text-slate-400">Pages</dt>
							<dd class="font-semibold text-white">{photo.pageCount ?? 1}</dd>
						{:else if photo.kind === 'video'}
							<dt class="text-slate-400">Length</dt>
							<dd class="font-semibold text-white">
								{toLengthLabel(photo.duration) || 'Not read'}
							</dd>
						{:else}
							<dt class="text-slate-400">Metadata</dt>
							<dd class="font-semibold text-white">
								{toCarriedLabel(details.carried, details.hasFieldList)}{details.isOriginalKept
									? ', and the original is kept too'
									: ''}
							</dd>
						{/if}
					</dl>
					{#if details.hasFieldList}
						<div class="mt-3 border-t border-white/10 pt-3">
							<div class="flex min-h-8 items-center justify-between gap-2">
								<p class="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
									Every metadata field{fields ? ` · ${fieldCount}` : ''}
								</p>
								{#if fieldCount}
									<Button
										ghost
										invert
										xs
										icon={copiedAt ? 'icon-[mdi--check]' : 'icon-[mdi--content-copy]'}
										label={copiedAt ? 'Copied' : 'Copy all'}
										onclick={copyFields}
									/>
								{/if}
							</div>
							{#if fields === undefined}
								<p class="mt-1 flex items-center gap-2">
									<span class="icon-[svg-spinners--ring-resize] size-4 text-slate-400"
									></span>Reading the fields
								</p>
							{:else if !fieldCount}
								<p class="mt-1">The original had none.</p>
							{:else}
								{#each fieldGroups as group (group.name)}
									<h3 class="mt-3 mb-1 font-semibold text-white">
										{group.name}
										<span class="font-normal text-slate-400 tabular-nums"
											>{group.fields.length}</span
										>
									</h3>
									<dl
										class="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-3 gap-y-0.5 md:grid-cols-[13rem_minmax(0,1fr)]"
									>
										{#each group.fields as field (field.name)}
											<dt class="wrap-anywhere text-slate-400">{field.name}</dt>
											<dd class="wrap-anywhere text-white">{field.value}</dd>
										{/each}
									</dl>
								{/each}
							{/if}
						</div>
					{/if}
				{/if}
			</section>
		{/if}

		<div
			class="relative shrink-0 px-2.5 pt-1 pb-[max(16px,env(safe-area-inset-bottom))] md:px-5 md:pb-5"
		>
			<div class="flex h-9 items-center justify-center">
				{#if mode === 'crop'}
					<label
						class="flex flex-1 items-center gap-2.5 px-3.5 text-xs text-slate-300 tabular-nums md:max-w-md"
					>
						<span>100%</span>
						<input
							type="range"
							min="100"
							max="500"
							step="1"
							value={percent}
							class="min-w-0 flex-1 touch-pan-x accent-white"
							aria-label="Zoom"
							oninput={(event) => photoRef?.zoomTo(Number(event.currentTarget.value) / 100)}
						/>
						<b class="min-w-10 text-right text-white">{percent}%</b>
					</label>
				{:else if mode === 'view' && photos.length > 1}
					<div class="flex items-center justify-center gap-4">
						<span class="hidden md:contents">
							<Button
								ghost
								invert
								md
								icon="icon-[mdi--chevron-left]"
								aria-label="Previous photo"
								title="Previous photo"
								disabled={index === 0}
								onclick={() => stepTo(-1)}
							/>
						</span>
						<Dots
							at={index}
							count={photos.length}
						/>
						<span class="hidden md:contents">
							<Button
								ghost
								invert
								md
								icon="icon-[mdi--chevron-right]"
								aria-label="Next photo"
								title="Next photo"
								disabled={index === photos.length - 1}
								onclick={() => stepTo(1)}
							/>
						</span>
					</div>
				{/if}
			</div>
			<div class="flex justify-around md:justify-center md:gap-2">
				{#each tools as tool (tool.id)}
					<button
						type="button"
						class="{toolClass} {mode === tool.id ? 'bg-white/14 text-white' : ''}"
						aria-pressed={tool.id === 'reset' ? undefined : mode === tool.id}
						disabled={tool.id === 'reset' && isWhole(crop)}
						onclick={() => pick(tool.id)}
						><span class="{tool.icon} size-6 md:size-5"></span><span>{tool.label}</span></button
					>
				{/each}
				<!-- #327: a PDF opens whole in the browser; a video plays in the app's player. -->
				{#if photo?.kind && photo.source}
					<a
						class={toolClass}
						href={photo.kind === 'video'
							? toVideoLink(location.origin, photo.source) || photo.source
							: photo.source}
						target="_blank"
						rel="noopener"
						><span
							class="{photo.kind === 'video'
								? 'icon-[mdi--play-circle-outline]'
								: 'icon-[mdi--open-in-new]'} size-6 md:size-5"
						></span><span>{photo.kind === 'video' ? 'Play' : 'Open'}</span></a
					>
				{/if}
				<div bind:this={moreBox}>
					<Menu
						label="More"
						value=""
						options={MORE}
						align={wide.current ? 'left' : 'right'}
						opens="up"
						onpick={(choice) => choice === 'delete' && askDelete()}
					>
						{#snippet trigger(_, isOpen)}
							<span class="{toolClass} md:hover:text-white {isOpen ? 'bg-white/14 text-white' : ''}"
								><span class="icon-[mdi--dots-vertical] size-6 md:size-5"></span><span>More</span
								></span
							>
						{/snippet}
					</Menu>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.saved {
		animation: saved-fade 1.8s ease forwards;
	}

	@keyframes saved-fade {
		0%,
		65% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}
</style>
