<script lang="ts">
	// A sample line chart (layerchart), on the base component; its line is the theme's primary.
	import { Component, type ComponentProps } from '@layerd/ui';
	import { LineChart } from 'layerchart';
	import { lineData } from '../data/data.js';

	let props: ComponentProps = $props();
</script>

<Component
	style="height: 400px"
	{...props}
>
	<LineChart
		data={lineData}
		x="date"
		y="value"
	/>
</Component>
