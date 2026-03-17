<script lang="ts">
	import { Grid, Item, InputNew } from '@layerd/ui';
</script>

<div class="h-svh p-4">
	<Grid class="gap-4 h-full" items="a1:b1">

		<!-- Phase 1 -->
		<Item range="a1" class="p-4 bg-base-200/50">
			<h2 class="mb-4">Phase 1</h2>
			<InputNew />
		</Item>

		<!-- Phase 2 -->
		<Item range="b1" class="p-4 bg-base-200/50">
			<h2 class="mb-4">Phase 2</h2>
			<InputNew variant="text" label="text" />
			<InputNew variant="icon text" icon="home" label="icon text" />
			<InputNew variant="text icon" icon="home" label="text icon" />
			<InputNew variant="icon text icon" icon="home" label="icon text icon" />
		</Item>

	</Grid>
</div>