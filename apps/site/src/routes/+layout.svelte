<script>
	import '../app.css';
	let { children } = $props();
</script>

<!-- 
	Root layout serves both (site) and (company) route groups.
	FOUC prevention is handled per-group in their respective layouts.
	See (site)/+layout.svelte for the loading overlay implementation.
-->
{@render children()}
