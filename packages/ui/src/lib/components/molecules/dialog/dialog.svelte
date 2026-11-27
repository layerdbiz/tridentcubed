<script lang="ts">
	/**
	 * @tags dialog, sheet, modal, popover
	 * @layout horizontal
	 */
	// The Dialog (glossary, #375): the box that opens over the page. On a phone it slides up from the bottom as a
	// sheet; drag it down (or flick it) or tap outside to close; dragging up only stretches a little and springs back.
	// No close button. From md up it is a centred box (the help's kind stays a sheet). Escape closes it too. It is the browser's own <dialog>, in the
	// top layer, so it covers the floating bar wherever it is opened from, and its colour runs on below its bottom
	// edge, so dragging it up never shows a gap. It began as the app's sheet (Justin's note 14, from the look
	// prototype #161: the install how-to, add, save, change status, confirm, the dashboard ? cards).
	//
	// Its look is set from outside (Justin, 2026-11-26), like the Button's: it is the base component, and `color`,
	// `appearance`, their shorthands and `class` land on the sheet, the box that shows, which is white until it is
	// given a look (the theme's surface). The scrim, the sheet's shadow and its grab handle are the theme's too
	// (css/1-theme/overlay.css).
	//
	// It opens as a modal: the page behind it is shut until it closes, and the focus goes into it, onto the dialog
	// itself rather than its first input, so a phone's keyboard does not jump up (an input marked autofocus takes it
	// instead), and back to what opened it when it closes. `isModal={false}` is the help ?'s kind (#284): it opens
	// beside an input being typed in, so it never takes the focus, a press on it never moves it, and it rises above
	// the phone's keyboard. That kind is drawn in a plain box with the dialog role, as a popover, because a <dialog>
	// always takes the focus when it is shown, even as a popover.
	//
	// `variant="tall"` is for a long read (What's New, the new version's changes, #396): it fills a phone's screen up
	// to the status bar and stands 36rem wide and up to 88% of the window's height from md up. Its `header` and
	// `footer` stay put while what is between them scrolls, and a pull that starts in that middle scrolls it rather
	// than closing the sheet. The default sheet is as tall as what it holds; a `header` or `footer` given to it sits
	// above or below the rest. `variant="full"` is the tall one that, on a phone, fills the whole screen, edge to edge
	// and top to bottom, with no grab handle and no pull to close: it closes on the X its header gives, or Escape (Justin,
	// 2026-11-27, for What's New). `fade` fades the tall middle out at the edges it names as it scrolls, through the
	// library Scroller, which takes any other Scroller prop through `scroller`, as the Accordion's Delete takes Button
	// props through `deleteButton`: what it `keep`s whole, its `depth`, its `inset`.
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { fade as dim, fly } from 'svelte/transition';
	import {
		Component,
		Scroller,
		type ComponentProps,
		type ComponentReturn,
		type ScrollerProps
	} from '@layerd/ui';

	export interface DialogProps extends Omit<ComponentProps, 'label' | 'children'> {
		/** What it holds, read out when it opens: "Change Status". */
		label: string;
		/** Asked to close, on Escape, a tap outside or a pull down: the place that opened it takes it away. */
		onclose: () => void;
		/** False for the help ?: the focus stays in the input being typed in and the page stays live. */
		isModal?: boolean;
		/**
		 * `tall` for a long read: near the full screen, the middle scrolling between the header and the footer. `full`:
		 * the same, filling a phone's whole screen, with no grab handle.
		 */
		variant?: 'sheet' | 'tall' | 'full';
		/** The edges a tall one's middle fades out at as it scrolls: `y` for the top and the bottom. */
		fade?: ScrollerProps['fade'];
		/** The tall middle's other Scroller props, set from outside: what it keeps whole, its depth, its inset. */
		scroller?: Partial<ScrollerProps>;
		/** Stays at the top while the middle scrolls: a title, a close. */
		header?: Snippet;
		/** Stays at the foot while the middle scrolls: the button that ends it. */
		footer?: Snippet;
		children: Snippet;
	}

	let {
		label,
		onclose,
		isModal = true,
		variant = 'sheet',
		fade = [],
		scroller = {},
		header,
		footer,
		children,
		...props
	}: DialogProps = $props();

	const isFull = $derived(variant === 'full');
	const isTall = $derived(variant === 'tall' || isFull);

	let offset = $state(0);
	let isDragging = $state(false);
	let lift = $state(0);
	let start = 0;
	let samples: { y: number; t: number }[] = [];

	function down(event: PointerEvent) {
		// One finger or the main button, and only on this sheet: a sheet opened inside it pulls by itself.
		// A full one is never pulled: it has no handle, and fills the screen.
		if (isFull || !event.isPrimary || event.button !== 0) return;
		const target = event.target as HTMLElement;
		if (target.closest('.dialog-sheet') !== event.currentTarget) return;
		if (target.closest('button, a, input, select, textarea, label, .dialog-scroll')) return;
		(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
		isDragging = true;
		start = event.clientY;
		samples = [{ y: event.clientY, t: event.timeStamp }];
	}

	function move(event: PointerEvent) {
		if (!isDragging) return;
		const dy = event.clientY - start;
		// Up is a rubber band: it gives a little, then stops.
		offset = dy >= 0 ? dy : -18 * (1 - Math.exp(dy / 60));
		samples.push({ y: event.clientY, t: event.timeStamp });
		samples = samples.filter((sample) => event.timeStamp - sample.t < 100);
	}

	function up(event: PointerEvent) {
		if (!isDragging) return;
		isDragging = false;
		const first = samples[0];
		const speed = first ? (event.clientY - first.y) / Math.max(1, event.timeStamp - first.t) : 0;
		if (offset > 110 || speed > 0.6) onclose();
		else offset = 0;
	}

	// Escape on a modal. A cancel the browser will not hold back (Chrome's, with no tap since the last one) closes the
	// dialog anyway, and the close that follows asks then.
	function cancel(event: Event) {
		event.preventDefault();
		if (event.defaultPrevented) onclose();
	}

	// What a phone's keyboard covers of the window's foot: the help's sheet rises by that much.
	function placeAboveKeyboard() {
		const seen = window.visualViewport;
		lift = seen ? Math.max(0, Math.round(window.innerHeight - seen.offsetTop - seen.height)) : 0;
	}

	const show: Attachment<HTMLElement> = (node) => {
		if (!(node instanceof HTMLDialogElement)) {
			// Safari 16 has no popovers: there it is an ordinary fixed box, kept on top by its z-index.
			node.showPopover?.();
			return;
		}
		const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		node.autofocus = !node.querySelector('[autofocus]');
		node.showModal();
		// Chrome hands the focus to the scrim, its first button, whatever autofocus says: it is moved on.
		const first = node.querySelector<HTMLElement>('[autofocus]') ?? node;
		if (document.activeElement !== first) first.focus({ preventScroll: true });
		return () => {
			const active = document.activeElement;
			const isFocusLost = !active || active === document.body || node.contains(active);
			if (opener?.isConnected && isFocusLost) opener.focus({ preventScroll: true });
		};
	};

	$effect(() => {
		if (isModal) return;
		placeAboveKeyboard();
		const seen = window.visualViewport;
		seen?.addEventListener('resize', placeAboveKeyboard);
		seen?.addEventListener('scroll', placeAboveKeyboard);
		return () => {
			seen?.removeEventListener('resize', placeAboveKeyboard);
			seen?.removeEventListener('scroll', placeAboveKeyboard);
		};
	});
</script>

<svelte:window onkeydown={(event) => !isModal && event.key === 'Escape' && onclose()} />

<Component {...props}>
	{#snippet component({ props: root }: { props: ComponentReturn })}
		{@const { class: look = '', ...layer } = root}
		<svelte:element
			this={isModal ? 'dialog' : 'div'}
			{...layer}
			class="dialog"
			popover={isModal ? undefined : 'manual'}
			role={isModal ? undefined : 'dialog'}
			aria-label={label}
			tabindex="-1"
			style={`${layer.style ? `${layer.style}; ` : ''}--dialog-lift: ${lift}px`}
			oncancel={cancel}
			onclose={() => onclose()}
			onmousedown={isModal ? undefined : (event: MouseEvent) => event.preventDefault()}
			{@attach show}
		>
			<button
				type="button"
				class="fixed inset-0 cursor-default border-0 bg-scrim p-0"
				aria-label="Close"
				tabindex="-1"
				onclick={() => onclose()}
				transition:dim|global={{ duration: 180 }}
			></button>
			<div
				class="dialog-sheet fixed inset-x-0 bottom-(--dialog-lift) touch-none {isFull
					? 'top-0 pt-[env(safe-area-inset-top)]'
					: 'rounded-t-[28px] pt-3'} {/\btheme-/.test(look)
					? ''
					: 'bg-surface'} px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-sheet after:absolute after:inset-x-0 after:top-full after:h-40 after:bg-inherit {look} {isTall
					? 'flex flex-col'
					: ''} {isTall && !isFull ? 'top-[calc(env(safe-area-inset-top)+0.75rem)]' : ''} {isModal
					? 'md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[28px] md:pt-5 md:after:hidden'
					: ''} {isModal && isTall ? 'md:h-[min(52rem,88vh)] md:w-[36rem]' : ''} {isModal && !isTall
					? 'md:w-[26rem]'
					: ''} {isDragging
					? ''
					: 'transition-[transform,translate,bottom] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'}"
				style="transform: translateY({offset}px)"
				role="presentation"
				onpointerdown={down}
				onpointermove={move}
				onpointerup={up}
				onpointercancel={up}
				transition:fly|global={{ y: 320, duration: 260 }}
			>
				{#if !isFull}
					<span
						class="mx-auto mb-4 block h-1.5 w-10 shrink-0 rounded-full bg-grab {isModal
							? 'md:hidden'
							: ''}"
					></span>
				{/if}
				{@render header?.()}
				{#if isTall}
					<Scroller
						{...scroller}
						{fade}
						class="dialog-scroll -mx-5 min-h-0 flex-1 touch-pan-y overscroll-contain px-5 {scroller.class ??
							''}"
					>
						{@render children()}
					</Scroller>
				{:else}
					{@render children()}
				{/if}
				{@render footer?.()}
			</div>
		</svelte:element>
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#ui.css";

	/* The browser's own box is undone: the dialog is a clear layer the size of the window, and what shows is the
	   scrim and the sheet inside it. */
	:global(.dialog) {
		@apply fixed inset-0 z-[110] m-0 size-full max-h-none max-w-none overflow-visible border-0 bg-transparent p-0 outline-none;
	}

	:global(.dialog::backdrop) {
		@apply bg-transparent;
	}
</style>
