<script
	lang="ts"
	module
>
	/** What the pop-up opens on: the crop (`view` too, since #295), or typing the description. */
	export type PopupModeType = 'view' | 'crop' | 'text';
</script>

<script lang="ts">
	// #312: an attachment opened from its stage in an edit panel: the whole screen on a phone, a box in the middle of
	// the window over the dimmed app from tablet width up, the same tools in both.
	// #295 (Justin, 2026-11-25, round 5 of the prototype, and 2026-11-27): it opens on the crop, the whole picture with
	// its frame over it, the frame's corners and edges in view. Dragging a corner or an edge grows or shrinks the frame
	// from its middle (edit.ts `draggedFrame`); dragging inside it moves it. At the top, in its true middle, Rotate and
	// Flip, then All pages for a PDF of more than one page (on, a change goes to every page; off, to the page on
	// screen), else where it is; a back arrow on the left until something changes, then the X (leave without saving);
	// on the right the i, the ⋮ and, once something changes, the ✓ (keep every change and close). With All pages on,
	// the picture is the PDF's pages stacked as selected photos are (#402), the page on screen on top in blue and the
	// next ones peeking out under it, a tap on one bringing it up (Justin, 2026-11-28: "make the display of it do the
	// stacking"). Under the picture the stage's attachments on a strip. A PDF there, with All pages on, is one box of
	// its pages side by side, the page on screen in blue; with All pages off it is the page on screen alone, and a
	// swipe or an arrow key goes through its pages one by one before the next attachment. Then the frame's shapes in
	// one row: the stage's when it sets one, Free, Original (the whole picture), 16:9, 9:16, 1:1, 4:3; the straighten
	// dial, undo and redo either side of it once there is something to step to; and the tools, Crop, Text and Reset
	// in the middle, Reset always there and dimmed until something changes. The ⋮ holds Open the PDF or Play the
	// video, Pop out (on pages of its own, 1, 2 or 4 to a page) and Delete, which asks first and moves on to the next
	// one. Nothing is made of the picture: what is changed is kept as numbers (edit.ts), and the report draws the
	// picture with them.
	// #354 (Justin, 2026-11-27): the Email Signature's photo and banners open here too, "that same photo editor", with
	// only what a picture alone needs (`isPictureOnly`): no Text, no Pop out and no Details, Delete still in the ⋮. A
	// signature's photo shows its circle over the crop (`isRound`).
	// #343: the i at the top opens the Details under the picture: the file as it arrived beside the file the app kept
	// (type, size, pixel size), how much smaller it got, and whether its metadata came across. They follow the
	// attachment open; a PDF or a video says what its own file is. When and where it was taken come first, and under
	// the rest every metadata field the original had, group by group, to read through or copy out whole; the Details
	// scroll on their own when they run long.
	import { tick, untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { MediaQuery } from 'svelte/reactivity';
	import { fade } from 'svelte/transition';
	import Picture from '#lib/components/photo/picture.svelte';
	import {
		ATTACHMENT_ICONS,
		ATTACHMENT_NOUNS,
		type FileFactsType,
		isPlaceRemoved,
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
	import { pagePictureOf } from '#lib/pdf/pdf.state.svelte.js';
	import { toLengthLabel, toVideoLink } from '#lib/video/video.utils.js';
	import {
		CROP_RATIOS,
		centredFrame,
		cleanEdit,
		draggedFrame,
		editOf,
		frameOf,
		hasEdit,
		isWholeFrame,
		lockedAspectOf,
		RATIO_VALUES,
		RATIOS,
		ratioOf,
		fitOf,
		stageAspectOf,
		tiltCover,
		turnedAspect,
		type CropRatioType,
		type EditType,
		type FrameType,
		type HandleType
	} from './attachments';
	import type { GroupType, PhotoType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import { pictureAspectOf } from './shapes';
	import { Button, Menu, type MenuOptionType } from '@layerd/ui';

	let {
		look,
		group,
		id,
		mode: firstMode = 'view',
		word,
		noun = undefined,
		deleteNote = undefined,
		isPictureOnly = false,
		isRound = false,
		onsave,
		onclose
	}: {
		look: LookState;
		group: GroupType;
		/** The attachment it opens on. */
		id: string;
		mode?: PopupModeType;
		/** "stage" or "group", for the question before a delete. */
		word: string;
		/** What one is called, in place of its kind ("banner"). */
		noun?: string;
		/** What the question before a delete says happens. */
		deleteNote?: string;
		/** Only the picture is edited: no description, no pop-out and no Details. */
		isPictureOnly?: boolean;
		/** It shows in a circle: the circle is drawn over the crop. */
		isRound?: boolean;
		onsave: () => void;
		onclose: () => void;
	} = $props();

	// Room kept round the picture for the frame's grips; the room between attachments as the picture slides on; how
	// far the dial's lines are apart, a degree to each.
	const PAD = 24;
	const GAP = 24;
	// A PDF's pages stacked with All pages on: how far each page under the one on screen peeks out, and the room kept
	// round the stack for them.
	const STACK_STEP = 18;
	const STACK_ROOM = 26;
	const SLIDE_MS = 260;
	const DEG = 6;

	const items = $derived(group.photos);

	// Everything the pop-up changes, for every attachment of the stage, worked on as a copy: the ✓ keeps it, the X
	// leaves it. Undo and redo step through it. A PDF's pages each have their own edit here.
	type WorkType = { edit: EditType; pages: EditType[]; words: string; ownLayout: number };

	function copyOf<T>(value: T): T {
		return value === undefined ? value : JSON.parse(JSON.stringify(value));
	}

	function workOf(photo: PhotoType): WorkType {
		const count = photo.kind === 'pdf' ? Math.max(1, photo.pageCount ?? 1) : 0;
		return {
			edit: copyOf(editOf(photo)),
			pages: Array.from({ length: count }, (_, at) => copyOf(editOf(photo, at + 1))),
			words: photo.description,
			ownLayout: photo.ownLayout ?? 0
		};
	}

	let work = $state<Record<string, WorkType>>(
		untrack(() => Object.fromEntries(group.photos.map((photo) => [photo.id, workOf(photo)])))
	);
	// Each attachment's work as it opened, to tell what was changed.
	let opened = untrack(() =>
		Object.fromEntries(Object.entries(work).map(([key, each]) => [key, JSON.stringify(each)]))
	);
	let history = $state<string[]>([]);
	let future = $state<string[]>([]);
	const isEdited = $derived(
		Object.entries(work).some(([key, each]) => JSON.stringify(each) !== opened[key])
	);

	let openId = $state(untrack(() => id));
	let pageAt = $state(0);
	let isAllPages = $state(true);
	let tool = $state<'crop' | 'text'>(untrack(() => (firstMode === 'text' ? 'text' : 'crop')));
	let moreBox = $state<HTMLElement>();
	let isDetailsOpen = $state(false);
	let copiedAt = $state(0);
	let stageWidth = $state(0);
	let stageHeight = $state(0);
	let offset = $state(0);
	let isGliding = $state(false);
	let isTyping = false;

	const index = $derived(items.findIndex((each) => each.id === openId));
	const photo = $derived<PhotoType | undefined>(items[index]);
	const isPdf = $derived(photo?.kind === 'pdf');
	const pageCount = $derived(isPdf ? Math.max(1, photo?.pageCount ?? 1) : 1);
	const isStacked = $derived(isPdf && isAllPages && pageCount > 1);
	const room = $derived(PAD + (isStacked ? STACK_ROOM : 0));
	const mine = $derived(photo ? work[photo.id] : undefined);
	// The edit on screen: the PDF page's own, or the attachment's.
	const current = $derived<EditType>(mine ? (isPdf ? (mine.pages[pageAt] ?? {}) : mine.edit) : {});
	// The attachment with what is changed so far, for what the stage gives its frame.
	const placed = $derived(photo && mine ? { kind: photo.kind, ownLayout: mine.ownLayout } : {});
	const aspect = $derived(photo ? pictureAspectOf(photo, pageAt + 1) : 4 / 3);
	const locked = $derived(lockedAspectOf(group, placed, current, aspect));
	const stageAspect = $derived(stageAspectOf(group, placed));

	// #343: the file the Details are about: a photo's own, or a PDF's or a video's (not the picture made of it).
	const detailsAddress = $derived(photo ? (photo.kind ? (photo.source ?? '') : photo.src) : '');
	const details = $derived(isDetailsOpen ? fileDetailsOf(detailsAddress) : undefined);
	const smaller = $derived(details ? toSmallerPercent(details.original, details.saved) : undefined);
	// Every field the original had, read only once the Details are open on a file that kept them.
	const fields = $derived(details?.hasFieldList ? fieldListOf(detailsAddress) : undefined);
	const fieldGroups = $derived(toFieldGroups(fields ?? undefined));
	const fieldCount = $derived(fieldGroups.reduce((count, each) => count + each.fields.length, 0));

	// The pop-up closes once its attachment has gone.
	$effect(() => {
		if (!photo) onclose();
	});

	// ---- What is shown. ----

	/** The picture of an attachment, or of a PDF's page (from 1), drawn here at `width` for a PDF's page. */
	function pictureOf(each: PhotoType, page = 1, width = 1600) {
		if (each.kind !== 'pdf' || !each.source) return each.src;
		return pagePictureOf(each.source, page, width) ?? (page === 1 ? each.src : '');
	}

	function editIn(each: PhotoType, page = 1): EditType {
		const kept = work[each.id];
		if (!kept) return editOf(each, page);
		return each.kind === 'pdf' ? (kept.pages[page - 1] ?? {}) : kept.edit;
	}

	// The crop: the whole picture as it is turned, as big as the room allows inside the room kept for the grips, the
	// frame over it, and the picture straightened about the frame's middle and grown so the frame stays covered.
	const crop = $derived.by(() => {
		if (!photo) return null;
		const turned = turnedAspect(aspect, current);
		const width = Math.max(0, Math.min(stageWidth - room * 2, (stageHeight - room * 2) * turned));
		const height = width / turned;
		const frame = frameOf(current, aspect, locked);
		const tilt = current.tilt ?? 0;
		const turns = current.turns ?? 0;
		const isSideways = turns % 2 !== 0;
		return {
			turned,
			width,
			height,
			frame,
			tilt,
			turns,
			grow: tiltCover(tilt, (frame.w * width) / (frame.h * height || 1)),
			imageWidth: isSideways ? height : width,
			imageHeight: isSideways ? width : height
		};
	});

	// Text: the attachment as it prints, as big as the room allows, its description typed over its foot.
	const printed = $derived.by(() => {
		if (!crop) return null;
		const shape = (crop.frame.w / crop.frame.h) * crop.turned;
		const width = Math.max(0, Math.min(stageWidth - room * 2, (stageHeight - room * 2) * shape));
		return { width, height: width / shape };
	});

	// ---- Changes, kept for undo. ----

	function remember() {
		history.push(JSON.stringify(work));
		future = [];
	}

	// A change to the edit on screen: to every page of a PDF while All pages is on.
	function apply(change: (edit: EditType) => void) {
		if (!mine) return;
		if (!isPdf) change(mine.edit);
		else if (isAllPages) for (const page of mine.pages) change(page);
		else if (mine.pages[pageAt]) change(mine.pages[pageAt]);
	}

	function change(how: (edit: EditType) => void) {
		if (!mine) return;
		remember();
		apply(how);
	}

	function undo() {
		const last = history.pop();
		if (!last) return;
		future.push(JSON.stringify(work));
		work = JSON.parse(last);
	}

	function redo() {
		const next = future.pop();
		if (!next) return;
		history.push(JSON.stringify(work));
		work = JSON.parse(next);
	}

	function rotate() {
		change((edit) => {
			edit.turns = ((edit.turns ?? 0) + 1) % 4;
			edit.frame = undefined;
		});
	}

	function flip() {
		change((edit) => {
			edit.isFlipped = !edit.isFlipped;
			if (edit.frame) edit.frame = { ...edit.frame, x: 1 - edit.frame.x - edit.frame.w };
		});
	}

	// A shape picked for this attachment wins over the stage's; none goes back to the stage's (Justin, 2026-11-27:
	// "I don't ever want to be locked in"). Where the stage sets no shape, Free is where every picture starts, so it is
	// kept as none. Original shows the whole picture again (Justin, 2026-11-27: "if you click original, it would make
	// the crop bounds the full width and height of the image"); any other shape takes the biggest frame of it around
	// the frame's middle; Free leaves the frame as it is, free to drag.
	function pickRatio(ratio: CropRatioType | undefined) {
		if (!photo) return;
		const kept = !stageAspect && ratio === 'free' ? undefined : ratio;
		change((edit) => {
			if (kept) edit.ratio = kept;
			else delete edit.ratio;
			if (kept === 'original') {
				delete edit.frame;
				return;
			}
			const shape = lockedAspectOf(group, placed, { ...edit }, aspect);
			if (shape)
				edit.frame = centredFrame(
					shape / turnedAspect(aspect, edit),
					frameOf({ ...edit }, aspect, shape)
				);
		});
	}

	// Reset brings back the whole picture, as a change that waits for the ✓.
	function reset() {
		change((edit) => {
			for (const key of Object.keys(edit) as (keyof EditType)[]) delete edit[key];
		});
	}

	function setOwnLayout(layout: number) {
		if (!mine || mine.ownLayout === layout) return;
		remember();
		mine.ownLayout = layout;
	}

	// The ✓: every attachment changed takes its changes, then the pop-up closes. One left as it came is not
	// touched, so its crop from before #295 stays as it was for the app on dev.app.
	function save() {
		for (const each of group.photos) {
			const done = work[each.id];
			if (!done || JSON.stringify(done) === opened[each.id]) continue;
			if (each.kind === 'pdf') {
				const pages = done.pages.map(cleanEdit);
				const first = JSON.stringify(pages[0] ?? null);
				const isSame = pages.every((page) => JSON.stringify(page ?? null) === first);
				each.edit = isSame ? pages[0] : undefined;
				each.pageEdits = isSame
					? undefined
					: Object.fromEntries(pages.flatMap((page, at) => (page ? [[String(at + 1), page]] : [])));
			} else each.edit = cleanEdit(done.edit);
			each.description = done.words;
			each.ownLayout = (done.ownLayout || undefined) as PhotoType['ownLayout'];
		}
		onsave();
		onclose();
	}

	// ---- Moving between the stage's attachments: the strip, a swipe, the arrow keys. ----

	// The pages under the one on top of a PDF's stack: the next two after it, from the start again.
	function underOf(top: number, count: number) {
		return [1, 2].filter((step) => step < count).map((step) => (top + step) % count);
	}

	// A tap on the strip changes the page on screen at once; a swipe or an arrow key slides to it.
	function goTo(next: number, page = 0, isSwiped = false) {
		const target = items[next];
		if (!target || isGliding) return;
		if (next === index && (page === pageAt || !isSwiped)) {
			pageAt = page;
			return;
		}
		const by = next > index || (next === index && page > pageAt) ? 1 : -1;
		isGliding = true;
		offset = -by * (stageWidth + GAP);
		setTimeout(() => {
			isGliding = false;
			openId = target.id;
			pageAt = page;
			offset = by * (stageWidth + GAP);
			requestAnimationFrame(() =>
				requestAnimationFrame(() => {
					isGliding = true;
					offset = 0;
					setTimeout(() => (isGliding = false), SLIDE_MS);
				})
			);
		}, SLIDE_MS);
	}

	// The attachment, or the PDF's page, one along (`by` 1) or one back (-1): with All pages off a PDF's pages come one
	// by one first (Justin, 2026-11-27), and one stepped back into is met at its last page. None at either end.
	function stepOf(by: 1 | -1) {
		if (isPdf && !isAllPages) {
			const page = pageAt + by;
			if (page >= 0 && page < pageCount) return { at: index, page };
		}
		const next = items[index + by];
		if (!next) return undefined;
		const isPaged = by < 0 && next.kind === 'pdf' && !isAllPages;
		return { at: index + by, page: isPaged ? Math.max(1, next.pageCount ?? 1) - 1 : 0 };
	}

	function slideBack() {
		isGliding = true;
		offset = 0;
		setTimeout(() => (isGliding = false), SLIDE_MS);
	}

	function askDelete() {
		const gone = photo;
		if (!gone) return;
		look.confirm({
			title: `Delete ${noun ?? ATTACHMENT_NOUNS[gone.kind ?? 'photo']}?`,
			note: deleteNote ?? `It leaves the ${word} and the report.`,
			onyes: () => {
				const at = group.photos.findIndex((each) => each.id === gone.id);
				if (at < 0) return;
				group.photos.splice(at, 1);
				delete work[gone.id];
				delete opened[gone.id];
				const next = group.photos[at] ?? group.photos[at - 1];
				onsave();
				if (next) {
					openId = next.id;
					pageAt = 0;
				}
			}
		});
	}

	// A click beside the desktop box closes it, unless a change waits for the ✓.
	function dim() {
		if (!isEdited) onclose();
	}

	// ---- The picture: a grip or the frame sizes or moves the crop; anywhere else swipes to the next one. ----

	const HANDLES: HandleType[] = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];

	let hold: {
		kind: 'frame' | 'swipe';
		pointerId: number;
		x: number;
		y: number;
		handle?: HandleType;
		start?: FrameType;
		k?: number;
		isMoved: boolean;
		way: '' | 'side' | 'down';
		time: number;
	} | null = null;

	function onstagedown(event: PointerEvent) {
		if (hold || isGliding || isMoreOpen()) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		const target = event.target as HTMLElement;
		if (target.closest('textarea, button, a')) return;
		const handle = target.closest<HTMLElement>('[data-handle]')?.dataset.handle as
			| HandleType
			| undefined;
		try {
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		} catch {
			// A pointer already gone cannot be held.
		}
		const base = {
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			isMoved: false,
			way: '' as const,
			time: event.timeStamp
		};
		if (tool === 'crop' && handle && crop && !(handle === 'move' && isWholeFrame(crop.frame))) {
			remember();
			hold = {
				...base,
				kind: 'frame',
				handle,
				start: { ...crop.frame },
				k: locked ? locked / crop.turned : undefined
			};
			return;
		}
		if (stepOf(1) || stepOf(-1)) hold = { ...base, kind: 'swipe' };
	}

	function onstagemove(event: PointerEvent) {
		if (!hold || event.pointerId !== hold.pointerId) return;
		const dx = event.clientX - hold.x;
		const dy = event.clientY - hold.y;
		if (hold.kind === 'frame' && crop && hold.start && hold.handle) {
			hold.isMoved = true;
			const frame = draggedFrame(
				hold.start,
				hold.handle,
				dx / (crop.width || 1),
				dy / (crop.height || 1),
				hold.k
			);
			apply((edit) => (edit.frame = frame));
			return;
		}
		if (!hold.way) {
			if (Math.hypot(dx, dy) < 8) return;
			hold.way = Math.abs(dx) >= Math.abs(dy) ? 'side' : 'down';
		}
		if (hold.way !== 'side') return;
		hold.isMoved = true;
		const isEnd = !stepOf(dx > 0 ? -1 : 1);
		offset = isEnd ? dx * 0.3 : dx;
	}

	function onstageup(event: PointerEvent) {
		if (!hold || event.pointerId !== hold.pointerId) return;
		const done = hold;
		hold = null;
		if (done.kind === 'frame') {
			if (!done.isMoved) history.pop();
			return;
		}
		if (!done.isMoved) return;
		const speed = offset / Math.max(1, event.timeStamp - done.time);
		const by = offset < -50 || speed < -0.5 ? 1 : offset > 50 || speed > 0.5 ? -1 : 0;
		const step = by ? stepOf(by) : undefined;
		if (step) goTo(step.at, step.page, true);
		else slideBack();
	}

	// ---- The straighten dial: its lines slide under the finger, the mark in the middle stays put. ----

	let dial: { pointerId: number; x: number; tilt: number; isMoved: boolean } | null = null;
	let isTurning = $state(false);

	function ondialdown(event: PointerEvent) {
		if (dial) return;
		event.preventDefault();
		try {
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		} catch {
			// A pointer already gone cannot be held.
		}
		remember();
		dial = {
			pointerId: event.pointerId,
			x: event.clientX,
			tilt: current.tilt ?? 0,
			isMoved: false
		};
		isTurning = true;
	}

	function ondialmove(event: PointerEvent) {
		if (!dial || event.pointerId !== dial.pointerId) return;
		let tilt = Math.min(45, Math.max(-45, dial.tilt - (event.clientX - dial.x) / DEG));
		if (Math.abs(tilt) < 0.75) tilt = 0;
		tilt = Math.round(tilt * 10) / 10;
		dial.isMoved = true;
		apply((edit) => (edit.tilt = tilt || undefined));
	}

	function ondialup(event: PointerEvent) {
		if (!dial || event.pointerId !== dial.pointerId) return;
		if (!dial.isMoved) history.pop();
		dial = null;
		isTurning = false;
	}

	// The dial with the keys: a degree a press, ten with Shift.
	function ondialkey(event: KeyboardEvent) {
		const by = event.key === 'ArrowLeft' ? 1 : event.key === 'ArrowRight' ? -1 : 0;
		if (!by) return;
		event.preventDefault();
		event.stopPropagation();
		const tilt = Math.min(45, Math.max(-45, (current.tilt ?? 0) + by * (event.shiftKey ? 10 : 1)));
		change((edit) => (edit.tilt = tilt || undefined));
	}

	// ---- Details (#343). ----

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

	// ---- Keys, the top layer, the description box. ----

	// More's menu, while it is open, has the keys: Escape shuts it (the menu does that itself) and the pop-up stays.
	function isMoreOpen() {
		return Boolean(moreBox?.querySelector('[aria-expanded="true"]'));
	}

	// Escape leaves when nothing waits for the ✓; the arrow keys move between attachments; Ctrl or Cmd with Z undoes,
	// with Shift too redoes. A question on top (the delete) and More's open menu keep their own keys.
	function onkeydown(event: KeyboardEvent) {
		if (look.asking || isMoreOpen()) return;
		const isInField = (event.target as HTMLElement | null)?.closest?.('input, textarea');
		if (event.key === 'Escape') {
			event.preventDefault();
			if (!isEdited) onclose();
			return;
		}
		if (isInField) return;
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			event.preventDefault();
			const step = stepOf(event.key === 'ArrowLeft' ? -1 : 1);
			if (step) goTo(step.at, step.page, true);
		}
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
			event.preventDefault();
			if (event.shiftKey) redo();
			else undo();
		}
	}

	// It opens in the browser's top layer, as every sheet does, so it covers the floating bar; Safari 16 has no
	// popovers and keeps it on top by its z-index. The page behind does not scroll under it; the Details scroll.
	const lift: Attachment<HTMLElement> = (node) => {
		node.showPopover?.();
		const stop = (event: WheelEvent) => {
			if (!(event.target as Element | null)?.closest?.('[data-scroll]')) event.preventDefault();
		};
		node.addEventListener('wheel', stop, { passive: false });
		return () => node.removeEventListener('wheel', stop);
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

	// The strip keeps the attachment open in view.
	const keepInView: Attachment<HTMLElement> = (node) => {
		$effect(() => {
			void openId;
			void pageAt;
			void tick().then(() =>
				node
					.querySelector('[data-current]')
					?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' })
			);
		});
	};

	// A ratio's shape drawn small on its button: 18 pixels on its longer side, dashed for Free.
	function glyphOf(ratio: string, value?: number) {
		const shape = value ?? (ratio === 'original' ? (crop?.turned ?? 4 / 3) : RATIO_VALUES[ratio]);
		if (!shape) return { width: 16, height: 12 };
		return shape >= 1 ? { width: 18, height: 18 / shape } : { width: 18 * shape, height: 18 };
	}

	// The stage's shape, the first of the ratio buttons when it sets one: its name, and what it is in words.
	const stageShapeName = $derived(`${word.charAt(0).toUpperCase()}${word.slice(1)}`);
	const stageShapeLabel = $derived(
		fitOf(group) === 'fit'
			? `${RATIOS.find(({ id: each }) => each === ratioOf(group))?.label}, the ${word}’s Ratio`
			: `Shaped to fill the ${word}’s page`
	);

	const shownAt = $derived(
		isPdf && pageCount > 1
			? `Page ${pageAt + 1} of ${pageCount}`
			: items.length > 1
				? `${index + 1} of ${items.length}`
				: ''
	);

	// What Open or Play in the ⋮ opens: the PDF, or the video played in the app.
	const openLink = $derived(
		photo?.kind && photo.source
			? photo.kind === 'video'
				? toVideoLink(location.origin, photo.source) || photo.source
				: photo.source
			: ''
	);

	const DELETE: MenuOptionType = {
		id: 'delete',
		label: 'Delete',
		icon: 'icon-[mdi--trash-can-outline]',
		isDanger: true
	};
	const MORE = $derived<MenuOptionType[]>(
		isPictureOnly
			? [DELETE]
			: [
					{
						id: 'own-1',
						label: 'Pop out',
						note: 'On a page of its own',
						icon: 'icon-[mdi--arrow-expand]'
					},
					{
						id: 'own-2',
						label: 'Pop out, 2 per page',
						note: 'Its own pages, 2 to each',
						icon: 'icon-[mdi--view-agenda-outline]'
					},
					{
						id: 'own-4',
						label: 'Pop out, 4 per page',
						note: 'Its own pages, 4 to each',
						icon: 'icon-[mdi--view-grid-outline]'
					},
					...(mine?.ownLayout
						? [
								{
									id: 'own-0',
									label: `Back with the ${word}`,
									note: 'On its pages with the others',
									icon: 'icon-[mdi--arrow-collapse]'
								}
							]
						: []),
					// The PDF or the video itself, in a new tab (#327), kept here out of the way of the tools.
					...(openLink
						? [
								photo?.kind === 'video'
									? { id: 'open', label: 'Play the video', icon: 'icon-[mdi--play-circle-outline]' }
									: { id: 'open', label: 'Open the PDF', icon: 'icon-[mdi--open-in-new]' }
							]
						: []),
					DELETE
				]
	);

	function pickMore(choice: string) {
		if (choice === 'delete') askDelete();
		else if (choice === 'open' && openLink) window.open(openLink, '_blank', 'noopener');
		else if (choice.startsWith('own-')) setOwnLayout(Number(choice.slice(4)));
	}

	// Its list opens from More's right edge on a phone and its left edge on a wider screen.
	const wide = new MediaQuery('min-width: 48rem');

	// Rotate and Flip at the top look as they did under the strip, the icon over its word (Justin, 2026-11-27: "just
	// like this at the top. And not buttons").
	const topClass =
		'flex w-[52px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10.5px] leading-none font-semibold transition';
	const optionClass =
		'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10.5px] leading-none font-semibold transition md:flex-none md:px-3';
	const toolClass =
		'flex w-[76px] flex-col items-center gap-[3px] rounded-[14px] pt-[7px] pb-1.5 text-[11px] font-semibold text-slate-300 transition md:h-11 md:w-auto md:flex-row md:gap-2 md:rounded-full md:px-[18px] md:py-0 md:text-sm md:hover:text-white';
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
		aria-label="Edit {noun ?? ATTACHMENT_NOUNS[photo?.kind ?? 'photo']}"
		data-editor
		transition:fade={{ duration: 180 }}
	>
		<!-- The top, its middle truly in the middle whatever is on either side (Justin, 2026-11-27): back, or the X once
		     something changed; Rotate and Flip, then All pages for a PDF or where it is; the i, the ⋮, and the ✓ once
		     something changed. On a phone the middle has a row of its own under the rest. -->
		<div
			class="box-content grid shrink-0 grid-cols-[1fr_auto] items-center gap-x-1 px-2 pt-[env(safe-area-inset-top)] pb-1 md:h-16 md:grid-cols-[1fr_auto_1fr] md:px-2.5 md:pt-0 md:pb-0"
		>
			<div class="flex h-14 items-center justify-self-start md:h-auto">
				<Button
					ghost
					invert
					lg
					icon={isEdited ? 'icon-[mdi--close]' : 'icon-[mdi--arrow-left]'}
					aria-label={isEdited ? 'Close without saving' : 'Back'}
					title={isEdited ? 'Close without saving' : 'Back'}
					data-editor-close
					onclick={onclose}
				/>
			</div>
			<div
				class="col-span-2 row-start-2 flex min-w-0 items-center justify-center gap-1.5 md:col-span-1 md:col-start-2 md:row-start-1"
				data-editor-middle
			>
				{#if mine}
					<button
						type="button"
						class="{topClass} text-slate-300 hover:text-white"
						data-edit="rotate"
						onclick={rotate}><span class="icon-[mdi--rotate-left] size-5"></span>Rotate</button
					>
					<button
						type="button"
						class="{topClass} {current.isFlipped
							? 'bg-white/14 text-white'
							: 'text-slate-300 hover:text-white'}"
						aria-pressed={Boolean(current.isFlipped)}
						data-edit="flip"
						onclick={flip}><span class="icon-[mdi--flip-horizontal] size-5"></span>Flip</button
					>
				{/if}
				{#if isPdf && pageCount > 1}
					<button
						type="button"
						class="flex shrink-0 items-center gap-2 rounded-full bg-white/8 py-1.5 pr-1.5 pl-3 text-xs font-semibold text-slate-200"
						role="switch"
						aria-checked={isAllPages}
						title={isAllPages
							? 'A change goes to every page'
							: 'A change goes to the page on screen'}
						data-all-pages
						onclick={() => (isAllPages = !isAllPages)}
						>All pages<span
							class="relative h-5 w-[34px] rounded-full transition {isAllPages
								? 'bg-primary'
								: 'bg-white/25'}"
							><span
								class="absolute top-0.5 size-4 rounded-full bg-white shadow transition-all {isAllPages
									? 'left-4'
									: 'left-0.5'}"
							></span></span
						></button
					>
				{:else if shownAt}
					<p class="truncate px-1.5 text-[13px] font-medium text-slate-300 tabular-nums">
						{shownAt}
					</p>
				{/if}
			</div>
			<div class="col-start-2 row-start-1 flex items-center gap-1 justify-self-end md:col-start-3">
				{#if !isPictureOnly}
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
				{/if}
				<div bind:this={moreBox}>
					<Menu
						label="More"
						value={mine?.ownLayout ? `own-${mine.ownLayout}` : ''}
						options={MORE}
						align={wide.current ? 'left' : 'right'}
						button={(_, isOpen) => ({
							ghost: true,
							invert: true,
							md: true,
							icon: 'icon-[mdi--dots-vertical]',
							title: 'More',
							toggled: isOpen
						})}
						onpick={pickMore}
					/>
				</div>
				{#if isEdited}
					<span in:fade={{ duration: 140 }}>
						<Button
							primary
							heavy
							md
							class="rounded-full"
							icon="icon-[mdi--check]"
							aria-label="Save"
							title="Save"
							data-editor-save
							onclick={save}
						/>
					</span>
				{/if}
			</div>
		</div>

		<!-- The picture. The swipe is for a finger or the mouse; the strip and the arrow keys move along too. -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="relative min-h-0 flex-1 touch-none overflow-hidden md:mx-6"
			bind:clientWidth={stageWidth}
			bind:clientHeight={stageHeight}
			onpointerdown={onstagedown}
			onpointermove={onstagemove}
			onpointerup={onstageup}
			onpointercancel={onstageup}
			data-stage
		>
			<div
				class="absolute inset-0 flex items-center justify-center will-change-transform {isGliding
					? 'transition-transform duration-[260ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]'
					: ''}"
				style:transform="translateX({offset}px)"
			>
				{#if photo && isStacked && crop}
					{@const box = tool === 'text' && printed ? printed : crop}
					<!-- All pages on: the next pages under the one on screen, each a little further up and to the right, as
					     selected photos stack (#402); a tap on one brings it up. Laid in the middle as the page on screen is. -->
					{#each underOf(pageAt, pageCount).toReversed() as page (page)}
						{@const depth = (page - pageAt + pageCount) % pageCount}
						{@const own = editIn(photo, page + 1)}
						<button
							type="button"
							class="absolute overflow-hidden rounded-[3px] bg-white shadow-[0_6px_20px_rgb(0_0_0/0.5)]"
							style="width: {box.width}px; height: {box.height}px; transform: translate({depth *
								STACK_STEP}px, {-depth * STACK_STEP * 0.7}px) rotate({depth * 2.5}deg)"
							aria-label="Bring page {page + 1} on top"
							data-stack-page={page + 1}
							onclick={() => goTo(index, page)}
						>
							{#if pictureOf(photo, page + 1)}
								<Picture
									src={pictureOf(photo, page + 1)}
									edit={tool === 'text' ? own : { turns: own.turns, isFlipped: own.isFlipped }}
									aspect={pictureAspectOf(photo, page + 1)}
									fit={tool === 'text' ? 'fill' : 'fit'}
									width={box.width}
									height={box.height}
									class="pointer-events-none"
								/>
							{/if}
						</button>
					{/each}
				{/if}
				{#if photo && !pictureOf(photo, pageAt + 1)}
					<!-- A PDF still on its way, or a page not drawn yet. -->
					<span class="relative flex flex-col items-center gap-2 text-sm text-slate-400">
						<span class="{ATTACHMENT_ICONS[photo.kind ?? 'photo']} size-10 text-slate-500"></span>
						{isPdf ? `Page ${pageAt + 1}` : 'Not ready yet'}
					</span>
				{:else if photo && tool === 'crop' && crop && mine}
					<div
						class="relative shrink-0"
						style="width: {crop.width}px; height: {crop.height}px"
						data-crop
					>
						<div
							class="absolute inset-0 overflow-hidden {isPdf ? 'bg-white' : ''} {isStacked
								? 'outline-2 outline-offset-2 outline-sky-400'
								: ''}"
						>
							<div
								class="absolute top-0 left-0"
								style="width: {crop.width}px; height: {crop.height}px; transform-origin: {(crop
									.frame.x +
									crop.frame.w / 2) *
									crop.width}px {(crop.frame.y + crop.frame.h / 2) *
									crop.height}px; transform: rotate({crop.tilt}deg) scale({crop.grow})"
							>
								<img
									src={pictureOf(photo, pageAt + 1)}
									alt=""
									draggable="false"
									class="pointer-events-none absolute block max-w-none select-none"
									style="left: {(crop.width - crop.imageWidth) / 2}px; top: {(crop.height -
										crop.imageHeight) /
										2}px; width: {crop.imageWidth}px; height: {crop.imageHeight}px; transform: scaleX({current.isFlipped
										? -1
										: 1}) rotate({-crop.turns * 90}deg)"
								/>
							</div>
							<!-- What the crop leaves out, dimmed. -->
							<div
								class="pointer-events-none absolute shadow-[0_0_0_9999px_rgb(5_7_11/0.62)]"
								style="left: {crop.frame.x * crop.width}px; top: {crop.frame.y *
									crop.height}px; width: {crop.frame.w * crop.width}px; height: {crop.frame.h *
									crop.height}px"
							></div>
						</div>
						<!-- The frame stands over the picture's edge, never cut off: its corners and edges stay in view. -->
						<div
							class="absolute cursor-move border border-white/90"
							style="left: {crop.frame.x * crop.width}px; top: {crop.frame.y *
								crop.height}px; width: {crop.frame.w * crop.width}px; height: {crop.frame.h *
								crop.height}px"
							data-handle="move"
						>
							{#if isRound}
								<span
									class="pointer-events-none absolute inset-0 rounded-full border-2 border-white/85"
								></span>
							{/if}
							{#each [1, 2] as at (at)}
								<span
									class="pointer-events-none absolute inset-y-0 w-px bg-white/45"
									style="left: {at * 33.333}%"
								></span>
								<span
									class="pointer-events-none absolute inset-x-0 h-px bg-white/45"
									style="top: {at * 33.333}%"
								></span>
							{/each}
							{#if isTurning}
								{#each [1, 2, 3, 4, 5, 7, 8, 9, 10, 11] as at (at)}
									<span
										class="pointer-events-none absolute inset-y-0 w-px bg-white/20"
										style="left: {(at * 100) / 12}%"
									></span>
									<span
										class="pointer-events-none absolute inset-x-0 h-px bg-white/20"
										style="top: {(at * 100) / 12}%"
									></span>
								{/each}
							{/if}
							{#each HANDLES as handle (handle)}
								<span
									class="absolute grid size-11 place-items-center {handle.includes('n')
										? '-top-[22px]'
										: handle.includes('s')
											? '-bottom-[22px]'
											: 'top-1/2 -mt-[22px]'} {handle.includes('w')
										? '-left-[22px]'
										: handle.includes('e')
											? '-right-[22px]'
											: 'left-1/2 -ml-[22px]'} {handle === 'n' || handle === 's'
										? 'cursor-ns-resize'
										: handle === 'e' || handle === 'w'
											? 'cursor-ew-resize'
											: handle === 'nw' || handle === 'se'
												? 'cursor-nwse-resize'
												: 'cursor-nesw-resize'}"
									data-handle={handle}
								>
									{#if handle.length === 2}
										<!-- A corner: two short bars. -->
										<span
											class="pointer-events-none absolute size-[18px] border-white {handle.includes(
												'n'
											)
												? 'top-[19px] border-t-[3px]'
												: 'bottom-[19px] border-b-[3px]'} {handle.includes('w')
												? 'left-[19px] border-l-[3px]'
												: 'right-[19px] border-r-[3px]'}"
										></span>
									{:else}
										<span
											class="pointer-events-none rounded-full bg-white {handle === 'n' ||
											handle === 's'
												? 'h-[3px] w-6'
												: 'h-6 w-[3px]'}"
										></span>
									{/if}
								</span>
							{/each}
						</div>
					</div>
				{:else if photo && printed && crop && mine}
					<!-- Text: the attachment as it prints, the description typed over its foot. -->
					<Picture
						src={pictureOf(photo, pageAt + 1)}
						edit={current}
						frame={crop.frame}
						{aspect}
						width={printed.width}
						height={printed.height}
						class="shrink-0 rounded-sm {isPdf ? 'bg-white' : 'bg-slate-800'} {isStacked
							? 'outline-2 outline-offset-2 outline-sky-400'
							: ''}"
					>
						<div
							class="absolute inset-x-0 bottom-0 z-[4] bg-linear-to-t from-black/75 via-black/40 to-transparent px-3.5 pt-9 pb-3"
						>
							<textarea
								rows="1"
								class="-mx-[7px] -my-[5px] block min-h-7 w-[76%] resize-none overflow-hidden rounded-lg border-[1.5px] border-dashed border-white/75 bg-black/20 px-1.5 py-1 text-[15px] leading-snug font-medium text-white outline-none placeholder:text-white/65"
								placeholder="Describe this {ATTACHMENT_NOUNS[photo.kind ?? 'photo']}"
								aria-label="Description"
								value={mine.words}
								onfocus={() => (isTyping = false)}
								oninput={(event) => {
									// The first letter typed since the box took focus is one step for undo.
									if (!isTyping) remember();
									isTyping = true;
									mine.words = event.currentTarget.value;
									fit(event.currentTarget);
								}}
								onkeydown={(event) => {
									if (event.key === 'Enter' && !event.shiftKey) {
										event.preventDefault();
										save();
									}
								}}
								{@attach focusWords}></textarea>
						</div>
					</Picture>
				{/if}
			</div>
		</div>

		{#snippet pageThumb(each: PhotoType, page: number)}
			{#if pictureOf(each, page + 1, 200)}
				<Picture
					src={pictureOf(each, page + 1, 200)}
					edit={editIn(each, page + 1)}
					aspect={pictureAspectOf(each, page + 1)}
					fit="fit"
					class="pointer-events-none size-full"
				/>
			{:else}
				<span class="grid size-full place-items-center text-[8px] font-semibold text-slate-400"
					>{page + 1}</span
				>
			{/if}
		{/snippet}

		<!-- Under the picture: the stage's attachments in a row, a PDF in line with them (Justin, 2026-11-27): its pages
		     side by side in one box with All pages on (2026-11-28: "keep the pages side by side"), the page on screen
		     alone with it off. -->
		{#if items.length > 1 || pageCount > 1}
			<div
				class="flex h-[66px] shrink-0 [scrollbar-width:none] items-center gap-1.5 overflow-x-auto px-3 md:justify-center"
				data-strip
				{@attach keepInView}
			>
				{#each items as each, at (each.id)}
					{@const isOpen = at === index}
					{#if each.kind === 'pdf'}
						{@const count = Math.max(1, each.pageCount ?? 1)}
						{@const top = isOpen ? pageAt : 0}
						{#if isAllPages && count > 1}
							<!-- All pages on: one box round its pages, in white while it is open, the page on screen in blue. -->
							<div
								class="flex h-12 shrink-0 items-center gap-1 rounded-lg bg-white/[0.07] px-1 transition {isOpen
									? 'ring-2 ring-white ring-offset-2 ring-offset-[#05070b]'
									: 'opacity-55 ring-1 ring-white/15 hover:opacity-90'}"
								role="group"
								aria-label="PDF, {count} pages"
								data-strip-pdf={at}
							>
								{#each Array.from({ length: count }, (_, page) => page) as page (page)}
									{@const isHere = isOpen && page === pageAt}
									<button
										type="button"
										class="relative h-10 w-[29px] shrink-0 overflow-hidden rounded-[3px] bg-white transition {isHere
											? 'ring-2 ring-sky-400'
											: ''}"
										aria-label="PDF page {page + 1}"
										aria-current={isHere}
										data-current={isHere || undefined}
										data-strip-page={page + 1}
										onclick={() => goTo(at, page)}>{@render pageThumb(each, page)}</button
									>
								{/each}
							</div>
						{:else}
							<!-- All pages off: the page on screen alone, and a swipe goes through the rest (Justin, 2026-11-27). -->
							<button
								type="button"
								class="relative h-12 w-[34px] shrink-0 overflow-hidden rounded-[4px] bg-white transition {isOpen
									? 'ring-2 ring-white ring-offset-2 ring-offset-[#05070b]'
									: 'opacity-55 hover:opacity-90'}"
								aria-label="PDF page {top + 1} of {count}"
								aria-current={isOpen}
								data-current={isOpen || undefined}
								data-strip-pdf={at}
								data-strip-page={top + 1}
								onclick={() => goTo(at, top)}
								>{@render pageThumb(each, top)}{#if count > 1}<span
										class="absolute right-0.5 bottom-0.5 rounded-[3px] bg-black/70 px-0.5 text-[8px] leading-tight font-semibold text-white tabular-nums"
										>{top + 1}/{count}</span
									>{/if}</button
							>
						{/if}
					{:else}
						<button
							type="button"
							class="relative size-12 shrink-0 overflow-hidden rounded-lg bg-slate-700 transition {isOpen
								? 'ring-2 ring-white ring-offset-2 ring-offset-[#05070b]'
								: 'opacity-55 hover:opacity-90'}"
							aria-label="{ATTACHMENT_NOUNS[each.kind ?? 'photo']} {at + 1}"
							aria-current={isOpen}
							data-current={isOpen || undefined}
							data-go={at}
							onclick={() => goTo(at)}
						>
							{#if each.src}
								<Picture
									src={each.src}
									edit={editIn(each)}
									class="pointer-events-none size-full"
								/>
							{/if}
							{#if each.kind === 'video'}
								<span
									class="absolute top-1/2 left-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-900"
									><span class="icon-[mdi--play] size-3.5"></span></span
								>
							{/if}
						</button>
					{/if}
				{/each}
			</div>
		{/if}

		{#if isDetailsOpen && photo}
			<!-- #343: what the file was and became. -->
			<section
				class="mx-2.5 mt-1 max-h-[45dvh] shrink-0 overflow-y-auto overscroll-contain rounded-2xl bg-white/[0.07] p-3 text-[13px] text-slate-300 md:mx-auto md:max-h-[42vh] md:w-full md:max-w-2xl md:p-4"
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
								{isPlaceRemoved(fields) ? 'Removed by the phone before upload' : 'Not recorded'}
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
								{#each fieldGroups as fieldGroup (fieldGroup.name)}
									<h3 class="mt-3 mb-1 font-semibold text-white">
										{fieldGroup.name}
										<span class="font-normal text-slate-400 tabular-nums"
											>{fieldGroup.fields.length}</span
										>
									</h3>
									<dl
										class="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-3 gap-y-0.5 md:grid-cols-[13rem_minmax(0,1fr)]"
									>
										{#each fieldGroup.fields as field (field.name)}
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
		{:else if tool === 'crop' && mine}
			<!-- The frame's shapes, all in one row: the stage's first when it sets one, where the frame starts, then every
			     other, any of them picked for this attachment alone. -->
			<div
				class="flex h-[58px] shrink-0 items-stretch gap-0.5 px-2 md:justify-center md:gap-1.5"
				data-options
			>
				{#if stageAspect}
					{@const glyph = glyphOf('', stageAspect)}
					{@const isOn = !current.ratio}
					<button
						type="button"
						class="{optionClass} {isOn
							? 'bg-white/14 text-white'
							: 'text-slate-300 hover:text-white'}"
						aria-pressed={isOn}
						title={stageShapeLabel}
						data-crop-ratio="stage"
						onclick={() => pickRatio(undefined)}
						><span class="grid h-5 place-items-center"
							><span
								class="block rounded-[2px] border-[1.5px] border-current"
								style="width: {glyph.width * 0.9}px; height: {glyph.height * 0.9}px"
							></span></span
						>{stageShapeName}</button
					>
				{/if}
				{#each CROP_RATIOS as ratio (ratio.id)}
					{@const glyph = glyphOf(ratio.id)}
					{@const isOn = stageAspect
						? current.ratio === ratio.id
						: (current.ratio ?? 'free') === ratio.id}
					<button
						type="button"
						class="{optionClass} {isOn
							? 'bg-white/14 text-white'
							: 'text-slate-300 hover:text-white'}"
						aria-pressed={isOn}
						data-crop-ratio={ratio.id}
						onclick={() => pickRatio(ratio.id)}
						><span class="grid h-5 place-items-center"
							><span
								class="block rounded-[2px] border-[1.5px] border-current {ratio.id === 'free'
									? 'border-dashed'
									: ''}"
								style="width: {glyph.width * 0.9}px; height: {glyph.height * 0.9}px"
							></span></span
						>{ratio.label}</button
					>
				{/each}
			</div>
		{/if}

		<!-- At the bottom: undo, the straighten dial, redo. Undo and redo show once there is something to step to. -->
		<div class="flex h-14 shrink-0 items-center gap-2 px-3 md:mx-auto md:w-[560px]">
			<span class={history.length ? '' : 'invisible'}>
				<Button
					ghost
					invert
					md
					icon="icon-[mdi--undo]"
					aria-label="Undo"
					title="Undo"
					data-edit="undo"
					onclick={undo}
				/>
			</span>
			{#if tool === 'crop'}
				{@const tilt = current.tilt ?? 0}
				<div
					class="relative h-12 min-w-0 flex-1 cursor-ew-resize touch-none select-none"
					role="slider"
					tabindex="0"
					aria-label="Straighten"
					aria-valuemin={-45}
					aria-valuemax={45}
					aria-valuenow={Math.round(tilt)}
					aria-valuetext="{Math.round(tilt)} degrees"
					data-dial
					onpointerdown={ondialdown}
					onpointermove={ondialmove}
					onpointerup={ondialup}
					onpointercancel={ondialup}
					onkeydown={ondialkey}
				>
					<span
						class="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 text-[11px] font-semibold tabular-nums {tilt
							? 'text-white'
							: 'text-slate-400'}">{Math.round(tilt)}°</span
					>
					<div
						class="pointer-events-none absolute inset-x-0 bottom-1 h-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_22%,black_78%,transparent)]"
					>
						<div
							class="absolute top-0 left-1/2 h-full"
							style="transform: translateX({-tilt * DEG - 45 * DEG}px)"
						>
							{#each Array.from({ length: 91 }, (_, at) => at - 45) as at (at)}
								<span
									class="absolute bottom-0 w-px {at % 15 === 0
										? 'h-5 bg-white'
										: at % 5 === 0
											? 'h-3.5 bg-white/70'
											: 'h-2 bg-white/40'}"
									style="left: {(at + 45) * DEG}px"
								></span>
							{/each}
						</div>
						<span
							class="absolute bottom-0 left-1/2 h-6 w-0.5 -translate-x-1/2 rounded-full bg-sky-400"
						></span>
					</div>
				</div>
			{:else}
				<p class="min-w-0 flex-1 text-center text-xs text-slate-400">
					Type the description over the {isPdf ? 'PDF' : 'picture'}.
				</p>
			{/if}
			<span class={future.length ? '' : 'invisible'}>
				<Button
					ghost
					invert
					md
					icon="icon-[mdi--redo]"
					aria-label="Redo"
					title="Redo"
					data-edit="redo"
					onclick={redo}
				/>
			</span>
		</div>

		<!-- The tools, Crop, Text and Reset, in the middle and always there, so nothing jumps (Justin, 2026-11-28: "keep that
		     reset there at all times and just center it"); Reset is dimmed while there is nothing to undo. Open and Play
		     are in the ⋮. -->
		<div
			class="flex shrink-0 justify-center gap-2 px-2.5 pt-1 pb-[max(14px,env(safe-area-inset-bottom))] md:px-5 md:pb-5"
			data-tools
		>
			<button
				type="button"
				class="{toolClass} {tool === 'crop' ? 'bg-white/14 text-white' : ''}"
				aria-pressed={tool === 'crop'}
				data-tool="crop"
				onclick={() => (tool = 'crop')}
				><span class="icon-[mdi--crop] size-6 md:size-5"></span><span>Crop</span></button
			>
			{#if !isPictureOnly}
				<button
					type="button"
					class="{toolClass} {tool === 'text' ? 'bg-white/14 text-white' : ''}"
					aria-pressed={tool === 'text'}
					data-tool="text"
					onclick={() => (tool = 'text')}
					><span class="icon-[mdi--pencil-outline] size-6 md:size-5"></span><span>Text</span
					></button
				>
			{/if}
			<button
				type="button"
				class="{toolClass} disabled:pointer-events-none disabled:opacity-35"
				disabled={!hasEdit(current)}
				data-tool="reset"
				onclick={reset}
				><span class="icon-[mdi--restore] size-6 md:size-5"></span><span>Reset</span></button
			>
		</div>
	</div>
</div>
