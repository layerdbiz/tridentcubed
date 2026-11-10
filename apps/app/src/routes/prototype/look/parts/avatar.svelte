<script lang="ts">
	// PROTOTYPE (#161): one person's photo in a white border, with a presence dot top right (Justin's note 9): green
	// online, orange idle, grey offline. Presence is made up (team.data.ts).
	import { personOf } from './look.data';
	import { presenceOf, PRESENCE_TONES } from './team.data';

	let {
		name,
		size = 36,
		ring = 'ring-white',
		isMuted = false,
		hasPresence = true
	}: {
		name: string;
		size?: number;
		ring?: string;
		isMuted?: boolean;
		hasPresence?: boolean;
	} = $props();

	const presence = $derived(presenceOf(name));
	const dot = $derived(Math.max(8, Math.round(size * 0.28)));
</script>

<span
	class="relative inline-block shrink-0"
	style="width: {size}px; height: {size}px"
>
	<img
		src={personOf(name).photo}
		alt={name}
		class="size-full rounded-full bg-slate-200 object-cover ring-2 {ring} {isMuted
			? 'grayscale'
			: ''}"
	/>
	{#if hasPresence}
		<span
			class="absolute top-0 right-0 rounded-full ring-2 ring-white {PRESENCE_TONES[presence]}"
			style="width: {dot}px; height: {dot}px"
			title={presence}
		></span>
	{/if}
</span>
