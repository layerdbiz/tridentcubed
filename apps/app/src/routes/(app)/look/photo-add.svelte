<script
	lang="ts"
	module
>
	/** The tile's look, for one that adds from a list instead of a file (a Menu's trigger beside it). */
	export const ADD_TILE =
		'relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-primary/[0.06] text-primary/70 transition focus-within:ring-2 focus-within:ring-primary/40 hover:bg-primary/10 hover:text-primary';
</script>

<script lang="ts">
	// The tile that adds photos to an edit panel: Upload or Camera in a Project panel's photo group, and the same for an
	// Email Signature's photo and banners (Justin, 2026-11-27: "we need to use the other components for the photos that
	// we've already got"). A pale blue tile with its icon and word over a file input, lit while the input has the focus.
	// Its shape comes from outside: square in a grid of photos, wider beside a banner.
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		icon,
		label,
		isBusy = false,
		class: className = 'aspect-square',
		...input
	}: Omit<HTMLInputAttributes, 'type' | 'class'> & {
		icon: string;
		label: string;
		/** A file it took is on its way. */
		isBusy?: boolean;
		class?: string;
	} = $props();
</script>

<label
	class="{ADD_TILE} {className}"
	aria-busy={isBusy}
>
	<span class="{isBusy ? 'icon-[svg-spinners--ring-resize]' : icon} size-6"></span>
	<span class="text-[11px] font-medium">{label}</span>
	<input
		type="file"
		class="sr-only"
		{...input}
	/>
</label>
