<script
	lang="ts"
	module
>
	// The box's size, the dot's and the badge's, as one style made once for each avatar (#379, measured).
	function toBoxStyle(size: number, badge: string | undefined, badgeScale: number) {
		const box = `width: ${size}px; height: ${size}px; --dot: ${Math.max(8, Math.round(size * 0.28))}px`;
		return badge
			? `${box}; --badge: url("${badge}"); --mark: ${Math.round(size * badgeScale)}px`
			: box;
	}
</script>

<script lang="ts">
	/**
	 * @tags ui, avatar
	 */
	// One round picture, a face or a logo (#379, moved from the app's look/avatar.svelte and client-logo.svelte): the
	// picture, or an icon on grey when there is none, with a presence dot at the top right or a badge at the bottom
	// right in its place. It repeats in every dashboard row, so it is one element and a picture, with no base
	// component (#365 item 7, like the menu list's rows on #297), and the dot and the badge are drawn by the element
	// itself rather than elements of their own. The app draws its initials and company codes as pictures and hands
	// them over as `src` (#355).

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
</script>

<!-- No whitespace between the parts: every space is one more node in every row (#379, measured). -->
<span
	class="avatar relative inline-block shrink-0 {className}"
	style={toBoxStyle(size, badge, badgeScale)}
	data-presence={badge ? undefined : presence}
	data-badge={badge ? '' : undefined}
	{title}
	>{#if src}<img
			{src}
			{alt}
			{crossorigin}
			draggable="false"
			class="size-full {shape === 'circle' ? 'rounded-full' : 'rounded-[24%]'} {fit === 'contain'
				? 'bg-white object-contain'
				: 'bg-slate-200 object-cover'} {ring} {isMuted ? 'grayscale' : ''}"
		/>{:else}<span
			class="flex size-full items-center justify-center bg-slate-200 text-slate-400 {shape ===
			'circle'
				? 'rounded-full'
				: 'rounded-[24%]'} {ring}"
			role="img"
			aria-label={alt}><span class="{fallback} size-[58%]"></span></span
		>{/if}</span
>

<style lang="postcss">
	@reference "#ui.css";

	/* The presence dot: green online, orange idle, grey offline. */
	.avatar[data-presence]::after {
		content: '';
		width: var(--dot);
		height: var(--dot);
		@apply absolute top-0 right-0 rounded-full ring-2 ring-white;
	}
	.avatar[data-presence='online']::after {
		@apply bg-success;
	}
	.avatar[data-presence='idle']::after {
		@apply bg-warning;
	}
	.avatar[data-presence='offline']::after {
		@apply bg-slate-400;
	}

	/* The badge: a small round picture on black at the bottom right. */
	.avatar[data-badge]::after {
		content: '';
		width: var(--mark);
		height: var(--mark);
		background: black var(--badge) center / cover no-repeat;
		@apply absolute -right-1 -bottom-1 rounded-full ring-[1.5px] ring-white;
	}
</style>
