<script lang="ts">
	// PROTOTYPE (#161) run 35: a real QR code (Justin, 2026-11-12: "I just want the QR code to work"). It encodes
	// the link it is given with uqr and draws the modules as plain black squares in one path, so a phone's camera
	// reads it off a screen or a printed page. For now every report's code opens the organization's website; a link
	// to the report itself comes with the database, when a report has an address of its own.
	import { encode } from 'uqr';

	let { value, size = 56 }: { value: string; size?: number } = $props();

	// Medium error correction: it still reads with a little of it smudged or cut off in print.
	const code = $derived(encode(value, { ecc: 'M', border: 0 }));
	const path = $derived.by(() => {
		let d = '';
		for (const [y, row] of code.data.entries())
			for (const [x, isDark] of row.entries()) if (isDark) d += `M${x} ${y}h1v1h-1z`;
		return d;
	});
</script>

<svg
	viewBox="0 0 {code.size} {code.size}"
	width={size}
	height={size}
	class="shrink-0 text-slate-950"
	shape-rendering="crispEdges"
	role="img"
	aria-label="QR code for {value}"
>
	<path
		d={path}
		fill="currentColor"
	/>
</svg>
