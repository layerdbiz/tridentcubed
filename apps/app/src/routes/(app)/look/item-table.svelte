<script
	lang="ts"
	module
>
	// How the item list fits a width (#242): each printed column's width, the table's own width and the scale it is
	// drawn at, and how tall each part stands before scaling. Read once from the whole table laid out at its natural
	// size, so every part drawn from it (the headings, one row, the totals) lines up with the others.
	export type FitType = {
		widths: number[];
		width: number;
		scale: number;
		isTight: boolean;
		head: number;
		rows: number[];
		totals: number;
	};

	// One part of the table: all of it, its headings, its totals row, or one row by its place.
	export type PartType = 'all' | 'head' | 'totals' | number;
</script>

<script lang="ts">
	// The item list read from a spreadsheet, as a table (#242; Justin's pick of three, 2026-11-19): quantity before
	// the item, the item on one line, bold headings over a thick black line, thin gray lines between rows, and a
	// measure given in two units stacked in one cell.
	//
	// It always fills the width it is given. A table too wide for that is scaled down as one block, never by small
	// text: a phone's browser will not draw text under its smallest size, and a table sized by its text came out
	// jumbled there. So the table is laid out at a normal size and drawn through a transform.
	//
	// Three ways to use it. With `onfit` and `room` it is the measuring copy: laid out at its natural width, it says
	// how it fits that room. With `fit` it draws one part at those sizes. With neither it is the table as it lies,
	// for a box that scrolls.
	import type { Attachment } from 'svelte/attachments';
	import type { ColumnType, LineType, TableType } from './spreadsheet';

	let {
		table,
		part = 'all',
		fit,
		room,
		onfit
	}: {
		table: TableType;
		part?: PartType;
		fit?: FitType;
		room?: number;
		onfit?: (fit: FitType) => void;
	} = $props();

	// Under this scale the words wrap instead: cells of words get a widest width, so the table needs less room.
	const TIGHT = 0.62;
	let isCramped = $state(false);
	const isTight = $derived(fit ? fit.isTight : isCramped);

	const hasHead = $derived(table.hasHeads && (part === 'all' || part === 'head'));
	const rows = $derived(
		part === 'all' ? table.rows : typeof part === 'number' ? table.rows.slice(part, part + 1) : []
	);
	const totals = $derived(part === 'all' || part === 'totals' ? table.totals : undefined);

	// A long heading over a column of numbers goes on two lines, its unit on the second, so the column stays narrow.
	function linesOf(column: ColumnType) {
		const head = column.head;
		if (column.kind !== 'value' || column.sub) return [head];
		const unit = head.match(/^(.*\S)\s+(\([^)]*\))$/);
		if (unit) return [unit[1], unit[2]];
		if (head.length <= 9 || !head.includes(' ')) return [head];
		let best = -1;
		for (const [at, letter] of [...head].entries())
			if (
				letter === ' ' &&
				(best < 0 || Math.abs(at - head.length / 2) < Math.abs(best - head.length / 2))
			)
				best = at;
		return [head.slice(0, best), head.slice(best + 1)];
	}

	// In a table too wide for its page, only words long enough to be a sentence wrap; a short code stays whole.
	function isLong(line: LineType) {
		return line.text.length > 24;
	}

	function heightOf(sizes: FitType) {
		if (part === 'head') return sizes.head;
		if (part === 'totals') return sizes.totals;
		if (typeof part === 'number') return sizes.rows[part] ?? 0;
		return sizes.head + sizes.totals + sizes.rows.reduce((sum, row) => sum + row, 0);
	}

	// The measuring copy reads itself whenever its size changes: new cells, a font arriving, words wrapping. Sizes are
	// read as a share of the table's own, so a zoom drawn by something around it does not change them.
	const probe: Attachment<HTMLTableElement> = (node) => {
		function measure() {
			const box = node.getBoundingClientRect();
			if (!onfit || !room || !box.width || !box.height) return;
			const natural = node.offsetWidth;
			if (!isCramped && room / natural < TIGHT) {
				isCramped = true;
				return;
			}
			const across = natural / box.width;
			const down = node.offsetHeight / box.height;
			const tall = (row: HTMLTableRowElement | undefined) =>
				row ? row.getBoundingClientRect().height * down : 0;
			const body = [...(node.tBodies[0]?.rows ?? [])];
			const last = table.totals ? body.pop() : undefined;
			// A table narrower than the room is widened to fill it, each column by its share.
			const stretch = natural < room ? room / natural : 1;
			onfit({
				widths: [...(node.rows[0]?.cells ?? [])].map(
					(cell) => cell.getBoundingClientRect().width * across * stretch
				),
				width: natural * stretch,
				scale: Math.min(1, room / natural),
				isTight: isCramped,
				head: tall(node.tHead?.rows[0]),
				rows: body.map(tall),
				totals: tall(last)
			});
		}
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(node);
		return () => observer.disconnect();
	};
</script>

{#snippet cell(column: ColumnType, lines: LineType[])}
	<td class={[column.kind, column.isNumber && 'number']}>
		<div class={[isTight && !column.isNumber && lines.some(isLong) && 'wrap']}>
			{#each lines as line, at (at)}
				<div class={[at > 0 && 'second']}>
					{line.text}{#if line.unit}&nbsp;<i>{line.unit}</i>{/if}
				</div>
			{/each}
		</div>
	</td>
{/snippet}

<div
	class={['fit', onfit && 'natural']}
	style:height={fit ? `${Math.ceil(heightOf(fit) * fit.scale)}px` : undefined}
>
	<table
		class={[fit && 'fixed']}
		style:width={fit ? `${fit.width}px` : undefined}
		style:transform={fit && fit.scale < 1 ? `scale(${fit.scale})` : undefined}
		{@attach onfit ? probe : undefined}
	>
		{#if fit}
			<colgroup>
				{#each fit.widths as width, at (at)}<col style:width="{width}px" />{/each}
			</colgroup>
		{/if}
		{#if hasHead}
			<thead>
				<tr>
					{#each table.columns as column, at (at)}
						<th class={[column.kind, column.isNumber && 'number']}>
							{#each linesOf(column) as line, index (index)}{#if index}<br />{/if}{line}{/each}
							{#if column.sub}<small>{column.sub}</small>{/if}
						</th>
					{/each}
				</tr>
			</thead>
		{/if}
		<tbody>
			{#each rows as row, at (at)}
				<tr>
					{#each table.columns as column, index (index)}{@render cell(
							column,
							row[index] ?? []
						)}{/each}
				</tr>
			{/each}
			{#if totals}
				<tr class="totals">
					{#each table.columns as column, index (index)}{@render cell(
							column,
							totals[index] ?? []
						)}{/each}
				</tr>
			{/if}
		</tbody>
	</table>
</div>

<style>
	.fit.natural {
		width: max-content;
	}
	table {
		border-collapse: separate;
		border-spacing: 0;
		color: #1e293b;
		font-variant-numeric: tabular-nums;
		line-height: 1.3;
		text-align: left;
		transform-origin: 0 0;
	}
	table.fixed {
		table-layout: fixed;
	}
	th {
		border-bottom: 2px solid #0f172a;
		color: #0f172a;
		font-size: 0.8em;
		font-weight: 700;
		letter-spacing: 0.03em;
		line-height: 1.2;
		padding: 0.55em 0.75em;
		text-transform: uppercase;
		vertical-align: bottom;
		white-space: nowrap;
	}
	th small {
		color: #64748b;
		display: block;
		font-size: 1em;
		font-weight: 500;
		letter-spacing: 0;
		text-transform: none;
	}
	td {
		border-bottom: 1px solid #d3dae4;
		padding: 0.55em 0.75em;
		vertical-align: top;
		white-space: nowrap;
	}
	th:first-child,
	td:first-child {
		padding-left: 0.2em;
	}
	th:last-child,
	td:last-child {
		padding-right: 0.2em;
	}
	.number {
		text-align: right;
	}
	td.index {
		color: #94a3b8;
	}
	td.quantity {
		color: #0f172a;
		font-weight: 700;
	}
	td.item {
		color: #0f172a;
		font-weight: 600;
	}
	td i {
		color: #94a3b8;
		font-size: 0.85em;
		font-style: normal;
	}
	td .second {
		color: #64748b;
	}
	/* Words that would make the table too wide to read wrap at a widest width; numbers never do. */
	td .wrap {
		max-width: 18em;
		white-space: normal;
	}
	td.item .wrap {
		max-width: 30em;
	}
	tr.totals td {
		border-bottom: 0;
		border-top: 2px solid #0f172a;
		color: #0f172a;
		font-weight: 700;
	}
</style>
