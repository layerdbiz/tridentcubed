<script lang="ts">
	import { setGridCtx } from "@layerd/ui";
	import { Item } from "@layerd/ui";
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

	function colToNum(label: string) {
		let n = 0;
		for (const ch of label.trim().toUpperCase()) {
			const code = ch.charCodeAt(0);
			if (code < 65 || code > 90) continue;
			n = n * 26 + (code - 64);
		}
		return Math.max(1, n);
	}

	function numToCol(n: number) {
		let x = n;
		let out = "";
		while (x > 0) {
			x -= 1;
			out = String.fromCharCode(65 + (x % 26)) + out;
			x = Math.floor(x / 26);
		}
		return out || "A";
	}

	function parseItemsSpec(spec: string) {
	const s = spec.trim().toUpperCase();

	// NEW: "10" => 10 rows, 1 col
	const mSingle = s.match(/^(\d+)$/);
	if (mSingle) {
		const r = Math.max(1, Number(mSingle[1]) || 1);
		return { rows: r, cols: 1 };
	}

	const mGrid = s.match(/^(\d+)\s*[X×]\s*(\d+)$/);
	if (mGrid) {
		const r = Math.max(1, Number(mGrid[1]) || 1);
		const c = Math.max(1, Number(mGrid[2]) || 1);
		return { rows: r, cols: c };
	}

	const mRange = s.match(/^([A-Z]+)(\d+)\s*:\s*([A-Z]+)(\d+)$/);
	if (mRange) {
		const r1 = Math.max(1, Number(mRange[2]) || 1);
		const r2 = Math.max(1, Number(mRange[4]) || 1);
		const c1 = colToNum(mRange[1]);
		const c2 = colToNum(mRange[3]);
		return { rows: Math.max(r1, r2), cols: Math.max(c1, c2) };
	}

	return { rows: 1, cols: 1 };
}

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

	// stable dims
	let dims = $state({ rows: 1, cols: 1 });

	// IMPORTANT: only reset to 1x1 *when entering* auto-mode
	let wasAuto = $state(false);

	$effect(() => {
		const nowAuto = items.trim().length === 0;

		// switched auto <-> explicit?
		if (nowAuto !== wasAuto) {
			wasAuto = nowAuto;

			if (nowAuto) {
				// entering auto: start clean
				dims = { rows: 1, cols: 1 };
			} else {
				// entering explicit: parse immediately
				dims = parseItemsSpec(items);
			}
			return;
		}

		// staying in explicit mode: track changes to items string
		if (!nowAuto) {
			const next = parseItemsSpec(items);
			if (next.rows !== dims.rows || next.cols !== dims.cols) dims = next;
		}

		// staying in auto mode: DO NOT force dims back to 1x1
	});

	// track overrides
	let rowTracks = $state<(string | undefined)[]>([]);
	let colTracks = $state<(string | undefined)[]>([]);

	$effect(() => {
		rowTracks = Array.from({ length: dims.rows }, () => undefined);
		colTracks = Array.from({ length: dims.cols }, () => undefined);
	});

	function setRowTrack(index: number, value: string) {
		if (index < 1 || index > dims.rows) return;
		rowTracks[index - 1] = value;
	}

	function setColTrack(index: number, value: string) {
		if (index < 1 || index > dims.cols) return;
		colTracks[index - 1] = value;
	}

	// NEW: auto-placement cursor for Items w/out `range`
	let autoCursor = $state(0);

	$effect(() => {
		autoCursor = 0;
	});

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

	// Set context at component initialization, not in an effect
	setGridCtx({ dims, setRowTrack, setColTrack, claimAutoCell });

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
	<div class={"min-h-[100svh] w-full place-items-stretch " + userClass} style={gridStyle}>
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
