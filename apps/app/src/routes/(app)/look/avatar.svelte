<script lang="ts">
	// PROTOTYPE (#161): one person's photo in a white border, with a presence dot top right (Justin's note 9): green
	// online, orange idle, grey offline, from when the server last saw them (`presenceOf`). A list that keeps its own
	// time (the menu's Online panel, #331) gives the dot it read, so the dot and its words never disagree.
	import { toCrossOrigin } from '#lib/files/files.schema.js';
	import {
		initialsOf,
		isInitialsPicture,
		toInitialsPicture,
		type InitialsToneType
	} from './initials';
	import { personOf, presenceOf } from './look.data';
	import { PRESENCE_TONES, type PresenceType } from './team.data';

	let {
		name,
		size = 36,
		ring = 'ring-white',
		isMuted = false,
		hasPresence = true,
		badge,
		badgeScale = 0.42,
		presence: given,
		tone
	}: {
		name: string;
		size?: number;
		ring?: string;
		isMuted?: boolean;
		hasPresence?: boolean;
		// A mark to wear at the bottom right, in place of the presence dot: on the report it marks the organization's
		// own people (run 32). It is a round picture that fills the mark, under half as wide as the face: the app's own
		// icon, the bright logo on black (Justin, 2026-11-19, #246; before that the light logo on white, top right).
		badge?: string;
		// How wide the mark is, as a share of the face: smaller on a big photo (the report's signature).
		badgeScale?: number;
		// The dot to show, when the screen has read it already.
		presence?: PresenceType;
		// Whose initials these are when there is no photo, in place of the Team record's role: a project's Personnel
		// (black on white, #355).
		tone?: InitialsToneType;
	} = $props();

	const presence = $derived(given ?? presenceOf(name));
	// Someone with no photo yet shows their initials on their role's colour (#355), never a person icon.
	const saved = $derived(personOf(name).photo);
	const photo = $derived(
		tone && isInitialsPicture(saved) ? toInitialsPicture(initialsOf(name), tone) : saved
	);
	const dot = $derived(Math.max(8, Math.round(size * 0.28)));
</script>

<span
	class="relative inline-block shrink-0"
	style="width: {size}px; height: {size}px"
>
	{#if isInitialsPicture(photo) && !initialsOf(name)}
		<!-- No name typed yet, so no letters: the person icon on grey. -->
		<span
			class="flex size-full items-center justify-center rounded-full bg-slate-200 text-slate-400 ring-2 {ring}"
			role="img"
			aria-label={name}><span class="icon-[mdi--account] size-[62%]"></span></span
		>
	{:else}
		<img
			src={photo}
			crossorigin={toCrossOrigin(photo)}
			alt={name}
			draggable="false"
			class="size-full rounded-full bg-slate-200 object-cover ring-2 {ring} {isMuted
				? 'grayscale'
				: ''}"
		/>
	{/if}
	{#if badge}
		<span
			class="absolute -right-1 -bottom-1 overflow-hidden rounded-full bg-black ring-[1.5px] ring-white"
			style="width: {Math.round(size * badgeScale)}px; height: {Math.round(size * badgeScale)}px"
			><img
				src={badge}
				alt=""
				draggable="false"
				class="size-full object-cover"
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
