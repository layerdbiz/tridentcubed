<script lang="ts">
	import { Component, Mq, mq } from '@layerd/ui';
</script>

<svelte:head>
	<title>MQ Client Demo | Play</title>
</svelte:head>

<Mq mode="client" />

<div class="p-8">
	<h1 class="mb-4 text-4xl font-black tracking-tight text-slate-950">MQ Client Demo</h1>

	<p class="mb-8 max-w-3xl text-base leading-6">
		This demo tests client-side-only MQ behavior with <code>ssr = false</code>. There is no base/content
		projection — the exact breakpoint renders directly.
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
				<p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">mq.base</p>
				<p class="mt-3 min-h-10 text-3xl font-black tracking-tight text-slate-950">
					{mq.base ? '✓' : '✗'}
				</p>
			</div>
		</div>
	</Component>

	<Component tag="section" rails="full" class="gap-4 rounded-2xl bg-slate-50 p-4">
		<h2 class="text-lg font-black tracking-tight text-slate-950">Direct Breakpoint Rendering</h2>

		{#if mq.sm}
			<div class="rounded-xl bg-blue-100 p-4 text-blue-950">
				<p class="font-black">📱 Mobile View (sm)</p>
				<p class="mt-2 text-sm">Content optimized for small screens.</p>
			</div>
		{:else if mq.md}
			<div class="rounded-xl bg-green-100 p-4 text-green-950">
				<p class="font-black">💻 Tablet View (md)</p>
				<p class="mt-2 text-sm">Content optimized for medium screens.</p>
			</div>
		{:else}
			<div class="rounded-xl bg-purple-100 p-4 text-purple-950">
				<p class="font-black">🖥️ Desktop View ({mq.lg ? 'lg' : mq.xl ? 'xl' : 'xxl'})</p>
				<p class="mt-2 text-sm">Content optimized for large screens.</p>
			</div>
		{/if}
	</Component>
</div>
