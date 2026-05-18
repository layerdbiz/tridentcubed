<script lang="ts">
	import { page } from '$app/state';
	import { Component, mq } from '@layerd/ui';
	const showRailsDebug = $derived(page.url.searchParams.get('railsDebug') === '1');
</script>

<svelte:head>
	<title>Rail Widths + MQ | Play</title>
</svelte:head>

<div class="grid gap-4 p-4 md:p-5">
	<h2 class="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Rail Widths + MQ</h2>
	<p class="max-w-3xl text-sm leading-6 text-slate-700 md:text-base">
		One component, one changing <code>rail</code> prop. The active mq bucket selects the current rail width.
	</p>

	<Component
		rails="full"
		debug={showRailsDebug ? { rails: true } : false}
		class="rounded-2xl bg-slate-50 gap-4"
	>
		<Component
			rail={mq.base
				? 'full'
				: mq.sm
					? 'sm'
					: mq.md
						? 'content'
						: mq.lg
							? 'lg'
							: mq.xl
								? 'xl'
								: mq.xxl
									? 'xxl'
									: 'full'}
			class="rounded-xl bg-sky-200 p-10 font-black text-slate-950"
		/>
	</Component>
</div>