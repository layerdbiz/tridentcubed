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
				p="This route group now owns the report workflow. Use Edit to work in the current builder and Preview to open the preview-oriented route as we continue the split."
				class="text-neutral"
			/>
		</Item>
		<Item range="c2:c2" class="flex flex-col gap-3 md:min-w-56">
			<Button primary variant="text" label="Open Edit" href="/projects/edit" />
			<Button outline variant="text" label="Open Preview" href="/projects/preview" />
		</Item>
	</Grid>
</div>

<style lang="postcss">
	@reference "#app.css";
</style>