<script lang="ts">
	// PROTOTYPE (#161): a stand-in QR code, drawn from the document number. It does not scan; V1 makes a real one
	// that opens this report.
	let { value, size = 56 }: { value: string; size?: number } = $props();

	const N = 25;
	const cells = $derived.by(() => {
		let hash = 7;
		for (const char of value) hash = (hash * 131 + char.charCodeAt(0)) >>> 0;
		const list: [number, number][] = [];
		for (let y = 0; y < N; y += 1)
			for (let x = 0; x < N; x += 1) {
				const isFinder = (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
				if (isFinder) continue;
				hash = (hash * 1103515245 + 12345) >>> 0;
				if ((hash >>> 16) % 100 < 46) list.push([x, y]);
			}
		return list;
	});
</script>

{#snippet finder(x: number, y: number)}
	<rect
		x={x + 0.5}
		y={y + 0.5}
		width="6"
		height="6"
		rx="1.6"
		fill="none"
		stroke="currentColor"
		stroke-width="1"
	/>
	<rect
		x={x + 2}
		y={y + 2}
		width="3"
		height="3"
		rx="0.8"
		fill="currentColor"
	/>
{/snippet}

<svg
	viewBox="0 0 {N} {N}"
	width={size}
	height={size}
	class="shrink-0 text-slate-900"
	role="img"
	aria-label="QR code for {value} (stand-in)"
>
	{@render finder(0, 0)}
	{@render finder(N - 7, 0)}
	{@render finder(0, N - 7)}
	{#each cells as [x, y] (`${x}-${y}`)}
		<rect
			{x}
			{y}
			width="1"
			height="1"
			rx="0.3"
			fill="currentColor"
		/>
	{/each}
</svg>
