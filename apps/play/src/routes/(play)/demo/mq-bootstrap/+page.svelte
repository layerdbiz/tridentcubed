<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import {
		BREAKPOINTS,
		Component,
		mq,
		MQ_STORAGE_KEY,
		type MqBucketType,
		useBetween,
		useMinWidth,
	} from '@layerd/ui';

	const surfaceClass = 'gap-4 rounded-2xl bg-slate-50 p-4';
	const gridCardClass = 'min-w-0 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200';
	const gridDarkCardClass = 'min-w-0 rounded-xl bg-slate-950 p-4 text-white';
	const eyebrowClass = 'text-xs font-black uppercase tracking-[0.18em] text-slate-500';
	const showRailsDebug = $derived(page.url.searchParams.get('railsDebug') === '1');
	const isMinLg = useMinWidth('lg');
	const isBetweenMdAndXl = useBetween('md', 'xl');

	let bootstrapMq = $state<MqBucketType | null>(readInitialMq());

	const currentMq = $derived(resolveCurrentMq());
	const bootstrapMatchesRuntime = $derived(
		bootstrapMq !== null && currentMq !== null && bootstrapMq === currentMq
	);
	const statusText = $derived(
		bootstrapMatchesRuntime ? 'Bootstrap matches runtime' : 'Head bootstrap active'
	);
	const breakpointStates = $derived([
		{ label: 'mq.sm', range: `< ${BREAKPOINTS.md}px`, active: currentMq === 'sm' },
		{
			label: 'mq.md',
			range: `${BREAKPOINTS.md}-${BREAKPOINTS.lg - 1}px`,
			active: currentMq === 'md'
		},
		{
			label: 'mq.lg',
			range: `${BREAKPOINTS.lg}-${BREAKPOINTS.xl - 1}px`,
			active: currentMq === 'lg'
		},
		{
			label: 'mq.xl',
			range: `${BREAKPOINTS.xl}-${BREAKPOINTS.xxl - 1}px`,
			active: currentMq === 'xl'
		},
		{ label: 'mq.xxl', range: `${BREAKPOINTS.xxl}px+`, active: currentMq === 'xxl' }
	]);
	const helperStates = $derived([
		{
			label: "useMinWidth('lg')",
			description: 'Matches lg and wider viewports.',
			active: browser ? isMinLg.current : false
		},
		{
			label: "useBetween('md', 'xl')",
			description: 'Matches md through xl without xxl.',
			active: browser ? isBetweenMdAndXl.current : false
		}
	]);

	onMount(() => {
		const html = document.documentElement;
		const updateBootstrapMq = () => {
			bootstrapMq = readInitialMq();
		};

		const observer = new MutationObserver(updateBootstrapMq);
		updateBootstrapMq();
		observer.observe(html, {
			attributes: true,
			attributeFilter: ['data-mq']
		});

		return () => {
			observer.disconnect();
		};
	});

	function isMqBucket(value: string | null): value is MqBucketType {
		return typeof value === 'string' && Object.hasOwn(BREAKPOINTS, value);
	}

	function readInitialMq(): MqBucketType | null {
		if (!browser) {
			return null;
		}

		const attributeValue = document.documentElement.getAttribute('data-mq');
		if (isMqBucket(attributeValue)) {
			return attributeValue;
		}

		try {
			const storedValue = window.localStorage.getItem(MQ_STORAGE_KEY);
			return isMqBucket(storedValue) ? storedValue : null;
		} catch {
			return null;
		}
	}

	function resolveCurrentMq(): MqBucketType | null {
		const initialMq = readInitialMq();
		if (!browser) {
			return initialMq;
		}

		if (mq.xxl) return 'xxl';
		if (mq.xl) return 'xl';
		if (mq.lg) return 'lg';
		if (mq.md) return 'md';
		if (mq.sm) return 'sm';
		return initialMq;
	}

	function getStateClass(active: boolean): string {
		if (active) {
			return 'rounded-xl bg-slate-950 px-4 py-4 text-white';
		}

		return 'rounded-xl bg-white px-4 py-4 text-slate-600 ring-1 ring-slate-200';
	}
</script>

<svelte:head>
	<title>MQ Bootstrap | Play</title>
</svelte:head>

<div class="grid gap-4 p-4 md:p-5">
	<h1 class="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">MQ Bootstrap</h1>
	<p class="max-w-3xl text-sm leading-6 text-slate-700 md:text-base">
		The <code>Mq</code> utility now writes <code>data-mq</code> from <code>&lt;svelte:head&gt;</code>
		before hydration, then keeps that html attribute synced as the viewport changes.
	</p>

	<Component
		tag="section"
		rails="full"
		debug={showRailsDebug ? { rails: true } : false}
		class={surfaceClass}
	>
		<Component rail="content" class="grid gap-3 md:grid-cols-3">
			<div class={gridCardClass}>
				<p class={eyebrowClass}>HTML Bootstrap</p>
				<p class="mt-3 min-h-10 text-3xl font-black tracking-tight text-slate-950">
					{bootstrapMq ?? ''}
				</p>
				<p class="mt-2 wrap-break-word text-sm leading-6 text-slate-600">
					Read straight from <code>document.documentElement.getAttribute('data-mq')</code>.
				</p>
			</div>

			<div class={gridDarkCardClass}>
				<p class="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Runtime MQ</p>
				<p class="mt-3 min-h-10 text-3xl font-black tracking-tight">
					{currentMq ?? ''}
				</p>
				<p class="mt-2 wrap-break-word text-sm leading-6 text-slate-300">
					Resolved from the live <code>mq</code> getters after mount.
				</p>
			</div>

			<div class={gridCardClass}>
				<p class={eyebrowClass}>Status</p>
				<p class="mt-3 min-h-14 text-lg font-black tracking-tight text-slate-950">{statusText}</p>
				<p class="mt-2 text-sm leading-6 text-slate-600">
					The head script seeds the document state early, and the reactive helpers confirm it once the page is live.
				</p>
			</div>
		</Component>
	</Component>

	<Component
		tag="section"
		rails="full"
		debug={showRailsDebug ? { rails: true } : false}
		class={surfaceClass}
	>
		<Component rail="content" class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
			{#each breakpointStates as state (state.label)}
				<div class={getStateClass(state.active)}>
					<p class="text-xs font-black uppercase tracking-[0.18em] {state.active ? 'text-slate-300' : 'text-slate-500'}">
						{state.label}
					</p>
					<p class="mt-2 text-base font-black tracking-tight">{state.range}</p>
				</div>
			{/each}
		</Component>
	</Component>

	<Component
		tag="section"
		rails="full"
		debug={showRailsDebug ? { rails: true } : false}
		class={surfaceClass}
	>
		<Component rail="content" class="grid gap-3 md:grid-cols-2">
			{#each helperStates as state (state.label)}
				<div class={getStateClass(state.active)}>
					<p class="text-xs font-black uppercase tracking-[0.18em] {state.active ? 'text-slate-300' : 'text-slate-500'}">
						{state.label}
					</p>
					<p class="mt-2 text-sm leading-6 {state.active ? 'text-slate-200' : 'text-slate-600'}">
						{state.description}
					</p>
				</div>
			{/each}
		</Component>
	</Component>
</div>