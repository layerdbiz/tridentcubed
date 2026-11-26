<!-- play.tridentcubed.com's first page (#342): everything on play by kind, and how to add one. -->
<script lang="ts">
	import Bar from './bar.svelte';
	import { SECTIONS } from './entries';

	function countOf(kind: string, count: number): string {
		if (kind === 'library') return 'Page';
		const word = kind === 'component' ? 'variant' : 'option';
		return `${count} ${word}${count === 1 ? '' : 's'}`;
	}
</script>

<svelte:head>
	<title>Trident Cubed Play</title>
</svelte:head>

<Bar title="Trident Cubed Play" />

<main class="home">
	<p class="lead">
		Ideas to try before they are built. Open one, compare its options, and say which works best.
	</p>

	{#each SECTIONS as section (section.kind)}
		<section>
			<h2>{section.label}</h2>
			<p class="about">{section.about}</p>
			{#if section.entries.length}
				<ul>
					{#each section.entries as entry (entry.href)}
						<li>
							<a href={entry.href}>
								<span class="name">{entry.label}</span>
								<span class="count">{countOf(entry.kind, entry.options.length)}</span>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="empty">None yet.</p>
			{/if}
		</section>
	{/each}

	<p class="add">
		Adding one is adding a file: <code>src/prototypes/&lt;topic&gt;/&lt;option&gt;.html</code> or
		<code>src/components/&lt;name&gt;/&lt;variant&gt;.html</code> in <code>apps/play</code>. Made-up
		data only: anyone with the link can open play.
	</p>
</main>

<style>
	.home {
		flex: 1;
		min-height: 0;
		padding: 24px 16px 48px;
		padding-bottom: max(48px, env(safe-area-inset-bottom, 0px));
		overflow-y: auto;
	}
	.home > * {
		max-width: 880px;
		margin-inline: auto;
	}
	.lead {
		margin-block: 0 8px;
		color: var(--muted);
		font-size: 15px;
	}
	h2 {
		margin: 28px auto 2px;
		font-size: 18px;
	}
	.about {
		margin-block: 0 12px;
		color: var(--muted);
		font-size: 14px;
	}
	ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 10px;
		padding: 0;
		list-style: none;
	}
	a {
		display: flex;
		flex-direction: column;
		gap: 4px;
		height: 100%;
		padding: 14px 16px;
		border: 1px solid var(--line);
		border-radius: 14px;
		background: var(--side-bg);
		color: inherit;
		text-decoration: none;
	}
	a:hover {
		border-color: var(--accent);
	}
	.name {
		font-weight: 700;
	}
	.count,
	.empty {
		color: var(--muted);
		font-size: 13px;
	}
	.add {
		margin-top: 32px;
		color: var(--muted);
		font-size: 13px;
		line-height: 1.5;
	}
	code {
		font-size: 12px;
	}
</style>
