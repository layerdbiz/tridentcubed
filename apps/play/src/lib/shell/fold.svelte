<!-- A folding panel, as in the starter: a chevron, the panel's name, and its current choice beside it. -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	type FoldProps = { name: string; now?: string; isOpen?: boolean; children: Snippet };

	let { name, now = '', isOpen = $bindable(false), children }: FoldProps = $props();
</script>

<section class="fold">
	<button
		type="button"
		class="head"
		aria-expanded={isOpen}
		onclick={() => (isOpen = !isOpen)}
	>
		<span class="chevron"></span>
		<span class="name">{name}</span>
		<span class="now">{now}</span>
	</button>
	{#if isOpen}
		<div class="body">{@render children()}</div>
	{/if}
</section>

<style>
	.fold {
		border-top: 1px solid color-mix(in srgb, var(--bar-fg), transparent 90%);
	}
	.head {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		min-height: 38px;
		padding: 0 2px;
		border: 0;
		background: none;
		color: var(--bar-fg);
		text-align: left;
		cursor: pointer;
	}
	.chevron {
		flex: none;
		width: 7px;
		height: 7px;
		margin: 0 3px;
		border-right: 1.5px solid currentColor;
		border-bottom: 1.5px solid currentColor;
		transform: rotate(-45deg);
		transition: transform 0.15s;
	}
	[aria-expanded='true'] .chevron {
		transform: translateY(-2px) rotate(45deg);
	}
	.name {
		font-size: 13px;
		font-weight: 700;
	}
	.now {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		color: var(--bar-dim);
		font-size: 12px;
		text-align: right;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.body {
		display: grid;
		gap: 10px;
		padding: 2px 2px 14px;
	}
</style>
