<script lang="ts">
	/**
	 * @tags toast, progress, status, message
	 */
	// A Toast (glossary, #293): a short message that pops up over the page. Given `progress` (toast.svelte.ts) it shows
	// what is happening, a percent and a bar from the moment the work starts until it is done; the bar's sheen keeps
	// moving between real steps, so it always looks alive (Justin, 2026-11-18). A failure keeps it open with the reason,
	// Try Again and Close. It began as the PDF download's toast in the app (#240) and keeps its look. Each job gets its
	// own toast, and the page stacks them in a column; each slides in from below, like the toggle's toast look, and
	// slides out too when the page takes it off its stack (a global transition).
	// Given `items` (#305) it lists them under its message, each a tap that does what it says (the app's list of the
	// empty inputs that keep a percent under 100%, each opening its input). Such a toast stays until it is closed or
	// its list is empty: it never goes by itself.
	//
	// Its look is set from outside (Justin, 2026-11-26): it is the base component, and `color`, `appearance`, their
	// shorthands and `class` land on the box that shows, which is the theme's secondary with the surface's colour for
	// its words until it is given a look. What is inside takes its greys from the box's words, so it follows any look.
	// Its Close and Try Again are the library Button, reached through `closeButton` and `retryButton`.
	//
	// A short message may have an `icon` before it (the library Icon), and be a tap (`onclick`, #392: the update
	// note's "New version, tap to update"): then the whole toast is a button, which takes taps, and `disabled` holds
	// it while the tap is in hand. A button cannot be a status region itself, so a tap toast sits in one that stays
	// in the page while the toast is hidden, and a screen reader hears the message the moment it shows; that region
	// would still take a gap in a stack of toasts, so a tap toast stands on its own.
	import { fly } from 'svelte/transition';
	import {
		Button,
		Component,
		Icon,
		type ButtonProps,
		type ComponentProps,
		type ComponentReturn,
		type Progress
	} from '@layerd/ui';

	/** One entry of a toast's list: what it says, and what a tap on it does. */
	export type ToastItemType = { label: string; onclick: () => void };

	export interface ToastProps extends Omit<ComponentProps, 'label'> {
		/** The work under way: the toast shows while it is open. */
		progress?: Progress;
		/** A short message, shown while it is not empty, when there is no `progress`. */
		text?: string;
		/** What the work is called, read out for the bar: "Download PDF". */
		label?: string;
		/** A list under the message, each entry a tap; the toast shows while the list has something in it. */
		items?: ToastItemType[];
		/** Puts a Close at the top right of a toast with a list. */
		onclose?: () => void;
		/** Any Button prop for its Close: the × of a toast with a list, and a failure's Close. */
		closeButton?: Partial<ButtonProps>;
		/** Any Button prop for a failure's Try Again. */
		retryButton?: Partial<ButtonProps>;
		/** An icon before a short message, as the library Icon takes it: "icon-[mdi--arrow-up-circle-outline]". */
		icon?: string;
		/** Makes a short message a tap that runs this; such a toast stays in a status region of its own. */
		onclick?: () => void;
	}

	let {
		progress,
		text = '',
		label = '',
		items,
		onclose,
		closeButton = {},
		retryButton = {},
		icon,
		onclick,
		...props
	}: ToastProps = $props();

	const isShown = $derived(progress ? progress.isOpen : items ? items.length > 0 : Boolean(text));
	// Taps go through a toast to what is under it, except on a failure's Try Again and Close.
	// A list is tapped, so a toast with one takes taps everywhere.
	const shape = $derived(
		items
			? 'pointer-events-auto w-full max-w-sm rounded-2xl py-3 pr-2 pl-4'
			: !progress
				? `rounded-full px-4 py-2.5 ${icon ? 'flex items-center gap-2' : ''} ${onclick && !props.disabled ? 'pointer-events-auto cursor-pointer' : ''}`
				: `w-full max-w-sm rounded-2xl px-4 py-3 ${progress.problem ? 'pointer-events-auto' : ''}`
	);
</script>

<Component {...props}>
	{#snippet component({ props: root }: { props: ComponentReturn })}
		{#if onclick && !progress && !items}
			<div
				role="status"
				aria-live="polite"
			>
				{@render box(root, false)}
			</div>
		{:else}
			{@render box(root, true)}
		{/if}
	{/snippet}
</Component>

<!-- The box that shows: a button for a tap, its own status region otherwise. -->
{#snippet box(root: ComponentReturn, isRegion: boolean)}
	{@const look = root.class ?? ''}
	{#if isShown}
		<svelte:element
			this={isRegion ? 'div' : 'button'}
			{...root}
			type={isRegion ? undefined : 'button'}
			class={`${look} ${/\btheme-/.test(look) ? '' : 'bg-secondary text-surface'} text-sm shadow-xl ${shape}`.trim()}
			role={isRegion ? 'status' : undefined}
			aria-live={isRegion ? 'polite' : undefined}
			onclick={isRegion ? undefined : () => !props.disabled && onclick?.()}
			transition:fly|global={{ y: 16, duration: 200 }}
		>
			{#if items}
				<div class="flex items-start gap-2">
					<p class="min-w-0 flex-1 pt-1 font-medium">{text}</p>
					{#if onclose}
						<Button
							unstyled
							class="flex size-8 shrink-0 items-center justify-center rounded-full text-current/70 hover:bg-current/10 hover:text-current"
							aria-label="Close"
							onclick={onclose}
							{...closeButton}><span class="icon-[mdi--close] size-5"></span></Button
						>
					{/if}
				</div>
				<ul class="mt-1.5 -ml-2 max-h-44 overflow-y-auto overscroll-contain pr-2">
					{#each items as item, index (index)}
						<li>
							<button
								type="button"
								class="group/item flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-current/10"
								onclick={item.onclick}
								><span class="icon-[mdi--circle-outline] size-3.5 shrink-0 text-warning-400"
								></span><span
									class="min-w-0 flex-1 truncate text-current/90 group-hover/item:text-current"
									>{item.label}</span
								><span class="icon-[mdi--chevron-right] size-4 shrink-0 text-current/40"
								></span></button
							>
						</li>
					{/each}
				</ul>
			{:else if !progress}
				{#if icon}<Icon
						{icon}
						class="size-[1.25em] shrink-0"
					/>{/if}{text}
			{:else if progress.problem}
				<div class="flex items-start gap-2.5">
					<span class="mt-0.5 icon-[mdi--alert-circle-outline] size-5 shrink-0 text-warning-400"
					></span>
					<p class="font-medium">{progress.problem}</p>
				</div>
				<div class="mt-3 flex justify-end gap-2">
					<Button
						unstyled
						class="rounded-full px-3.5 py-1.5 font-medium text-current/70 hover:bg-current/10 hover:text-current"
						label="Close"
						onclick={() => progress.close()}
						{...closeButton}
					/>
					<Button
						unstyled
						class="rounded-full bg-primary px-3.5 py-1.5 font-medium text-surface hover:brightness-110"
						label="Try Again"
						onclick={() => progress.retry()}
						{...retryButton}
					/>
				</div>
			{:else}
				<div class="flex items-baseline justify-between gap-3">
					<p class="truncate font-medium">{progress.label}</p>
					<p class="text-current/70 tabular-nums">{progress.percent}%</p>
				</div>
				<div
					class="mt-2.5 h-1.5 overflow-hidden rounded-full bg-current/15"
					role="progressbar"
					aria-label={label || undefined}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={progress.percent}
				>
					<div
						class="toast-bar h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
						class:is-moving={progress.isBusy}
						style="width: {progress.value}%"
					></div>
				</div>
			{/if}
		</svelte:element>
	{/if}
{/snippet}

<style lang="postcss">
	@reference "#ui.css";

	.toast-bar {
		position: relative;
		overflow: hidden;
	}

	/* A band of light that runs along the filled part while the work is under way. */
	.toast-bar.is-moving::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			transparent,
			color-mix(in oklab, var(--color-surface) 45%, transparent),
			transparent
		);
		transform: translateX(-100%);
		animation: toast-sheen 1.4s linear infinite;
	}

	@keyframes toast-sheen {
		to {
			transform: translateX(100%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.toast-bar.is-moving::after {
			animation: none;
		}
	}
</style>
