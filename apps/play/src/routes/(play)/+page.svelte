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
<h2>✅ 1. Snippets Only (items="center stretch")</h2>
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
<h2>✅ 2. Rails + Snippets (items="center stretch")</h2>
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
<h2>✅ 3. grid="rails" mode</h2>
<Component tag="header" grid="rails" rails="full" items="stretch stretch" class="header-demo">
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

<!-- Example 4 -->
<h2>✅ 4. grid="full" mode</h2>
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