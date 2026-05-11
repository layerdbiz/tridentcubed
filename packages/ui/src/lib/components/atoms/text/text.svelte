<script lang="ts">
	/**
	 * @tags text, typography, heading, paragraph
	 */
	import { Component, type ComponentProps, type ComponentReturn } from '@layerd/ui';
	import { onMount, onDestroy, untrack } from 'svelte';

	export interface TextProps extends ComponentProps {
		// Core text properties
		type?:
			| 'h1'
			| 'h2'
			| 'h3'
			| 'h4'
			| 'h5'
			| 'h6'
			| 'p'
			| 'bold'
			| 'italic'
			| 'line'
			| 'underline'
			| 'quote'
			| 'key'
			| 'small'
			| 'code'
			| 'codeblock';
		text?: string;

		// Typewriter effect
		typewriter?: {
			enabled?: boolean;
			start?: string;
			messages: string[];
			type?: 'typewriter' | 'reveal';
			autoplay?: boolean;
			loop?: boolean;
			speed?: number;
			delay?: number;
			delete?: boolean;
		}; // Prose control
		prose?: boolean;
		noprose?: boolean;
		disabled?: boolean;

		// Prose size variants
		xs?: boolean;
		sm?: boolean;
		md?: boolean;
		lg?: boolean;
		xl?: boolean;

		// Boolean shortcuts for text types (legacy support)
		h1?: boolean | string;
		h2?: boolean | string;
		h3?: boolean | string;
		h4?: boolean | string;
		h5?: boolean | string;
		h6?: boolean | string;
		p?: boolean | string;

		// New text format props
		bold?: boolean | string;
		italic?: boolean | string;
		line?: boolean | string;
		underline?: boolean | string;
		quote?: boolean | string;
		key?: boolean | string;
		small?: boolean | string;
		code?: boolean | string;
		codeblock?: boolean | string;

		// Content children
		children?: any;
	}

	let {
		type = 'p',
		text = 'Sample Text',
		typewriter,
		prose = true,
		disabled = false,
		noprose = false,
		xs = false,
		sm = false,
		md = false,
		lg = false,
		xl = false,
		h1 = false,
		h2 = false,
		h3 = false,
		h4 = false,
		h5 = false,
		h6 = false,
		p = false,
		bold = false,
		italic = false,
		line = false,
		underline = false,
		quote = false,
		key = false,
		small = false,
		code = false,
		codeblock = false,
		children,
		...props
	}: TextProps = $props();

	// Determine final type and content based on props (memoized to avoid double computation)
	const typeAndContent = $derived.by(() => {
		// Check string props first (highest priority)
		if (typeof h1 === 'string') return { type: 'h1' as const, content: h1 };
		if (typeof h2 === 'string') return { type: 'h2' as const, content: h2 };
		if (typeof h3 === 'string') return { type: 'h3' as const, content: h3 };
		if (typeof h4 === 'string') return { type: 'h4' as const, content: h4 };
		if (typeof h5 === 'string') return { type: 'h5' as const, content: h5 };
		if (typeof h6 === 'string') return { type: 'h6' as const, content: h6 };
		if (typeof p === 'string') return { type: 'p' as const, content: p };
		if (typeof bold === 'string') return { type: 'bold' as const, content: bold };
		if (typeof italic === 'string') return { type: 'italic' as const, content: italic };
		if (typeof line === 'string') return { type: 'line' as const, content: line };
		if (typeof underline === 'string') return { type: 'underline' as const, content: underline };
		if (typeof quote === 'string') return { type: 'quote' as const, content: quote };
		if (typeof key === 'string') return { type: 'key' as const, content: key };
		if (typeof small === 'string') return { type: 'small' as const, content: small };
		if (typeof code === 'string') return { type: 'code' as const, content: code };
		if (typeof codeblock === 'string') return { type: 'codeblock' as const, content: codeblock };

		// Check boolean props (medium priority)
		if (h1 === true) return { type: 'h1' as const, content: text };
		if (h2 === true) return { type: 'h2' as const, content: text };
		if (h3 === true) return { type: 'h3' as const, content: text };
		if (h4 === true) return { type: 'h4' as const, content: text };
		if (h5 === true) return { type: 'h5' as const, content: text };
		if (h6 === true) return { type: 'h6' as const, content: text };
		if (p === true) return { type: 'p' as const, content: text };
		if (bold === true) return { type: 'bold' as const, content: text };
		if (italic === true) return { type: 'italic' as const, content: text };
		if (line === true) return { type: 'line' as const, content: text };
		if (underline === true) return { type: 'underline' as const, content: text };
		if (quote === true) return { type: 'quote' as const, content: text };
		if (key === true) return { type: 'key' as const, content: text };
		if (small === true) return { type: 'small' as const, content: text };
		if (code === true) return { type: 'code' as const, content: text };
		if (codeblock === true) return { type: 'codeblock' as const, content: text };

		// Default to type prop (lowest priority)
		return { type, content: text };
	});

	const finalType = $derived(typeAndContent.type);
	const finalContent = $derived(typeAndContent.content);

	// Build prose classes
	const proseClasses = $derived.by(() => {
		// If prose is explicitly disabled or noprose is true, return empty
		if (prose === false || noprose === true || disabled === true) return '';

		// Build the prose class with size variant
		let classes = 'prose';

		if (xs) classes += ' prose-xs';
		else if (sm) classes += ' prose-sm';
		else if (md) classes += ' prose-md';
		else if (lg) classes += ' prose-lg';
		else if (xl) classes += ' prose-xl';

		return classes;
	});

	// Typewriter effect logic - with $state for all variables
	let typewriterEl = $state<HTMLElement | null>(null);
	let display = $state('');
	let shouldApplyRevealClasses = $state(false);
	let isRevealed = $state(false);
	let isAnimating = $state(false); // Track if we're in animation mode
	let currentMessageIndex = $state(0);
	let phase = $state<'showing' | 'hiding' | 'waiting'>('waiting');
	let animationTimerId: ReturnType<typeof setTimeout> | null = null;
	let cycleTimerId: ReturnType<typeof setTimeout> | null = null;

	const revealText = (msg: string) => {
		// Apply classes FIRST (text will be hidden by clip-path)
		shouldApplyRevealClasses = true;
		isRevealed = false;
		isAnimating = true;

		// Wait one frame, THEN set the text content
		requestAnimationFrame(() => {
			display = msg;
			// Wait another frame for DOM update, THEN trigger reveal
			requestAnimationFrame(() => {
				isRevealed = true;
			});
		});
	};

	const hideText = () => {
		const shouldAnimate = typewriter?.delete ?? true;
		if (shouldAnimate) {
			isRevealed = false;
		} else {
			display = '';
			shouldApplyRevealClasses = false;
			isRevealed = false;
		}
	};

	const runAnimationCycle = () => {
		if (!typewriter?.messages?.length) return;

		const delay = typewriter.delay ?? 3000;
		const shouldDelete = typewriter?.delete ?? true;
		const hideAnimationDuration = shouldDelete ? 700 : 0;

		if (phase === 'showing') {
			// Check if we're on the last message and loop is disabled
			const nextIndex = (currentMessageIndex + 1) % typewriter.messages.length;
			if (!typewriter.loop && nextIndex === 0) {
				// Stay on the last message, don't hide it
				phase = 'waiting';
				return;
			}

			// Time to hide current message
			hideText();
			phase = 'hiding';

			// If no delete animation, immediately show next message
			if (!shouldDelete) {
				display = '';
				shouldApplyRevealClasses = false;
				isRevealed = false;

				currentMessageIndex = nextIndex;

				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						revealText(typewriter.messages[currentMessageIndex]);
						phase = 'showing';
						cycleTimerId = setTimeout(runAnimationCycle, delay);
					});
				});
			} else {
				// Wait for hide animation, then show next
				animationTimerId = setTimeout(() => {
					display = '';
					shouldApplyRevealClasses = false;

					currentMessageIndex = nextIndex;

					revealText(typewriter.messages[currentMessageIndex]);
					phase = 'showing';
					cycleTimerId = setTimeout(runAnimationCycle, delay);
				}, hideAnimationDuration + 50);
			}
		}
	};

	const initTypewriter = () => {
		if (!typewriter?.messages?.length) return;

		// Set initial display
		const startText = typewriter.start ?? typewriter.messages[0];
		display = startText;
		isRevealed = false;
		shouldApplyRevealClasses = false;
		isAnimating = false;
		phase = 'waiting';

		// Auto-start if enabled
		if (typewriter.autoplay ?? true) {
			const initialDelay = typewriter.delay ?? 3000;
			const shouldSkipFirst = !typewriter.start || startText === typewriter.messages[0];

			currentMessageIndex = shouldSkipFirst ? 1 : 0;
			if (currentMessageIndex >= typewriter.messages.length) {
				currentMessageIndex = 0;
			}

			animationTimerId = setTimeout(() => {
				revealText(typewriter.messages[currentMessageIndex]);
				phase = 'showing';
				cycleTimerId = setTimeout(runAnimationCycle, initialDelay);
			}, initialDelay);
		}
	};

	const cleanupTypewriter = () => {
		if (animationTimerId) clearTimeout(animationTimerId);
		if (cycleTimerId) clearTimeout(cycleTimerId);
		animationTimerId = null;
		cycleTimerId = null;
		display = '';
		isRevealed = false;
		shouldApplyRevealClasses = false;
		phase = 'waiting';
		currentMessageIndex = 0;
	};

	// Determine typewriter enabled state - use observeInstance if no explicit enabled prop
	const getTypewriterEnabled = (observeInstance?: import('@layerd/ui').ObserveClass) => {
		// If explicit enabled prop exists, use it
		if (typewriter?.enabled !== undefined) {
			return typewriter.enabled;
		}
		// If observe instance exists, use its intersection state
		if (observeInstance) {
			return observeInstance.isIntersecting;
		}
		// Default to true
		return true;
	};

	// Track current visibility state (NOT $state, just regular variable updated from template)
	let currentIntersectionState = true;
	let currentEnabledProp: boolean | undefined = undefined;
	let isTypewriterActive = false;

	// Function to update typewriter state (called from template)
	function updateTypewriterState(isIntersecting: boolean, enabledProp: boolean | undefined) {
		currentIntersectionState = isIntersecting;
		currentEnabledProp = enabledProp;

		const enabled = enabledProp !== undefined ? enabledProp : isIntersecting;
		const shouldRun = enabled && typewriter !== undefined;

		if (shouldRun && !isTypewriterActive && typewriter) {
			initTypewriter();
			isTypewriterActive = true;
		} else if (!shouldRun && isTypewriterActive) {
			cleanupTypewriter();
			isTypewriterActive = false;
		}
	}

	onMount(() => {
		// Initial setup
		if (typewriter?.enabled !== false) {
			initTypewriter();
			isTypewriterActive = true;
		}
	});

	onDestroy(() => {
		cleanupTypewriter();
	});
</script>

<Component
	{...props}
	class="text {proseClasses} {props.class}"
	{children}
>
	{#snippet typewriterContent()}
		<span
			class="typewriter-screen-reader"
			>{finalContent}</span
		>
		<span
			bind:this={typewriterEl}
			class="typewriter-text"
			class:reveal={shouldApplyRevealClasses}
			class:reveal-r={shouldApplyRevealClasses}
			class:reveal-active={isRevealed}
			style:clip-path={isAnimating && !shouldApplyRevealClasses ? 'inset(0 100% 0 0)' : undefined}
			aria-live="polite"
			aria-atomic="true">{display}</span
		>
	{/snippet}

	{#snippet component({
		props: componentProps,
		content,
		observe: observeInstance
	}: {
		props: ComponentReturn;
		content: import('svelte').Snippet<[string?]>;
		observe?: import('@layerd/ui').ObserveClass;
	})}
		{@const isIntersecting = observeInstance?.isIntersecting ?? true}
		{@const enabledProp = typewriter?.enabled}
		{@const enabled = enabledProp !== undefined ? enabledProp : isIntersecting}
		{@const hasTypewriter = typewriter !== undefined}
		{@const shouldShowTypewriter = hasTypewriter && enabled}
		{@const _ = updateTypewriterState(isIntersecting, enabledProp)}
		{#if hasTypewriter}
			<!-- Always use typewriter rendering when typewriter is defined (even if not enabled yet) -->
			{#if finalType === 'h1'}
				<h1 {...componentProps}>{@render typewriterContent()}</h1>
			{:else if finalType === 'h2'}
				<h2 {...componentProps}>{@render typewriterContent()}</h2>
			{:else if finalType === 'h3'}
				<h3 {...componentProps}>{@render typewriterContent()}</h3>
			{:else if finalType === 'h4'}
				<h4 {...componentProps}>{@render typewriterContent()}</h4>
			{:else if finalType === 'h5'}
				<h5 {...componentProps}>{@render typewriterContent()}</h5>
			{:else if finalType === 'h6'}
				<h6 {...componentProps}>{@render typewriterContent()}</h6>
			{:else}
				<p {...componentProps}>{@render typewriterContent()}</p>
			{/if}
		{:else if finalType === 'h1'}
			<h1 {...componentProps}>{@render content(finalContent)}</h1>
		{:else if finalType === 'h2'}
			<h2 {...componentProps}>{@render content(finalContent)}</h2>
		{:else if finalType === 'h3'}
			<h3 {...componentProps}>{@render content(finalContent)}</h3>
		{:else if finalType === 'h4'}
			<h4 {...componentProps}>{@render content(finalContent)}</h4>
		{:else if finalType === 'h5'}
			<h5 {...componentProps}>{@render content(finalContent)}</h5>
		{:else if finalType === 'h6'}
			<h6 {...componentProps}>{@render content(finalContent)}</h6>
		{:else if finalType === 'bold'}
			<strong {...componentProps}>{@render content(finalContent)}</strong>
		{:else if finalType === 'italic'}
			<em {...componentProps}>{@render content(finalContent)}</em>
		{:else if finalType === 'line'}
			<s {...componentProps}>{@render content(finalContent)}</s>
		{:else if finalType === 'underline'}
			<u {...componentProps}>{@render content(finalContent)}</u>
		{:else if finalType === 'quote'}
			<blockquote {...componentProps}>{@render content(finalContent)}</blockquote>
		{:else if finalType === 'key'}
			<kbd {...componentProps}>{@render content(finalContent)}</kbd>
		{:else if finalType === 'small'}
			<small {...componentProps}>{@render content(finalContent)}</small>
		{:else if finalType === 'code'}
			<code {...componentProps}>{@render content(finalContent)}</code>
		{:else if finalType === 'codeblock'}
			<pre {...componentProps}><code>{@render content(finalContent)}</code></pre>
		{:else}
			<p {...componentProps}>{@render content(finalContent)}</p>
		{/if}
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#ui.css";

	.text {
		@apply block;
	}

	.typewriter-screen-reader {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: 0;
		padding: 0;
		overflow: hidden;
		white-space: nowrap;
		border: 0;
		clip: rect(0 0 0 0);
		clip-path: inset(50%);
	}

	.typewriter-text::before {
		display: inline-block;
		width: 1px;
		height: 1px;
		opacity: 0;
		content: '.';
	}
</style>
