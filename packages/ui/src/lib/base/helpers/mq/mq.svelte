<script module lang="ts">
	let hasMountedMqRuntime = false;
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { Component } from '@layerd/ui';
	import {
		BREAKPOINTS,
		MQ_BUCKET_PRIORITY,
		MQ_ORIENTATION_PRIORITY,
		MQ_ORIENTATION_QUERY_MAP,
		MQ_ORIENTATION_STORAGE_KEY,
		MQ_QUERY_MAP,
		MQ_STORAGE_KEY,
		_setMqLoading,
		_setMqReady,
		initMqRuntime,
		syncMqState
	} from '@layerd/ui';

	type MqLoadingEffect = 'fade' | 'slide' | 'zoom';
	type MqLoadingProp = boolean | MqLoadingEffect;
	type MqMsValue = number | string;

	interface MqProps {
		loading?: MqLoadingProp;
		delay?: MqMsValue;
		duration?: MqMsValue;
		children?: Snippet;
	}

	let { loading = false, delay = 1000, duration = 300, children }: MqProps = $props();

const hasLoading = $derived(loading !== false || Boolean(children));
const loadingEffect = $derived(toLoadingEffect(loading));
const delayMs = $derived(toMs(delay, 0));
const durationMs = $derived(toMs(duration, 300));

let showOverlay = $state(hasInitialOverlay());
let isOverlayExiting = $state(false);

const loadingEffectClass = $derived(`mq-loading-${loadingEffect}`);
const loadingExitClass = $derived(isOverlayExiting ? 'mq-loading-exit' : '');

	let delayTimer: ReturnType<typeof setTimeout> | null = null;
	let exitTimer: ReturnType<typeof setTimeout> | null = null;
	let exitFrame = 0;

	function hasInitialOverlay(): boolean {
		return (loading !== false || Boolean(children)) && !hasMountedMqRuntime;
	}

	function toLoadingEffect(value: MqLoadingProp): MqLoadingEffect {
		if (value === 'slide' || value === 'zoom' || value === 'fade') {
			return value;
		}

		return 'fade';
	}

	function toMs(value: MqMsValue | undefined, fallback: number): number {
		const parsed = typeof value === 'number' ? value : Number.parseFloat(value ?? '');

		if (!Number.isFinite(parsed)) {
			return fallback;
		}

		return Math.max(0, parsed);
	}

	function clearOverlayTimers(): void {
		if (delayTimer) {
			clearTimeout(delayTimer);
			delayTimer = null;
		}

		if (exitTimer) {
			clearTimeout(exitTimer);
			exitTimer = null;
		}

		if (exitFrame) {
			cancelAnimationFrame(exitFrame);
			exitFrame = 0;
		}
	}

	function prefersReducedMotion(): boolean {
		if (typeof window === 'undefined') return false;

		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function finishOverlay(): void {
		clearOverlayTimers();

		showOverlay = false;
		isOverlayExiting = false;

		_setMqLoading(false);
	}

	function startOverlayExit(): void {
		if (!showOverlay || isOverlayExiting) return;

		if (durationMs === 0 || prefersReducedMotion()) {
			finishOverlay();
			return;
		}

		isOverlayExiting = true;

		exitTimer = setTimeout(() => {
			finishOverlay();
		}, durationMs + 50);
	}

	function queueOverlayExit(): void {
		exitFrame = requestAnimationFrame(() => {
			exitFrame = requestAnimationFrame(() => {
				exitFrame = 0;

				delayTimer = setTimeout(() => {
					startOverlayExit();
				}, delayMs);
			});
		});
	}

	function handleOverlayAnimationEnd(event: AnimationEvent): void {
		if (event.target !== event.currentTarget) return;

		finishOverlay();
	}

	onMount(() => {
		initMqRuntime();
		syncMqState();
		_setMqReady(true);

		const shouldShowOverlay = hasLoading && showOverlay;

		hasMountedMqRuntime = true;

		if (!shouldShowOverlay) {
			_setMqLoading(false);

			return () => {
				clearOverlayTimers();
			};
		}

		_setMqLoading(true);
		queueOverlayExit();

		return () => {
			clearOverlayTimers();
			_setMqLoading(false);
		};
	});

	const mqBootstrapConfig = JSON.stringify({
		mqAttribute: 'data-mq',
		mqInitAttribute: 'data-mq-init',
		orientationAttribute: 'data-orientation',
		orientationInitAttribute: 'data-orientation-init',
		mqStorageKey: MQ_STORAGE_KEY,
		orientationStorageKey: MQ_ORIENTATION_STORAGE_KEY,
		breakpoints: BREAKPOINTS,
		mqQueries: MQ_QUERY_MAP,
		orientationQueries: MQ_ORIENTATION_QUERY_MAP,
		mqPriority: MQ_BUCKET_PRIORITY,
		orientationPriority: MQ_ORIENTATION_PRIORITY
	});

	const mqBootstrapScript = String.raw`(() => {
		const config = ${mqBootstrapConfig};
		const doc = document.documentElement;
		const win = window;

		const isMqBucket = (value) => value !== null && config.mqPriority.includes(value);
		const isMqOrientation = (value) => value !== null && config.orientationPriority.includes(value);

		const readLocalValue = (key, checker) => {
			try {
				const storedValue = win.localStorage.getItem(key);

				return checker(storedValue) ? storedValue : null;
			} catch {
				return null;
			}
		};

		const readBootstrapMqBucket = () => {
			const attr = doc.getAttribute(config.mqAttribute);

			if (isMqBucket(attr)) {
				return attr;
			}

			return readLocalValue(config.mqStorageKey, isMqBucket);
		};

		const readBootstrapMqOrientation = () => {
			const attr = doc.getAttribute(config.orientationAttribute);

			if (isMqOrientation(attr)) {
				return attr;
			}

			return readLocalValue(config.orientationStorageKey, isMqOrientation);
		};

		const resolveMqBucket = () => {
			if (typeof win.matchMedia === 'function') {
				for (const bucket of config.mqPriority) {
					if (win.matchMedia(config.mqQueries[bucket]).matches) {
						return bucket;
					}
				}
			}

			const width = win.innerWidth || doc.clientWidth || 0;

			if (width >= config.breakpoints.xxl) return 'xxl';
			if (width >= config.breakpoints.xl) return 'xl';
			if (width >= config.breakpoints.lg) return 'lg';
			if (width >= config.breakpoints.md) return 'md';

			return 'sm';
		};

		const resolveMqOrientation = () => {
			if (typeof win.matchMedia === 'function') {
				for (const orientation of config.orientationPriority) {
					if (win.matchMedia(config.orientationQueries[orientation]).matches) {
						return orientation;
					}
				}
			}

			const width = win.innerWidth || doc.clientWidth || 0;
			const height = win.innerHeight || doc.clientHeight || 0;

			return height >= width ? 'portrait' : 'landscape';
		};

		const writeLocalValue = (key, value) => {
			try {
				win.localStorage.setItem(key, value);
			} catch {
				// Ignore storage failures and keep document attributes as the source of truth.
			}
		};

		const applyMqBucket = (bucket) => {
			doc.setAttribute(config.mqAttribute, bucket);
			doc.setAttribute(config.mqInitAttribute, '1');

			writeLocalValue(config.mqStorageKey, bucket);
		};

		const applyMqOrientation = (orientation) => {
			doc.setAttribute(config.orientationAttribute, orientation);
			doc.setAttribute(config.orientationInitAttribute, '1');

			writeLocalValue(config.orientationStorageKey, orientation);
		};

		const bootstrapBucket = readBootstrapMqBucket();
		const bootstrapOrientation = readBootstrapMqOrientation();

		if (bootstrapBucket) {
			applyMqBucket(bootstrapBucket);
		}

		if (bootstrapOrientation) {
			applyMqOrientation(bootstrapOrientation);
		}

		applyMqBucket(resolveMqBucket());
		applyMqOrientation(resolveMqOrientation());
	})();`;
</script>

<svelte:head>
	{@html `<script>${mqBootstrapScript}</script>`}
</svelte:head>

{#if hasLoading && showOverlay}
	<Component
		tag="div"
		class="mq-loading {loadingEffectClass} {loadingExitClass} fixed! inset-0 z-50 h-dvh w-dvw bg-white pointer-events-auto"
		style="--mq-loading-duration: {durationMs}ms;"
		items="center"
		aria-live="polite"
		aria-busy="true"
		onanimationend={handleOverlayAnimationEnd}
	>
		{#snippet fg()}
			{#if children}
				{@render children()}
			{:else}
				Loading...
			{/if}
		{/snippet}
	</Component>
{/if}

<style lang="postcss">
	:global {
		.mq-loading-fade.mq-loading-exit {
			animation: mq-loading-fade-out var(--mq-loading-duration, 300ms) ease-out forwards;
		}

		.mq-loading-slide.mq-loading-exit {
			animation: mq-loading-slide-out var(--mq-loading-duration, 300ms) ease-out forwards;
		}

		.mq-loading-zoom.mq-loading-exit {
			animation: mq-loading-zoom-out var(--mq-loading-duration, 300ms) ease-out forwards;
		}
	}

	@keyframes -global-mq-loading-fade-out {
		from {
			opacity: 1;
		}

		to {
			opacity: 0;
		}
	}

	@keyframes -global-mq-loading-slide-out {
		from {
			transform: translateY(0);
			opacity: 1;
		}

		to {
			transform: translateY(-100%);
			opacity: 0;
		}
	}

	@keyframes -global-mq-loading-zoom-out {
		from {
			transform: scale(1);
			opacity: 1;
		}

		to {
			transform: scale(0.9);
			opacity: 0;
		}
	}

	:global {
		@media (prefers-reduced-motion: reduce) {
			.mq-loading-fade.mq-loading-exit,
			.mq-loading-slide.mq-loading-exit,
			.mq-loading-zoom.mq-loading-exit {
				animation-duration: 1ms;
			}
		}
	}
</style>