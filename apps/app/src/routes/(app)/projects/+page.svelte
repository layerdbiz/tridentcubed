<script lang="ts">
	import { Grid, Item, Button, Text } from '@layerd/ui';
</script>

<div class="min-h-svh w-full mx-auto flex flex-col max-w-3xl items-center justify-center">
	<Grid items="a1:c2" rows="auto" class="w-full rounded-3xl border border-secondary-200 bg-white p-8!">
		<Item range="a1:c1">
			<Text h1="Projects" />
		</Item>
		<Item range="a2:b2">
			<Text
				p="Open the project details workspace to edit and preview the report together on desktop, with a mobile pane switch inside the same page."
				class="text-neutral"
			/>
		</Item>
		<Item range="c2:c2" class="flex md:min-w-56" row="auto">
			<Button primary variant="text" label="Open Workspace" href="/projects/current" />
		</Item>
	</Grid>
</div>

<style lang="postcss">
	@reference "#app.css";
</style>