<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { BREAKPOINTS, Component, mq, MQ_STORAGE_KEY, type MqBucketType } from '@layerd/ui';

	const surfaceClass = 'gap-4 rounded-2xl bg-slate-50 p-4';
	const gridCardClass = 'min-w-0 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200';
	const gridDarkCardClass = 'min-w-0 rounded-xl bg-slate-950 p-4 text-white';
	const eyebrowClass = 'text-xs font-black uppercase tracking-[0.18em] text-slate-500';
	const showRailsDebug = $derived(page.url.searchParams.get('railsDebug') === '1');

	const currentMq = $derived(resolveCurrentMq());
	const navMode = $derived(
		currentMq === 'sm' ? 'Overlay trigger' : currentMq ? 'Pinned desktop rail' : 'Responsive nav mode'
	);
	const contentMode = $derived(
		currentMq === 'sm'
			? 'Content stays full width on mobile.'
			: currentMq
				? 'Desktop content layout stays as-is.'
				: 'MQ drives the layout mode.'
	);
	const guidanceItems = $derived([
		{
			title: 'Host Mq once',
			copy: 'The play root layout owns the head bootstrap so the package runtime stays unchanged.'
		},
		{
			title: 'Keep trees stable',
			copy: 'Use mq for live behavior and document state without pushing media-query branching into the base layout runtime.'
		},
		{
			title: 'Use snippets where they help',
			copy: 'This route keeps the same component/snippet authoring style while surfacing the active mq bucket.'
		}
	]);

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
</script>

<svelte:head>
	<title>MQ Layout | Play</title>
</svelte:head>

<div class="grid gap-4 p-4 md:p-5">
	<h1 class="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">MQ Layout</h1>
	<p class="max-w-3xl text-sm leading-6 text-slate-700 md:text-base">
		This route keeps the base runtime untouched and shows how the play app can read the current mq bucket while continuing to author with <code>Component</code>, rails, and layout snippets.
	</p>

	<Component
		tag="section"
		rails="full"
		debug={showRailsDebug ? { rails: true } : false}
		class={surfaceClass}
	>
		<Component rail="content" class="grid gap-3 md:grid-cols-3">
			<div class={gridCardClass}>
				<p class={eyebrowClass}>Current Bucket</p>
				<p class="mt-3 min-h-10 text-3xl font-black tracking-tight text-slate-950">
					{currentMq ?? ''}
				</p>
				<p class="mt-2 wrap-break-word text-sm leading-6 text-slate-600">
					The public <code>mq</code> object stays the runtime source of truth.
				</p>
			</div>

			<div class={gridDarkCardClass}>
				<p class="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Nav Mode</p>
				<p class="mt-3 text-2xl font-black tracking-tight">{navMode}</p>
				<p class="mt-2 text-sm leading-6 text-slate-300">
					Small screens collapse the nav behind the overlay trigger. Larger screens keep the persistent rail.
				</p>
			</div>

			<div class={gridCardClass}>
				<p class={eyebrowClass}>Content Rule</p>
				<p class="mt-3 text-lg font-black tracking-tight text-slate-950">{contentMode}</p>
				<p class="mt-2 text-sm leading-6 text-slate-600">
					The mobile goal is protecting the content rail, not moving media-query logic into the shared layout runtime.
				</p>
			</div>
		</Component>
	</Component>

	<Component
		tag="section"
		rails="xl"
		debug={showRailsDebug ? { rails: true } : false}
		class={surfaceClass}
	>
		<Component
			rail="left-lg"
			class="hidden rounded-xl bg-white px-4 py-5 text-slate-950 shadow-sm ring-1 ring-slate-200 md:block"
		>
			<p class={eyebrowClass}>Desktop Nav Rail</p>
			<p class="mt-3 text-lg font-black tracking-tight">Persistent navigation</p>
			<p class="mt-2 text-sm leading-6 text-slate-600">
				On larger screens the existing layout stays pinned in place.
			</p>
		</Component>

		<Component rail="content" class={gridDarkCardClass}>
			<p class="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Content Rail</p>
			<p class="mt-3 text-2xl font-black tracking-tight">{contentMode}</p>
			<p class="mt-2 text-sm leading-6 text-slate-300">
				This is the slice the play layout protects while the nav behavior changes around it.
			</p>
		</Component>

		<Component
			rail="right-lg"
			class="hidden rounded-xl bg-sky-200 px-4 py-5 text-slate-950 shadow-sm md:block"
		>
			<p class="text-xs font-black uppercase tracking-[0.18em] text-sky-950/70">MQ Signal</p>
			<p class="mt-3 text-lg font-black tracking-tight">{currentMq}</p>
			<p class="mt-2 text-sm leading-6 text-sky-950/80">
				Use the shared mq helpers for behavior, not to push more conditions into the base runtime.
			</p>
		</Component>

		<Component
			rail="full"
			class="rounded-xl border border-dashed border-slate-300 bg-white/90 px-4 py-5 text-slate-950 md:hidden"
		>
			<p class={eyebrowClass}>Mobile Nav</p>
			<p class="mt-3 text-lg font-black tracking-tight">Overlay trigger active</p>
			<p class="mt-2 text-sm leading-6 text-slate-600">
				The persistent rail collapses to the overlay pattern while the content area keeps the focus.
			</p>
		</Component>
	</Component>

	<Component
		tag="section"
		rails="full"
		debug={showRailsDebug ? { rails: true } : false}
		class={surfaceClass}
	>
		<Component rail="content" class="grid gap-3 md:grid-cols-3">
			{#each guidanceItems as item (item.title)}
				<div class={gridCardClass}>
					<p class={eyebrowClass}>{item.title}</p>
					<p class="mt-2 text-sm leading-6 text-slate-600">{item.copy}</p>
				</div>
			{/each}
		</Component>
	</Component>
</div>