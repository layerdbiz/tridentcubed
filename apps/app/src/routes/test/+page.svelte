<script lang="ts">
	import { Grid, Item, Input, InputNew } from '@layerd/ui';
</script>

<div class="h-svh p-4">
	<Grid class="bg-gray-200 h-full" items="a1:b1" debug>

		<!-- Old Input -->
		<Item range="a1" class="p-4">
			<Input />
			<Input label="Old Input 1" />
			<Input variant="label" label="Old Input 2" />
			<Input variant="icon label" icon="home" label="Old Input 3" />
			<Input variant="label icon" icon="home" label="Old Input 4" />
			<Input variant="icon label icon" icon="home" label="Old Input 5" />
		</Item>

		<!-- New Input -->
		<Item range="b1" class="p-4">
			<InputNew />
			<InputNew label="New Input 1" />
			<InputNew variant="label" label="New Input 2" />
			<InputNew variant="icon label" icon="home" label="New Input 3" />
			<InputNew variant="label icon" icon="home" label="New Input 4" />
			<InputNew variant="icon label icon" icon="home" label="New Input 5" />
		</Item>

	</Grid>
</div>