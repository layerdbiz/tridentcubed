<script lang="ts">
	/**
	 * @tags ui, avatar
	 */
	// One round picture, a face or a logo (#379, moved from the app's look/avatar.svelte and client-logo.svelte): the
	// picture, or an icon on grey when there is none, with a presence dot at the top right or a badge at the bottom
	// right in its place. It repeats in every dashboard row, so it is one element and a picture, with no base
	// component (#365 item 7, like the menu list's rows on #297). The app draws its initials and company codes as
	// pictures and hands them over as `src` (#355).

	export type PresenceType = 'online' | 'idle' | 'offline';

	export interface AvatarProps {
		// The picture: a photo, a logo, or a drawn one. None shows `fallback`.
		src?: string;
		// Who or what it is, read out in place of the picture.
		alt?: string;
		// Its width and height in pixels.
		size?: number;
		// Round for a face, a rounded square for an app-icon style logo.
		shape?: 'circle' | 'rounded';
		// `cover` fills the circle (a photo), `contain` keeps the whole artwork on white (a logo).
		fit?: 'cover' | 'contain';
		// The frame around the picture, as classes (`ring-2 ring-white`).
		ring?: string;
		isMuted?: boolean;
		// The dot at the top right: green online, orange idle, grey offline. None shows no dot.
		presence?: PresenceType;
		// A small round picture at the bottom right, in place of the dot (the app's mark on its own people).
		badge?: string;
		// How wide the badge is, as a share of the avatar.
		badgeScale?: number;
		// The icon class shown on grey when there is no picture.
		fallback?: string;
		crossorigin?: 'anonymous' | 'use-credentials';
		title?: string;
		class?: string;
	}

	let {
		src = '',
		alt = '',
		size = 36,
		shape = 'circle',
		fit = 'cover',
		ring = '',
		isMuted = false,
		presence,
		badge,
		badgeScale = 0.42,
		fallback = 'icon-[mdi--account]',
		crossorigin,
		title,
		class: className = ''
	}: AvatarProps = $props();

	const TONES: Record<PresenceType, string> = {
		online: 'bg-success',
		idle: 'bg-warning',
		offline: 'bg-slate-400'
	};

	const round = $derived(shape === 'circle' ? 'rounded-full' : 'rounded-[24%]');
	const dot = $derived(Math.max(8, Math.round(size * 0.28)));
	const mark = $derived(Math.round(size * badgeScale));
</script>

<span
	class="relative inline-block shrink-0 {className}"
	style="width: {size}px; height: {size}px"
	{title}
>
	{#if src}
		<img
			{src}
			{alt}
			{crossorigin}
			draggable="false"
			class="size-full {round} {fit === 'contain'
				? 'bg-white object-contain'
				: 'bg-slate-200 object-cover'} {ring} {isMuted ? 'grayscale' : ''}"
		/>
	{:else}
		<span
			class="flex size-full items-center justify-center bg-slate-200 text-slate-400 {round} {ring}"
			role="img"
			aria-label={alt}><span class="{fallback} size-[58%]"></span></span
		>
	{/if}
	{#if badge}
		<span
			class="absolute -right-1 -bottom-1 overflow-hidden rounded-full bg-black ring-[1.5px] ring-white"
			style="width: {mark}px; height: {mark}px"
			><img
				src={badge}
				alt=""
				draggable="false"
				class="size-full object-cover"
			/></span
		>
	{:else if presence}
		<span
			class="absolute top-0 right-0 rounded-full ring-2 ring-white {TONES[presence]}"
			style="width: {dot}px; height: {dot}px"
			title={presence}
		></span>
	{/if}
</span>
