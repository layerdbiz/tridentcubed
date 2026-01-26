<script lang="ts">
	import '../app.css';
	import { Grid, Item, mq } from '@layerd/ui';

	let { children } = $props();
</script>

<!-- col/row example -->
<Grid items="5x5" debug>
	<Item
		col="100px"
		range={mq.sm ? 'A1:A5' : mq.md ? 'B1:B5' : mq.lg ? 'C1:C5' : mq.xl ? 'D1:D5' : mq.xxl ? 'E1:E5' : 'A1:B1'}
		class="bg-yellow-300/80 sm:bg-yellow-300/80 md:bg-blue-500/80 lg:bg-red-500/80 xl:bg-purple-500/80 2xl:bg-pink-500/80"
	>
		{@render children()}
	</Item>
	<Item
		row="100px"
		range={mq.sm ? 'A1:E1' : mq.md ? 'A2:E2' : mq.lg ? 'A3:E3' : mq.xl ? 'A4:E4' : mq.xxl ? 'A5:E5' : 'A1:B1'}
		class="bg-yellow-300/80 sm:bg-yellow-300/80 md:bg-blue-500/80 lg:bg-red-500/80 xl:bg-purple-500/80 2xl:bg-pink-500/80"
	>
		{@render children()}
	</Item>
</Grid>

<!-- holy grail example -->
<!-- <Grid items="A1:C3" debug>
	<Item range="A1:B1" row="auto" class="bg-blue-500/80">HEADER</Item>
	<Item range="B2" class="bg-gray-500/80">{@render children()}</Item>
	<Item range="A2" col="180px" class="bg-yellow-300/80">LEFT</Item>
	<Item range="C2" col="180px" class="bg-yellow-300/80">RIGHT</Item>
	<Item range="A3:C3" row="auto" class="bg-green-500/80">FOOTER</Item>
</Grid> -->