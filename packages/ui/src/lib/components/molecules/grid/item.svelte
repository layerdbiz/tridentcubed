<!-- Item.svelte -->
<!-- svelte-ignore state_referenced_locally -->
<script lang="ts">
	import type { Snippet } from "svelte";
	import { getGridCtx, parseRange } from "@layerd/ui";

	export interface ItemProps {
		class?: string;
		range?: string; // "A1" | "A1:C3" | "1x2" | "1:3x1:3"
		row?: string;
		col?: string;
		items?: string;   // place-items (enables grid)
		content?: string; // place-content (enables grid)
		self?: string;    // place-self (disables grid, natural sizing)
		children?: Snippet;
	}

	let { 
		class: userClass = "", 
		range, 
		row, 
		col, 
		items,
		content,
		self,
		children 
	}: ItemProps = $props();

	const ctx = (() => {
		try {
			return getGridCtx();
		} catch {
			return null;
		}
	})();

	// INTENTIONAL: Capture initial prop values for synchronous track registration
	// This prevents FOUC by setting grid tracks before first render
	// The "state_referenced_locally" warning is expected and correct here
	const _initialRange = range;
	const _initialRow = row;
	const _initialCol = col;

	// Claim cell synchronously during initialization if no range provided
	const initialParsed = parseRange(_initialRange);
	const initialClaimed = ctx && !initialParsed ? ctx.claimAutoCell() : null;

	// Compute initial placement synchronously for track registration
	const initialPlacement = initialParsed 
		? initialParsed 
		: initialClaimed 
			? { startRow: initialClaimed.row, endRow: initialClaimed.row, startCol: initialClaimed.col, endCol: initialClaimed.col }
			: null;

	// Register track overrides SYNCHRONOUSLY during initialization
	// This is critical to prevent FOUC - tracks must be set before first render
	if (ctx && initialPlacement) {
		if (_initialRow) ctx.setRowTrack(initialPlacement.startRow, _initialRow);
		if (_initialCol) ctx.setColTrack(initialPlacement.startCol, _initialCol);
	}

	// Reactive versions for after mount
	const parsed = $derived.by(() => parseRange(range));
	let claimed = $state<{ row: number; col: number } | null>(initialClaimed);

	const placement = $derived.by(() => {
		if (parsed) return parsed;
		if (claimed) return { startRow: claimed.row, endRow: claimed.row, startCol: claimed.col, endCol: claimed.col };
		return null;
	});

	// Track previous placement and props for reactive updates
	let prevPlacement = initialPlacement;
	let prevRow = _initialRow;
	let prevCol = _initialCol;
	
	// Handle reactive updates when placement or row/col props change
	$effect(() => {
		if (!ctx) return;
		if (!placement) return;

		const placementChanged = 
			prevPlacement?.startRow !== placement.startRow || 
			prevPlacement?.startCol !== placement.startCol;
		
		// If placement changed, clear old tracks and set new ones
		if (placementChanged && prevPlacement) {
			// Clear old track overrides
			if (prevRow) ctx.clearRowTrack(prevPlacement.startRow);
			if (prevCol) ctx.clearColTrack(prevPlacement.startCol);
		}

		// Set new track overrides (on placement change or prop change)
		if (placementChanged || row !== prevRow) {
			if (row) ctx.setRowTrack(placement.startRow, row);
		}
		if (placementChanged || col !== prevCol) {
			if (col) ctx.setColTrack(placement.startCol, col);
		}

		// Update prev refs
		prevPlacement = placement;
		prevRow = row;
		prevCol = col;
	});

	// Determine if we need grid layout (items or content used, but self takes precedence)
	const useGrid = $derived(!self && (!!items || !!content));

	const style = $derived.by(() => {
		const parts: string[] = [];
		
		// Display mode: grid if items/content used (unless self is used)
		if (useGrid) {
			parts.push('display:grid');
		}
		
		// Grid placement
		if (placement) {
			parts.push(`grid-area:${placement.startRow} / ${placement.startCol} / ${placement.endRow + 1} / ${placement.endCol + 1}`);
		}
		
		// Place properties (raw CSS values)
		if (items) parts.push(`place-items:${items}`);
		if (content) parts.push(`place-content:${content}`);
		if (self) parts.push(`place-self:${self}`);
		
		// Prevent overflow
		parts.push('min-width:0px', 'min-height:0px');
		
		return parts.join(';') + ';';
	});

	// Sizing: h-full w-full unless self is used (natural sizing for self-positioning)
	const sizeClass = $derived(self ? '' : 'h-full w-full');
</script>

<div class={`min-h-0 min-w-0 ${sizeClass} ${userClass}`} style={style}>
	{@render children?.()}
</div>
