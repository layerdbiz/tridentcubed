<script>
	import '../app.css';
	let { children } = $props();
</script>

<!-- 
	NOTE: We removed <svelte:boundary> from the root layout because it was blocking 
	prerendered content from appearing in HTML source (bad for SEO).
	
	Any await in child components would trigger the boundary's pending state during SSR,
	causing the entire page to show "loading" instead of prerendered content.
	
	Individual pages/components should add their own <svelte:boundary> around specific
	dynamic sections that need loading states (e.g., around the Globe component).
-->
{@render children()}
