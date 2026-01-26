<script lang="ts">
	import { Item, setGridCtx, parseDims, numToCol } from "@layerd/ui";
	import { tick, untrack } from "svelte";
	import type { Snippet } from "svelte";

	export interface GridProps {
		class?: string;
		items?: string; // "10x10" | "A1:J10" | undefined => auto
		rows?: string;
		cols?: string;
		gap?: string;
		pad?: string;
		debug?: boolean;
		children?: Snippet;
	}

	let {
		items = "",
		rows,
		cols,
		class: userClass = "",
		gap = "1rem",
		pad = "0",
		debug = false,
		children
	}: GridProps = $props();

	// FOUC prevention: hide grid until children have registered their tracks
	// This is necessary because children (Items) register row/col sizes AFTER
	// the parent Grid has already rendered its template
	let ready = $state(false);
	
	// Use untrack to avoid creating a dependency, and tick to wait for children
	$effect(() => {
		untrack(() => {
			tick().then(() => {
				ready = true;
			});
		});
	});

	function materializeTrackParts(count: number, definition?: string) {
		const def = definition?.trim();
		if (!def) return Array.from({ length: count }, () => "minmax(0, 1fr)");

		const parts = def.split(/\s+/);
		if (parts.length === count) return parts;

		const last = parts[parts.length - 1] ?? "1fr";
		const out: string[] = [];
		for (const i of Array.from({ length: count }, (_, idx) => idx)) out.push(parts[i] ?? last);
		return out;
	}

	function buildFauxRanges(rowCount: number, colCount: number) {
		const out: string[] = [];
		for (const r of Array.from({ length: rowCount }, (_, idx) => idx + 1)) {
			for (const c of Array.from({ length: colCount }, (_, idx) => idx + 1)) {
				out.push(`${numToCol(c)}${r}`);
			}
		}
		return out;
	}

	const isAuto = $derived(items.trim().length === 0);

	// Helper to compute initial dims from props
	function getInitialDims() {
		return parseDims(items);
	}

	// Initialize dims synchronously to prevent FOUC
	let dims = $state(getInitialDims());

	// Track previous items for change detection (use closure to capture initial value)
	let prevItemsRef = (() => items.trim())();

	// React to items changes after initial render
	$effect(() => {
		const currentItems = items.trim();
		
		// Skip if items hasn't changed
		if (currentItems === prevItemsRef) return;
		prevItemsRef = currentItems;

		const next = parseDims(currentItems);
		if (next.rows !== dims.rows || next.cols !== dims.cols) {
			dims = next;
		}
	});

	// Helper to create track arrays
	function createTracks(count: number) {
		return Array.from({ length: count }, () => undefined as string | undefined);
	}

	// Initialize tracks synchronously based on initial dims
	const initialDims = getInitialDims();
	let rowTracks = $state<(string | undefined)[]>(createTracks(initialDims.rows));
	let colTracks = $state<(string | undefined)[]>(createTracks(initialDims.cols));

	// Update tracks when dims change
	$effect(() => {
		if (rowTracks.length !== dims.rows) {
			rowTracks = createTracks(dims.rows);
		}
		if (colTracks.length !== dims.cols) {
			colTracks = createTracks(dims.cols);
		}
	});

	function setRowTrack(index: number, value: string) {
		if (index < 1 || index > dims.rows) return;
		rowTracks[index - 1] = value;
	}

	function setColTrack(index: number, value: string) {
		if (index < 1 || index > dims.cols) return;
		colTracks[index - 1] = value;
	}

	function clearRowTrack(index: number) {
		if (index < 1 || index > dims.rows) return;
		rowTracks[index - 1] = undefined;
	}

	function clearColTrack(index: number) {
		if (index < 1 || index > dims.cols) return;
		colTracks[index - 1] = undefined;
	}

	// Auto-placement cursor for Items without `range`
	// No need for $effect - cursor resets naturally when component remounts
	let autoCursor = $state(0);

	function ensureAutoDimsForIndex(idx: number) {
		// row-major on current column count
		const colsNow = Math.max(1, dims.cols);
		const neededRows = Math.floor(idx / colsNow) + 1;

		if (neededRows > dims.rows) dims = { rows: neededRows, cols: colsNow };
	}

	function claimAutoCell() {
		const idx = autoCursor;
		autoCursor += 1;

		// grow rows as items are claimed
		if (isAuto) ensureAutoDimsForIndex(idx);

		const colCount = Math.max(1, dims.cols);
		const row = Math.floor(idx / colCount) + 1;
		const col = (idx % colCount) + 1;
		return { row, col };
	}

	// Set context at component initialization
	// Pass dims as a getter so context consumers get reactive updates
	setGridCtx({ 
		get dims() { return dims; }, 
		setRowTrack, 
		setColTrack,
		clearRowTrack,
		clearColTrack,
		claimAutoCell 
	});

	const gridTemplateRows = $derived.by(() => {
		const currentDims = dims;
		const base = materializeTrackParts(currentDims.rows, rows);
		for (const i of Array.from({ length: currentDims.rows }, (_, idx) => idx)) {
			const v = rowTracks[i];
			if (v) base[i] = v;
		}
		return base.join(" ");
	});

	const gridTemplateCols = $derived.by(() => {
		const currentDims = dims;
		const base = materializeTrackParts(currentDims.cols, cols);
		for (const i of Array.from({ length: currentDims.cols }, (_, idx) => idx)) {
			const v = colTracks[i];
			if (v) base[i] = v;
		}
		return base.join(" ");
	});

	const fauxRanges = $derived.by(() => buildFauxRanges(dims.rows, dims.cols));

	const gridStyle = $derived.by(
		() =>
			`display:grid;` +
			`min-height:100svh;` +
			`width:100%;` +
			`padding:${pad};` +
			`gap:${gap};` +
			`grid-template-rows:${gridTemplateRows};` +
			`grid-template-columns:${gridTemplateCols};` +
			`grid-auto-rows:minmax(0, 1fr);` +
			`grid-auto-columns:minmax(0, 1fr);`
	);
</script>

<div class="min-h-[100svh] w-full">
	<div 
		class={"min-h-[100svh] w-full place-items-stretch " + userClass} 
		class:invisible={!ready}
		style={gridStyle}
	>
		{#if debug}
			{#each fauxRanges as r (r)}
				<Item range={r} class="bg-black/10 text-black/50 font-black grid place-items-center">
					{r}
				</Item>
			{/each}
		{/if}

		{@render children?.()}
	</div>
</div>
