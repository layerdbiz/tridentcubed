<script>
	import { LineChart } from 'layerchart';
	import { lineData } from '../data/data.js';
</script>

<div style:height="400px">
	<LineChart
		{lineData}
		x="date"
		y="value"
	/>
</div>

<style>
	/* Global styles (or can use Tailwind)  */
	:global(.lc-root-container) {
		--color-primary: hsl(200 100% 50%);
	}
</style>
