<script lang="ts">
	import { onMount } from 'svelte';
	import {
		BREAKPOINTS,
		MQ_QUERY_MAP,
		MQ_BUCKET_PRIORITY,
		MQ_STORAGE_KEY,
		_setMqBucket,
		readBootstrapMqBucket,
		resolveMqBucket,
		type MqBucketType,
	} from './mq.svelte.ts';

	let resizeFrame = 0;

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
		const bootstrapBucket = readBootstrapMqBucket();
		if (bootstrapBucket) {
			applyMqBucket(bootstrapBucket);
		}

		syncMqBucket();

		return () => {
			if (resizeFrame && typeof window !== 'undefined') {
				window.cancelAnimationFrame(resizeFrame);
			}
		};
	});

	const mqBootstrapConfig = JSON.stringify({
		attribute: 'data-mq',
		initAttribute: 'data-mq-init',
		storageKey: MQ_STORAGE_KEY,
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