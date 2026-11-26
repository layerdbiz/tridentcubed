<!-- The shell's list of everything on play: Prototypes, Components and the Library, with a box to find one. -->
<script lang="ts">
	import { page } from '$app/state';
	import { SECTIONS } from './entries';
	import { shutSide } from './side.svelte';

	let query = $state('');

	const sections = $derived(
		SECTIONS.map((section) => ({
			...section,
			found: section.entries.filter((entry) =>
				entry.label.toLowerCase().includes(query.trim().toLowerCase())
			)
		}))
	);

	function countOf(kind: string, count: number): string {
		if (kind === 'library') return '';
		return String(count);
	}
</script>

<nav
	class="side"
	aria-label="Everything on play"
>
	<a
		class="brand"
		href="/"
		onclick={shutSide}>Trident Cubed <b>Play</b></a
	>
	<input
		type="search"
		placeholder="Find"
		aria-label="Find a prototype or component"
		bind:value={query}
	/>
	<div class="list">
		{#each sections as section (section.kind)}
			<section>
				<h2>{section.label}</h2>
				{#each section.found as entry (entry.href)}
					<a
						href={entry.href}
						aria-current={page.url.pathname === entry.href ? 'page' : undefined}
						onclick={shutSide}
					>
						<span class="name">{entry.label}</span>
						<span class="count">{countOf(entry.kind, entry.options.length)}</span>
					</a>
				{:else}
					<p class="empty">{query ? 'Nothing found' : 'None yet'}</p>
				{/each}
			</section>
		{/each}
	</div>
</nav>

<style>
	.side {
		display: flex;
		flex-direction: column;
		width: 260px;
		height: 100%;
		padding-top: env(safe-area-inset-top, 0px);
		border-right: 1px solid var(--line);
		background: var(--side-bg);
	}
	.brand {
		display: flex;
		flex: none;
		align-items: center;
		gap: 5px;
		height: 48px;
		padding: 0 16px;
		color: inherit;
		font-size: 15px;
		font-weight: 600;
		text-decoration: none;
	}
	.brand b {
		color: var(--accent);
	}
	input {
		flex: none;
		height: 34px;
		margin: 4px 12px 8px;
		padding: 0 12px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--bg);
		color: inherit;
		font: inherit;
		font-size: 16px;
	}
	.list {
		flex: 1;
		padding: 0 8px 24px;
		padding-bottom: max(24px, env(safe-area-inset-bottom, 0px));
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	h2 {
		margin: 16px 8px 4px;
		color: var(--muted);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	a:not(.brand) {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 34px;
		padding: 0 8px;
		border-radius: 8px;
		color: inherit;
		font-size: 14px;
		text-decoration: none;
	}
	a:not(.brand):hover {
		background: var(--side-hover);
	}
	a[aria-current='page'] {
		background: var(--side-now);
		font-weight: 600;
	}
	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.count {
		color: var(--muted);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}
	.empty {
		margin: 2px 8px 6px;
		color: var(--muted);
		font-size: 13px;
	}
</style>
