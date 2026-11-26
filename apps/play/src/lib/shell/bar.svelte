<!-- The shell's top bar: the sidebar button, the page's name, and the page's own buttons on the right. It sits above
     the frames, never over them, so a prototype's own corner buttons stay free. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { isSideShown, toggleSide } from './side.svelte';

	type BarProps = { section?: string; title: string; actions?: Snippet };

	let { section = '', title, actions }: BarProps = $props();
</script>

<header class="bar">
	<button
		type="button"
		class="icon"
		aria-label={isSideShown() ? 'Hide the list' : 'Show the list'}
		aria-expanded={isSideShown()}
		onclick={toggleSide}
	>
		<svg
			viewBox="0 0 24 24"
			width="20"
			height="20"
			aria-hidden="true"
			><path
				fill="currentColor"
				d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"
			/></svg
		>
	</button>
	<h1>
		{#if section}<span class="section">{section}</span>{/if}
		<span class="title">{title}</span>
	</h1>
	<div class="actions">{@render actions?.()}</div>
</header>

<style>
	.bar {
		display: flex;
		flex: none;
		align-items: center;
		gap: 6px;
		height: 48px;
		padding: 0 8px;
		padding-top: env(safe-area-inset-top, 0px);
		box-sizing: content-box;
		border-bottom: 1px solid var(--line);
		background: var(--side-bg);
	}
	h1 {
		display: flex;
		flex: 1;
		align-items: baseline;
		gap: 8px;
		min-width: 0;
		margin: 0;
		font-size: 15px;
		white-space: nowrap;
	}
	.section {
		color: var(--muted);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.title {
		overflow: hidden;
		font-weight: 700;
		text-overflow: ellipsis;
	}
	.actions {
		display: flex;
		flex: none;
		align-items: center;
		gap: 4px;
	}
	.icon {
		display: grid;
		flex: none;
		width: 36px;
		height: 36px;
		place-items: center;
		border: 0;
		border-radius: 10px;
		background: none;
		cursor: pointer;
	}
	.icon:hover {
		background: var(--side-hover);
	}
</style>
