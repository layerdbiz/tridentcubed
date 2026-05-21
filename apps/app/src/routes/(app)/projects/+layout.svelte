<script lang="ts">
	let { children } = $props();
	import { Component, Logo, Text, mq } from '@layerd/ui';
</script>

{@render children()}

<Component class="pointer-events-none fixed bottom-4 left-4 z-40 md:bottom-6 md:left-6 gap-1.5 bg-black rounded-full pl-1.5 pr-3 py-0.75">
	{#snippet leftCC()}
		<Logo
			mode="current"
			href="/"
			class="size-6 text-warning-400"
		/>
	{/snippet}

	{#snippet centerCC()}
		<Text p="BETA" class="text-[11px] font-black uppercase tracking-[0.24em] text-white"/>
	{/snippet}
</Component>