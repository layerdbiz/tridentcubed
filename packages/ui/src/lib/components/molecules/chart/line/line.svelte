<script>
	import { LineChart } from 'layerchart';
	import { data } from '../data/data';
</script>

<div style:height="400px">
	<LineChart
		{data}
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
