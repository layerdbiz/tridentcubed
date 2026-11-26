<script lang="ts">
	/**
	 * @tags forms, help, popover, sheet
	 * @layout horizontal
	 */
	// The ? that opens an input's Help text (glossary), settled on "Prototype inputs with help and generated values"
	// (#284). A mouse gets a pop-up by the ? on hover, kept on a click; a finger gets a sheet from the bottom, above the
	// keyboard when one is up. Neither the ? nor what it opens ever takes the focus, so the input being typed in keeps
	// its caret and the phone keeps its keyboard, and nothing on the screen moves. The sheet is the library's Dialog
	// in its help kind (#375), which keeps the focus where it is and rises above the keyboard by itself.
	import type { Attachment } from 'svelte/attachments';
	import { scale } from 'svelte/transition';
	import { Component, Dialog, type ComponentProps, type ComponentReturn } from '@layerd/ui';

	export interface HelpProps extends ComponentProps {
		/** The input's label: the ? is named for it and the help opens under it. */
		label: string;
		/** The Help text. */
		text: string;
	}

	let { label, text, ...props }: HelpProps = $props();

	const POP_WIDTH = 272;

	let button = $state<HTMLButtonElement | null>(null);
	let pop = $state<HTMLDivElement | null>(null);
	let mode = $state<'pop' | 'sheet'>();
	let isPinned = $state(false);
	let at = $state({ x: 0, y: 0, isAbove: false });
	// The input being typed in when the ? was pressed, given its focus back should a browser move it anyway.
	let typingIn: HTMLElement | null = null;

	function hasMouse(): boolean {
		return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
	}

	// The pop-up opens under the ?, or over it when the window has no room below.
	function placePop(): void {
		if (!button) return;
		const box = button.getBoundingClientRect();
		const x = Math.min(window.innerWidth - POP_WIDTH - 8, Math.max(8, box.left - 14));
		const isAbove = box.bottom + 170 > window.innerHeight && box.top > 170;
		at = { x, y: isAbove ? box.top - 10 : box.bottom + 10, isAbove };
	}

	function open(next: 'pop' | 'sheet', isKept: boolean): void {
		if (next === 'pop') placePop();
		mode = next;
		isPinned = isKept;
	}

	function close(): void {
		mode = undefined;
		isPinned = false;
	}

	function press(): void {
		const active = document.activeElement;
		const field = button?.closest('fieldset');
		typingIn = active instanceof HTMLElement && field?.contains(active) ? active : null;
	}

	function ask(): void {
		if (mode && (isPinned || mode === 'sheet')) close();
		else open(hasMouse() ? 'pop' : 'sheet', true);
		if (typingIn?.isConnected && document.activeElement !== typingIn)
			typingIn.focus({ preventScroll: true });
		typingIn = null;
	}

	function point(event: PointerEvent): void {
		if (event.pointerType === 'mouse' && !isPinned) open('pop', false);
	}

	function leave(event: PointerEvent): void {
		if (event.pointerType === 'mouse' && !isPinned && mode === 'pop') close();
	}

	// A kept pop-up shuts on a click anywhere else.
	function clickAway(event: MouseEvent): void {
		if (mode !== 'pop' || !isPinned || !(event.target instanceof Node)) return;
		if (!button?.contains(event.target) && !pop?.contains(event.target)) close();
	}

	// Into the browser's top layer, so no panel, bar or scrolling box covers or clips it. Safari 16 has no popovers:
	// there it stays a fixed box, kept on top by its z-index.
	const toTop: Attachment<HTMLElement> = (node) => {
		node.showPopover?.();
	};
</script>

<svelte:window
	onkeydown={(event) => event.key === 'Escape' && mode && close()}
	onclick={clickAway}
	onscroll={() => mode === 'pop' && !isPinned && close()}
/>

<Component {...props}>
	{#snippet component({ props }: { props: ComponentReturn })}
		<button
			{...props}
			bind:this={button}
			type="button"
			class={`${props.class ?? ''} help`.trim()}
			aria-label="What goes in {label}?"
			aria-expanded={Boolean(mode)}
			onmousedown={(event) => event.preventDefault()}
			onpointerdown={press}
			onpointerenter={point}
			onpointerleave={leave}
			onclick={ask}><span class="help-icon icon-[mdi--help-circle]"></span></button
		>
	{/snippet}
</Component>

{#if mode === 'pop'}
	<div
		bind:this={pop}
		popover="manual"
		role="tooltip"
		class="help-pop"
		class:is-above={at.isAbove}
		style="left: {at.x}px; top: {at.y}px; width: {POP_WIDTH}px"
		{@attach toTop}
		transition:scale={{ start: 0.96, duration: 140 }}
	>
		<b>{label}</b>{text}
	</div>
{:else if mode === 'sheet'}
	<Dialog
		{label}
		isModal={false}
		class="help-layer"
		onclose={close}
	>
		<b class="mb-1.5 block text-lg font-semibold text-slate-900">{label}</b>
		<p class="m-0 text-[15px] leading-relaxed text-slate-600">{text}</p>
	</Dialog>
{/if}

<style lang="postcss">
	@reference "#ui.css";

	/* The ? itself: a filled question mark with a touch area bigger than it. Its colour follows the field's icons
	   (forms.css). App-like taps: no browser flash, no wait for a double tap, no focus ring from a tap. */
	.help {
		@apply pointer-events-auto relative inline-grid shrink-0 cursor-pointer place-items-center border-0 bg-transparent p-0;
		@apply size-[1.3em] transition-[color,opacity,width,margin] duration-150;
		-webkit-tap-highlight-color: transparent;
		-webkit-touch-callout: none;
		touch-action: manipulation;
	}

	.help::before {
		@apply absolute -inset-3 content-[''];
	}

	.help:focus:not(:focus-visible) {
		@apply outline-0;
	}

	.help-icon {
		@apply block size-full;
	}

	/* What it opens is drawn outside the label, so none of the label's type carries over. The sheet's layer is drawn
	   by the Dialog, outside this file's scope. */
	.help-pop,
	:global(.help-layer) {
		@apply pointer-events-auto m-0 border-0 p-0 text-left font-normal tracking-normal whitespace-normal select-text;
		font-size: 1rem;
		line-height: 1.5;
		-webkit-tap-highlight-color: transparent;
	}

	.help-pop {
		@apply pointer-events-none fixed inset-auto z-[120] h-fit rounded-2xl bg-base-900 px-3.5 py-3 text-xs text-white/90 shadow-xl;
		transform-origin: top left;
	}

	.help-pop.is-above {
		transform: translateY(-100%);
		transform-origin: bottom left;
	}

	.help-pop b {
		@apply mb-0.5 block text-sm font-semibold text-white;
	}
</style>
