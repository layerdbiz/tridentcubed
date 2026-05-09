<script lang="ts">
	import { Component } from '$lib';
</script>

<!-- component with rails and snippets -->
<Component tag="header" grid="rails" rails="content-xl" class="bg-primary text-white">
	<Component>
		{#snippet leftCC()}{/snippet}
		{#snippet centerCC()}{/snippet}
		{#snippet rightCC()}{/snippet}
	</Component>
</Component>
<!-- html output: 
		<header class="root-grid bg-primary text-white is-grid-rails is-rails-content-xl" style="--grid-gap: 0.5rem;"> 
			<div 
				class="root-grid" 
				style="
					--grid-template-columns: 
						minmax(calc(var(--grid-min-col, 2ch) * 0.5), max-content) 
						minmax(calc(var(--grid-min-col, 2ch) * 0.5), max-content) 
						minmax(0, 1fr)
						minmax(0, 1fr)
						minmax(calc(var(--grid-min-col, 2ch) * 0.5), max-content) 
						minmax(calc(var(--grid-min-col, 2ch) * 0.5), max-content); 
					
					--grid-template-rows: 
						minmax(calc(var(--grid-min-row, 1lh) * 0.5), max-content)
						minmax(calc(var(--grid-min-row, 1lh) * 0.5), max-content); 
						
					--grid-gap: 0.5rem;"
			>  
				<div class="is-cell is-cc is-mode-compact" style="--grid-column: 1 / 3; --grid-row: 1 / 3;">
					<span class="slot-fallback">leftCC</span>
				</div>
				<div class="is-cell is-cc is-mode-compact" style="--grid-column: 3 / 5; --grid-row: 1 / 3;">
					<span class="slot-fallback">centerCC</span>
				</div>
				<div class="is-cell is-cc is-mode-compact" style="--grid-column: 5 / 7; --grid-row: 1 / 3;">
					<span class="slot-fallback">rightCC</span>
				</div>
			</div> 
		</header>
-->

<style lang="postcss">
	@reference "#app.css";

</style>