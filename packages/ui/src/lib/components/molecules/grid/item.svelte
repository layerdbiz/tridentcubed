<!-- Item.svelte -->
<script lang="ts">
	import type { Snippet } from "svelte";
	import { getGridCtx } from "@layerd/ui";

	export interface ItemProps {
		class?: string;
		range?: string; // "A1" | "A1:C3"
		row?: string;
		col?: string;
		children?: Snippet;
	}

	let { class: userClass = "", range, row, col, children }: ItemProps = $props();

	function colToNum(label: string) {
		let n = 0;
		for (const ch of (label ?? "").trim().toUpperCase()) {
			const code = ch.charCodeAt(0);
			if (code < 65 || code > 90) continue;
			n = n * 26 + (code - 64);
		}
		return Math.max(1, n);
	}

	function parseRange(spec?: string) {
		const s = (spec ?? "").trim().toUpperCase();
		if (!s) return null;

		const mCell = s.match(/^([A-Z]+)(\d+)$/);
		if (mCell) {
			const startCol = colToNum(mCell[1]);
			const startRow = Math.max(1, Number(mCell[2]) || 1);
			return { startRow, endRow: startRow, startCol, endCol: startCol };
		}

		const mRange = s.match(/^([A-Z]+)(\d+)\s*:\s*([A-Z]+)(\d+)$/);
		if (mRange) {
			const r1 = Math.max(1, Number(mRange[2]) || 1);
			const r2 = Math.max(1, Number(mRange[4]) || 1);
			const c1 = colToNum(mRange[1]);
			const c2 = colToNum(mRange[3]);

			const startRow = Math.min(r1, r2);
			const endRow = Math.max(r1, r2);
			const startCol = Math.min(c1, c2);
			const endCol = Math.max(c1, c2);

			return { startRow, endRow, startCol, endCol };
		}

		return null;
	}

	const ctx = (() => {
		try {
			return getGridCtx();
		} catch {
			return null;
		}
	})();

	const parsed = $derived.by(() => parseRange(range));

	// claim once when range is missing
	let claimed = $state<{ row: number; col: number } | null>(null);

	$effect(() => {
		if (!ctx) return;
		if (parsed) return; // explicit range wins
		if (claimed) return; // already claimed
		claimed = ctx.claimAutoCell();
	});

	const placement = $derived.by(() => {
		if (parsed) return parsed;
		if (claimed) return { startRow: claimed.row, endRow: claimed.row, startCol: claimed.col, endCol: claimed.col };
		return null;
	});

	$effect(() => {
		if (!ctx) return;
		if (!placement) return;

		if (row) ctx.setRowTrack(placement.startRow, row);
		if (col) ctx.setColTrack(placement.startCol, col);
	});

	const style = $derived.by(() => {
		if (!placement) return `min-width:0px;min-height:0px;`;
		// grid-area uses end+1
		return (
			`grid-area:${placement.startRow} / ${placement.startCol} / ${placement.endRow + 1} / ${placement.endCol + 1};` +
			`min-width:0px;min-height:0px;`
		);
	});
</script>

<div class={`h-full w-full min-h-0 min-w-0 ${userClass}`} style={style}>
	{@render children?.()}
</div>
