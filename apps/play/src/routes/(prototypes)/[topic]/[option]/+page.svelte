<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.topicLabel} {data.prototype.label} · Trident Cubed Play</title>
	<meta
		name="robots"
		content="noindex"
	/>
</svelte:head>

<div class="flex h-dvh flex-col bg-slate-950">
	<nav class="flex h-10 shrink-0 items-center gap-1 overflow-x-auto px-2 text-sm text-slate-300">
		<a
			href="/"
			class="rounded-md px-2 py-1 hover:bg-white/10 hover:text-white">← All</a
		>
		<span class="px-2 font-semibold text-white">{data.topicLabel}</span>
		{#each data.options as option (option.option)}
			<a
				href="/{option.topic}/{option.option}"
				class="rounded-md px-2.5 py-1 {option.option === data.prototype.option
					? 'bg-white text-slate-950'
					: 'hover:bg-white/10 hover:text-white'}"
				aria-current={option.option === data.prototype.option ? 'page' : undefined}
				>{option.label}</a
			>
		{/each}
		<a
			href={data.prototype.url}
			class="ml-auto shrink-0 rounded-md px-2 py-1 hover:bg-white/10 hover:text-white"
			>Full screen</a
		>
	</nav>
	<iframe
		src={data.prototype.url}
		title="{data.topicLabel} {data.prototype.label}"
		class="w-full flex-1 border-0 bg-white"
	></iframe>
</div>
