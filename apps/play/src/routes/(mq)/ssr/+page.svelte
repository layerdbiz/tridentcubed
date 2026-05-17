<script lang="ts">
	import { Component, Mq, mq } from '@layerd/ui';
</script>

<svelte:head>
	<title>MQ SSR Demo | Play</title>
</svelte:head>

<Mq mode="ssr" loading="fade" duration={3000} />

<!-- 
{#if mq.loading}
	<p class="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Loading layout…</p>
{/if} -->

{#if mq.base}
	<h1 class="mb-4 text-4xl font-black tracking-tight text-slate-950">MQ SSR Demo</h1>

	<p class="mb-8 max-w-3xl leading-6 text-slate-700">
		This demo tests SSR mode with <code>ssr = true</code>. The page renders a canonical base/content projection
		on the server, then upgrades to the exact breakpoint after MQ initializes on the client. A loading overlay
		is shown for 3 seconds during the transition.
	</p>

	<Component tag="section" rails="full" class="mb-8 gap-4 rounded-2xl bg-slate-50 p-4">
		<div class="grid gap-3 md:grid-cols-4">
			<div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
				<p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Current Bucket</p>
				<p class="mt-3 min-h-10 text-3xl font-black tracking-tight text-slate-950">
					{mq.bucket}
				</p>
			</div>

			<div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
				<p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">mq.ready</p>
				<p class="mt-3 min-h-10 text-3xl font-black tracking-tight text-slate-950">
					{mq.ready ? '✓' : '✗'}
				</p>
			</div>

			<div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
				<p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">mq.loading</p>
				<p class="mt-3 min-h-10 text-3xl font-black tracking-tight text-slate-950">
					{mq.loading ? '✓' : '✗'}
				</p>
			</div>

			<div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
				<p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">mq.base/content</p>
				<p class="mt-3 min-h-10 text-3xl font-black tracking-tight text-slate-950">
					{mq.base ? '✓' : '✗'}
				</p>
			</div>
		</div>
	</Component>

{:else}
	
	<Component tag="section" rails="full" class="gap-4 rounded-2xl bg-slate-50 p-4">
		<h2 class="text-lg font-black tracking-tight text-slate-950">Responsive Content Projection</h2>

		{#if mq.base || mq.content}
			<div class="rounded-xl bg-yellow-100 p-4 text-yellow-950">
				<p class="font-black">📄 Canonical Base/Content Projection</p>
				<p class="mt-2 text-sm">
					This is the SSR-safe canonical layout. Real semantic HTML for search engines and first load.
				</p>
			</div>
		{:else if mq.sm}
			<div class="rounded-xl bg-blue-100 p-4 text-blue-950">
				<p class="font-black">📱 Mobile View (sm)</p>
				<p class="mt-2 text-sm">Content optimized for small screens after MQ is ready.</p>
			</div>
		{:else if mq.md}
			<div class="rounded-xl bg-green-100 p-4 text-green-950">
				<p class="font-black">💻 Tablet View (md)</p>
				<p class="mt-2 text-sm">Content optimized for medium screens after MQ is ready.</p>
			</div>
		{:else}
			<div class="rounded-xl bg-purple-100 p-4 text-purple-950">
				<p class="font-black">🖥️ Desktop View ({mq.lg ? 'lg' : mq.xl ? 'xl' : 'xxl'})</p>
				<p class="mt-2 text-sm">Content optimized for large screens after MQ is ready.</p>
			</div>
		{/if}
	</Component>
{/if}
