<script lang="ts">
	import { Button, Text } from '@layerd/ui';
</script>

<div class="flex min-h-svh items-center justify-center px-6 py-12">
	<div class="w-full max-w-3xl rounded-3xl border border-secondary-200 bg-white p-8 shadow-sm md:p-10">
		<div class="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
			<div class="space-y-3">
				<Text h1="Projects" />
				<Text
					p="This route group now owns the report workflow. Use Edit to work in the current builder and Preview to open the preview-oriented route as we continue the split."
					class="text-neutral"
				/>
			</div>

			<div class="flex flex-col gap-3 md:min-w-56">
				<Button primary variant="text" label="Open Edit" href="/projects/edit" />
				<Button outline variant="text" label="Open Preview" href="/projects/preview" />
			</div>
		</div>
	</div>
</div>

<style lang="postcss">
	@reference "#app.css";
</style>