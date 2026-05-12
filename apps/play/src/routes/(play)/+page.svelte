<script lang="ts">
	import { Component } from '$lib';
</script>

<!-- content snippets -->
{#snippet leftContent()}
	<strong>Logo</strong>
{/snippet}
{#snippet centerContent()}
	<nav>
		<a href="/">Reports</a>
		<a href="/">Photos</a>
		<a href="/">Settings</a>
	</nav>
{/snippet}
{#snippet rightContent()}
	<button type="button">Export</button>
{/snippet}

<!-- EXAMPLES 
------------------------------------------------------->

<!-- Example 1 -->
<h2>✅ 1. Plain snippets</h2>
<Component tag="header" items="center stretch" class="header-demo">
	{#snippet left()}
		{@render leftContent()}
	{/snippet}

	{#snippet center()}
		{@render centerContent()}
	{/snippet}
	
	{#snippet right()}
		{@render rightContent()}
	{/snippet}
</Component>

<!-- Example 2 -->
<h2>✅ 2. Nested rails shell</h2>
<Component tag="header" grid="rails" rails="full" class="header-demo">
	<Component items="stretch stretch">
		{#snippet left()}
			{@render leftContent()}
		{/snippet}

		{#snippet centerCC()}
			{@render centerContent()}
		{/snippet}
		
		{#snippet right()}
			{@render rightContent()}
		{/snippet}
	</Component>
</Component>

<!-- Example 3 -->
<h2>✅ 3. rails shorthand + friendly full alias</h2>
<Component tag="header" rails="full" items="center full" class="header-demo">
	{#snippet left()}
		{@render leftContent()}
	{/snippet}

	{#snippet center()}
		{@render centerContent()}
	{/snippet}
	
	{#snippet right()}
		{@render rightContent()}
	{/snippet}
</Component>

<!-- Example 4 -->
<h2>✅ 4. explicit rails mode</h2>
<Component tag="header" grid="rails" rails="full" items="center stretch" class="header-demo">
	{#snippet left()}
		{@render leftContent()}
	{/snippet}

	{#snippet center()}
		{@render centerContent()}
	{/snippet}

	{#snippet right()}
		{@render rightContent()}
	{/snippet}
</Component>

<!-- Example 5 -->
<h2>✅ 5. rail-only child stays plain</h2>
<Component tag="section" grid="rails" rails="full" class="header-demo">
	<Component tag="header" rail="content-xl" class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/10 px-4 py-3">
		<strong>Rail Only</strong>
		<nav>
			<a href="/">Placed by parent rails</a>
			<a href="/">No child grid runtime</a>
		</nav>
	</Component>
</Component>

<!-- Example 6 -->
<h2>✅ 6. full-grid baseline</h2>
<Component tag="header" items="center" class="header-demo">
	{#snippet left()}
		{@render leftContent()}
	{/snippet}

	{#snippet center()}
		{@render centerContent()}
	{/snippet}
	
	{#snippet right()}
		{@render rightContent()}
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#app.css";

	:global {
		body { @apply p-6; }
		h2 { @apply mt-8 text-2xl font-bold; }
		.header-demo {
			@apply bg-slate-950 py-4 text-white mb-4;
			
			& strong { @apply inline-flex rounded-full bg-white/20 px-3 py-2; }
			& nav { @apply flex flex-wrap gap-3 bg-primary; }
			& nav > a { @apply font-black text-white no-underline inline-block bg-black/40; }
			& button { @apply rounded-full bg-white px-4 py-2 font-black text-black; }
		}
	}
</style>