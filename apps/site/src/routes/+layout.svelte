<script>
	import '../app.css';
	let { children } = $props();
</script>

<svelte:boundary>
	{@render children()}

	{#snippet pending()}
		<div class="flex min-h-svh items-center justify-center">
			<div class="animate-pulse text-neutral-400"></div>
		</div>
	{/snippet}

	{#snippet failed(error, reset)}
		<div class="flex min-h-svh flex-col items-center justify-center gap-4">
			<p class="text-red-500">Something went wrong</p>
			<button onclick={reset} class="rounded bg-primary-500 px-4 py-2 text-white">Try again</button>
		</div>
	{/snippet}
</svelte:boundary>
