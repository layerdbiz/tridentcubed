<script lang="ts">
	import '../app.css';
	import { Component } from '@layerd/ui';

	let { children } = $props();
</script>

{#snippet content(el: any)}
	<div class="demo">{el}</div>
{/snippet}

{#snippet links()}
	<a href="/">Home</a>
	<a href="/demo">Demo</a>
	<a href="/features">Features</a>
	<a href="/grid">Grid</a>
{/snippet}

<!-- App -->
<!-- Deubg: Grid -->
<Component tag="main" class="h-svh gap-5!">

	<!-- Nav 
	------------------------------------------------------------->
	{#snippet a1a3()}
		<!-- Deubg: Rails -->
		<Component tag="nav" rails="full" class="h-full py-5 bg-neutral-200">
			{@render links()}
		</Component>
	{/snippet}

	<!-- Content 
	------------------------------------------------------------->
	<!-- ✅ no rails -->
	{#snippet b1c3()}
		<Component tag="article" rails="full" class="h-full py-5 overflow-y-scroll">
			<Component rail="content-xl" class="bg-primary" />
			{@render children()}
		</Component>
	{/snippet}

</Component>


<style lang="postcss">
	@reference "#app.css";

	.demo { @apply p-2 bg-white/40 border-2 border-primary rounded-xl; }

</style>