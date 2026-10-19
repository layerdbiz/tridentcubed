<script lang="ts">
	// PROTOTYPE (#161): a made-up client's logo, a rounded badge with one glyph. Stands in for the uploaded logo.
	import { clientOf } from './look.data';

	let {
		name,
		size = 40,
		isMuted = false,
		shape = 'rounded'
	}: { name: string; size?: number; isMuted?: boolean; shape?: 'rounded' | 'circle' } = $props();

	const client = $derived(clientOf(name));
</script>

<span
	class="relative inline-flex shrink-0 items-center justify-center overflow-hidden text-white shadow-sm {client.tone} {shape ===
	'circle'
		? 'rounded-full'
		: 'rounded-[30%]'} {isMuted ? 'opacity-50 grayscale' : ''}"
	style="width: {size}px; height: {size}px"
	title={client.name}
	role="img"
	aria-label="{client.name} logo"
>
	<span class="absolute -top-1/3 -right-1/3 size-full rounded-full bg-white/15"></span>
	<span
		class="{client.mark} relative"
		style="width: {size * 0.56}px; height: {size * 0.56}px"
	></span>
</span>
