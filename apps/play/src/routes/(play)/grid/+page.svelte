<script lang="ts">
	import { Grid, Item, mq } from '@layerd/ui';

	let { children } = $props();
</script>

<!-- col/row example -->
<Grid class=" bg-gray-200 h-svh relative" items="5x5" debug>
	<Item
		col="100px"
		range="d1:d5"
		class="z-10 bg-yellow-300/80 p-2"
	>
		<div class="bg-white/50">
			col
		</div>
	</Item>
	<Item
		row="300px"
		range="A2:E2"
		class="z-1 bg-blue-300/80 p-2"
		self="center"
	>
		<div class="bg-white/50">
			row
		</div>
		<div class="bg-white/50">
			row
		</div>
		<div class="bg-white/50">
			row
		</div>
	</Item>
</Grid>