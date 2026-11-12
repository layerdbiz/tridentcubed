<script lang="ts">
	// PROTOTYPE (#161): one person's photo in a white border, with a presence dot top right (Justin's note 9): green
	// online, orange idle, grey offline. Presence is made up (team.data.ts).
	import { toCrossOrigin } from '#lib/files/files.schema.js';
	import { personOf, presenceOf } from './look.data';
	import { PRESENCE_TONES } from './team.data';

	let {
		name,
		size = 36,
		ring = 'ring-white',
		isMuted = false,
		hasPresence = true,
		badge
	}: {
		name: string;
		size?: number;
		ring?: string;
		isMuted?: boolean;
		hasPresence?: boolean;
		// A logo to wear at the top right, white on a black circle, in place of the presence dot: on the report it
		// marks the organization's own people (run 32).
		badge?: string;
	} = $props();

	const presence = $derived(presenceOf(name));
	// Someone with no photo yet shows a person icon on grey, the way a customer with no logo shows its page's icon.
	const photo = $derived(personOf(name).photo);
	const hasPhoto = $derived(!photo.startsWith('data:image/svg+xml,'));
	const dot = $derived(Math.max(8, Math.round(size * 0.28)));
</script>

<span
	class="relative inline-block shrink-0"
	style="width: {size}px; height: {size}px"
>
	{#if hasPhoto}
		<img
			src={photo}
			crossorigin={toCrossOrigin(photo)}
			alt={name}
			class="size-full rounded-full bg-slate-200 object-cover ring-2 {ring} {isMuted
				? 'grayscale'
				: ''}"
		/>
	{:else}
		<span
			class="flex size-full items-center justify-center rounded-full bg-slate-200 text-slate-400 ring-2 {ring}"
			role="img"
			aria-label={name}><span class="icon-[mdi--account] size-[62%]"></span></span
		>
	{/if}
	{#if badge}
		<span
			class="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-black ring-1 ring-white"
			style="width: {Math.round(size * 0.42)}px; height: {Math.round(size * 0.42)}px"
			><img
				src={badge}
				alt=""
				draggable="false"
				class="size-[68%] object-contain brightness-0 invert"
			/></span
		>
	{:else if hasPresence}
		<span
			class="absolute top-0 right-0 rounded-full ring-2 ring-white {PRESENCE_TONES[presence]}"
			style="width: {dot}px; height: {dot}px"
			title={presence}
		></span>
	{/if}
</span>
