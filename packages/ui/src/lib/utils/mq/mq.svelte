<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { Component } from '@layerd/ui';
	import {
		BREAKPOINTS,
		MQ_QUERY_MAP,
		MQ_BUCKET_PRIORITY,
		MQ_STORAGE_KEY,
		mq,
		_setMqBucket,
		_setMqReady,
		_setMqLoading,
		readBootstrapMqBucket,
		resolveMqBucket,
		type MqBucketType,
	} from '@layerd/ui';

	type MqMode = 'ssr' | 'client';
	type MqLoadingEffect = 'fade' | 'slide' | 'zoom';

	interface MqProps {
		mode?: MqMode;
		loading?: boolean | MqLoadingEffect;
		duration?: number;
		children?: Snippet;
	}

	let {
		mode = 'client',
		loading = false,
		duration = 3000,
		children,
	}: MqProps = $props();

	let isOverlayExiting = $state(false);
	let overlayExitTimer: ReturnType<typeof setTimeout> | null = null;
	let resizeFrame = 0;

	const OVERLAY_EXIT_MS = 300;
	const MQ_LOADING_INTRO_DONE_KEY = `${MQ_STORAGE_KEY}:loading-intro-done`;
	const MQ_LOADING_INTRO_DONE_ATTR = 'data-mq-loading-intro-done';

	function readLoadingIntroDone(): boolean {
		if (typeof window === 'undefined') return false;
		try {
			return window.localStorage.getItem(MQ_LOADING_INTRO_DONE_KEY) === '1';
		} catch {
			return false;
		}
	}

	function writeLoadingIntroDone(): void {
		if (typeof window === 'undefined') return;
		try {
			window.localStorage.setItem(MQ_LOADING_INTRO_DONE_KEY, '1');
			document.documentElement.setAttribute(MQ_LOADING_INTRO_DONE_ATTR, '1');
		} catch {
			// Ignore storage failures and keep behavior functional.
		}
	}

	let hasShownLoadingIntro = readLoadingIntroDone();

	function isLoadingEnabled(): boolean {
		return mode === 'ssr' && loading !== false && !hasShownLoadingIntro;
	}

	const loadingEffectName = $derived.by(() => {
		if (loading === 'slide') return 'slide';
		if (loading === 'zoom') return 'zoom';
		return 'fade';
	});

	const loadingExitClass = $derived(
		isOverlayExiting ? `mq-loading-${loadingEffectName}` : ''
	);

	const shouldShowLoadingIntro = isLoadingEnabled();
	if (shouldShowLoadingIntro) {
		hasShownLoadingIntro = true;
		writeLoadingIntroDone();
	}

	// Initialize SSR state before first render so mq.loading starts true on first intro only.
	_setMqReady(false);
	_setMqLoading(shouldShowLoadingIntro);

	function applyMqBucket(bucket: MqBucketType): void {
		if (typeof window === 'undefined') {
			return;
		}
		// Delegates to _setMqBucket which updates the reactive $state, data-mq, and localStorage.
		_setMqBucket(bucket);
	}

	function syncMqBucket(): void {
		if (typeof window === 'undefined') {
			return;
		}

		applyMqBucket(resolveMqBucket());
	}

	function handleWindowResize(): void {
		if (typeof window === 'undefined') {
			return;
		}

		if (resizeFrame) {
			window.cancelAnimationFrame(resizeFrame);
		}

		resizeFrame = window.requestAnimationFrame(() => {
			syncMqBucket();
			resizeFrame = 0;
		});
	}

	onMount(() => {
		// Initialize MQ bucket from bootstrap or viewport
		const bootstrapBucket = readBootstrapMqBucket();
		if (bootstrapBucket) {
			applyMqBucket(bootstrapBucket);
		}

		syncMqBucket();

		// Mark MQ as ready after initialization
		_setMqReady(true);

		if (!shouldShowLoadingIntro) {
			_setMqLoading(false);
			return () => {
				if (resizeFrame && typeof window !== 'undefined') {
					window.cancelAnimationFrame(resizeFrame);
				}
				if (overlayExitTimer) {
					clearTimeout(overlayExitTimer);
					overlayExitTimer = null;
				}
			};
		}

		// Keep overlay visible for `duration`, then play exit animation and hide.
		const holdTimer = setTimeout(() => {
			isOverlayExiting = true;
			overlayExitTimer = setTimeout(() => {
				_setMqLoading(false);
				overlayExitTimer = null;
			}, OVERLAY_EXIT_MS);
		}, duration);

		return () => {
			if (resizeFrame && typeof window !== 'undefined') {
				window.cancelAnimationFrame(resizeFrame);
			}
			clearTimeout(holdTimer);
			if (overlayExitTimer) {
				clearTimeout(overlayExitTimer);
				overlayExitTimer = null;
			}
		};
	});

	const mqBootstrapConfig = JSON.stringify({
		attribute: 'data-mq',
		initAttribute: 'data-mq-init',
		storageKey: MQ_STORAGE_KEY,
		loadingIntroDoneKey: MQ_LOADING_INTRO_DONE_KEY,
		loadingIntroDoneAttr: MQ_LOADING_INTRO_DONE_ATTR,
		breakpoints: BREAKPOINTS,
		queries: MQ_QUERY_MAP,
		priority: MQ_BUCKET_PRIORITY,
	});

	const mqBootstrapScript = String.raw`(() => {
		const config = ${mqBootstrapConfig};
		const doc = document.documentElement;
		const win = window;

		const isMqBucket = (value) => value !== null && config.priority.includes(value);

		const readLocalMqBucket = () => {
			try {
				const storedValue = win.localStorage.getItem(config.storageKey);
				return isMqBucket(storedValue) ? storedValue : null;
			} catch {
				return null;
			}
		};

		const markLoadingIntroDone = () => {
			try {
				if (win.localStorage.getItem(config.loadingIntroDoneKey) === '1') {
					doc.setAttribute(config.loadingIntroDoneAttr, '1');
				}
			} catch {
				// Ignore storage failures.
			}
		};

		const readBootstrapMqBucket = () => {
			const storedValue = readLocalMqBucket();
			if (storedValue) {
				return storedValue;
			}

			const attributeValue = doc.getAttribute(config.attribute);
			if (isMqBucket(attributeValue)) {
				return attributeValue;
			}

			return null;
		};

		const resolveMqBucket = () => {
			if (typeof win.matchMedia === 'function') {
				for (const bucket of config.priority) {
					if (win.matchMedia(config.queries[bucket]).matches) {
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

		const applyMqBucket = (bucket) => {
			doc.setAttribute(config.attribute, bucket);
			doc.setAttribute(config.initAttribute, '1');

			try {
				win.localStorage.setItem(config.storageKey, bucket);
			} catch {
				// Ignore storage failures and keep the document attribute as the source of truth.
			}

		};

		const bootstrapBucket = readBootstrapMqBucket();
		markLoadingIntroDone();
		if (bootstrapBucket) {
			applyMqBucket(bootstrapBucket);
		}

		applyMqBucket(resolveMqBucket());
	})();`;
</script>

<svelte:head>
	{@html `<script>${mqBootstrapScript}</script>`}
</svelte:head>

<svelte:window onresize={handleWindowResize} />

{#if mq.loading}
	<Component tag="div" class="mq-loading fixed! inset-0 z-9999 bg-white {loadingExitClass}" items="center" aria-live="polite" aria-busy="true">
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
		.mq-loading {
			z-index: 99999;
			width: 100dvw;
			height: 100dvh;
			pointer-events: auto;
		}

		.mq-loading-fade {
			animation: mq-fade-out 0.3s ease-out forwards;
			animation-delay: 0.2s;
		}

		.mq-loading-slide {
			animation: mq-slide-out 0.3s ease-out forwards;
			animation-delay: 0.2s;
		}

		.mq-loading-zoom {
			animation: mq-zoom-out 0.3s ease-out forwards;
			animation-delay: 0.2s;
		}

		@keyframes mq-fade-out {
			from {
				opacity: 1;
			}
			to {
				opacity: 0;
			}
		}

		@keyframes mq-slide-out {
			from {
				transform: translateY(0);
				opacity: 1;
			}
			to {
				transform: translateY(-100%);
				opacity: 0;
			}
		}

		@keyframes mq-zoom-out {
			from {
				transform: scale(1);
				opacity: 1;
			}
			to {
				transform: scale(0.9);
				opacity: 0;
			}
		}
	}
</style>