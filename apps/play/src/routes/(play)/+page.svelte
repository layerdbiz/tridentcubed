<script lang="ts">
	import { Component } from '$lib';
</script>


<p class="example-note">
	`left` / `center` / `right` are semantic aliases with their own self-placement. `items` and
	`content` affect the active grid, but they do not override those alias-level placements.
</p>

<!-- Example 1 -->
<h2>Example 1</h2>
<Component tag="header" grid="rails" rails="content">
	{#snippet left()}
		<strong>Logo</strong>
	{/snippet}

	{#snippet center()}
		<nav>
			<a href="/">Reports</a>
			<a href="/">Photos</a>
			<a href="/">Settings</a>
		</nav>
	{/snippet}
	
	{#snippet right()}
		<button type="button">Export</button>
	{/snippet}
</Component>

<p class="example-caption">Scoped rails layout with semantic aliases.</p>


<!-- Example 2 -->
<h2>Example 2</h2>
<Component tag="header" grid="rails" content="center" items="center">
	{#snippet left()}
		<strong>Logo</strong>
	{/snippet}

	{#snippet center()}
		<nav>
			<a href="/">Reports</a>
			<a href="/">Photos</a>
			<a href="/">Settings</a>
		</nav>
	{/snippet}
	
	{#snippet right()}
		<button type="button">Export</button>
	{/snippet}
</Component>

<p class="example-caption">
	Same semantic aliases, but with `content="center"` and `items="center"`. These props now
	target the inner layout grid instead of also recentering the outer rails scaffold.
</p>


<!-- Example 3 -->
<h2>Example 3</h2>
<Component tag="header" grid="rails" rails="content" items="center stretch">
	{#snippet a2()}
		<strong>Logo</strong>
	{/snippet}

	{#snippet b2()}
		<nav>
			<a href="/">Reports</a>
			<a href="/">Photos</a>
			<a href="/">Settings</a>
		</nav>
	{/snippet}

	{#snippet c2()}
		<button type="button">Export</button>
	{/snippet}
</Component>

<p class="example-caption">
	Canonical cells `a2 / b2 / c2` do not carry the semantic alias self-placement, so `items`
	controls their alignment directly.
</p>


<!-- Example 4 -->
<h2>Example 4</h2>
<Component tag="section" grid="full" rows="3rem 3rem 3rem" content="between" class="content-demo">
	{#snippet row1()}
		<div class="demo-pill">row1</div>
	{/snippet}

	{#snippet row2()}
		<div class="demo-pill">row2</div>
	{/snippet}

	{#snippet row3()}
		<div class="demo-pill">row3</div>
	{/snippet}
</Component>

<p class="example-caption">
	`content` only becomes visible when the grid has extra free space to distribute. This full-grid
	box gives it room, so `between` can actually show up.
</p>

<style lang="postcss">
	@reference "#app.css";

	:global {
		body { @apply p-6; }
		.example-note { @apply mb-4 max-w-3xl text-sm leading-6 text-slate-600; }
		.example-caption { @apply mb-6 max-w-3xl text-sm leading-6 text-slate-600; }
		header {
			@apply bg-slate-950 py-4 text-white mb-4;
			
			& strong { @apply inline-flex rounded-full bg-white/20 px-3 py-2; }
			& nav { @apply flex flex-wrap gap-3 bg-primary h-full; }
			& nav > a { @apply font-black text-white no-underline h-full inline-block bg-black/40; }
			& button { @apply rounded-full bg-white px-4 py-2 font-black text-black; }
		}
		.header-demo-tall { @apply min-h-28; }
		.content-demo {
			@apply mb-4 min-h-72 rounded-3xl border border-slate-300/60 bg-slate-100 p-4;
		}
		.demo-pill {
			@apply inline-flex rounded-full bg-slate-950 px-4 py-2 font-black text-white;
		}
	}
</style>