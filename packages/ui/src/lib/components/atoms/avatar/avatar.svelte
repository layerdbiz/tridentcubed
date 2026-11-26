<script
	lang="ts"
	module
>
	import { initialsOf, toInitialsPicture, type InitialsToneType } from '@layerd/ui';

	// No picture: the name's initials, or the letters given, drawn on the tone's colours (#355).
	function toLetters(name = '', initials = '', tone: InitialsToneType = 'team') {
		const letters = initials || initialsOf(name);
		return letters ? toInitialsPicture(letters, tone) : '';
	}

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
	import { Component, type ComponentProps, type ComponentRenderArgs } from '@layerd/ui';
	// Every little round picture in the app, a face or a logo (#379, Justin, 2026-11-26: one component, never
	// several): the photo or logo; with none, the name's initials (or a company's code) on the colours of its role or
	// kind (#355); with no letters either, an icon on grey, or on a colour it is given. A presence dot sits at the top
	// right, or a badge at the bottom right in its place, both drawn by the element itself.
	//
	// It is the base component (Justin, 2026-11-26), so `color`, `appearance`, their shorthands and `class` land on its
	// box. It repeats in every dashboard row, so it takes the base component's light path: one element and a picture,
	// one {#if}, no whitespace between the parts (measured on #379 and again on 2026-11-26). Its frame (`ring`) and
	// its icon's colours (`tint`) are set from outside; the grey under a photo and the default tint are still slate,
	// listed in packages/ui/look.json until the theme has a colour for them.

	export type PresenceType = 'online' | 'idle' | 'offline';

	export interface AvatarProps extends Omit<ComponentProps, 'size' | 'label' | 'children'> {
		// The picture: a photo or a logo. None draws the initials.
		src?: string;
		// Who or what it is: read out in place of the picture, and its initials when there is none.
		name?: string;
		// The letters to draw instead of the name's: a company's code.
		initials?: string;
		// Whose initials they are, which sets their colours: a person's role (admin, manager, team), a customer, a
		// project's Personnel, or another company. Team when not given.
		tone?: InitialsToneType;
		// What is read out, when it is not the name (a company's "logo").
		alt?: string;
		// Its width and height in pixels.
		size?: number;
		// Round for a face, a rounded square for an app-icon style logo.
		shape?: 'circle' | 'rounded';
		// `cover` fills the circle (a photo), `contain` keeps the whole artwork on the theme's surface, white (a logo).
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
		// The icon class shown when there is no picture and no letters.
		fallback?: string;
		// The icon's circle colours, as classes: grey unless given (a transport's mode on its own colour).
		tint?: string;
		crossorigin?: 'anonymous' | 'use-credentials';
		title?: string;
		class?: string;
	}

	let {
		src = '',
		name,
		initials,
		tone,
		alt,
		size = 36,
		shape = 'circle',
		fit = 'cover',
		ring = '',
		isMuted = false,
		presence,
		badge,
		badgeScale = 0.42,
		fallback = 'icon-[mdi--account]',
		tint = 'bg-slate-200 text-slate-400',
		crossorigin,
		title,
		class: className = '',
		...props
	}: AvatarProps = $props();

	const picture = $derived(src || toLetters(name, initials, tone));
</script>

<!-- No whitespace between the parts: every space is one more node in every row (#379, measured). -->
<Component
	{...props}
	tag="span"
	class={`avatar relative inline-block shrink-0 ${className}`}
	>{#snippet component({ props: root }: ComponentRenderArgs)}<span
			{...root}
			style={toBoxStyle(size, badge, badgeScale)}
			data-presence={badge ? undefined : presence}
			data-badge={badge ? '' : undefined}
			{title}
			>{#if picture}<img
					src={picture}
					alt={alt ?? name ?? ''}
					{crossorigin}
					draggable="false"
					class="size-full {shape === 'circle' ? 'rounded-full' : 'rounded-[24%]'} {fit ===
					'contain'
						? 'bg-surface object-contain'
						: 'bg-slate-200 object-cover'} {ring} {isMuted ? 'grayscale' : ''}"
				/>{:else}<span
					class="flex size-full items-center justify-center {tint} {shape === 'circle'
						? 'rounded-full'
						: 'rounded-[24%]'} {ring}"
					role="img"
					aria-label={alt ?? name ?? ''}><span class="{fallback} size-[58%]"></span></span
				>{/if}</span
		>{/snippet}</Component
>

<style lang="postcss">
	@reference "#ui.css";

	/* The presence dot: green online, orange idle, grey offline. */
	.avatar[data-presence]::after {
		content: '';
		width: var(--dot);
		height: var(--dot);
		@apply absolute top-0 right-0 rounded-full ring-2 ring-surface;
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
		@apply absolute -right-1 -bottom-1 rounded-full ring-[1.5px] ring-surface;
	}
</style>
