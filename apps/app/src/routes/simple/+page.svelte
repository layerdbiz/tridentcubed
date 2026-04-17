<script lang="ts">
	import { Button, Grid, Item, Input, Textarea, Select, Text } from '@layerd/ui';
	import { Panel, Page } from '$lib';
	
	const selectOptions = [
		{ label: 'Draft', value: 'draft' },
		{ label: 'Review', value: 'review' },
		{ label: 'Approved', value: 'approved' },
		{ label: 'Archived', value: 'archived' }
	];
</script>

<div class="h-svh overflow-hidden">
	<Grid items="a1:b1" class="gap-4 h-full p-4">

		<!-- Panels 
		------------------------------------------------------------------->
		<Item range="a1:a1" col="420px" class="grid auto-rows-min gap-4 p-4 border-r border-neutral-300/50">
			<Text h2="Panels" />

			<Panel name="Group 1" label="Panel 1" layout="panel-a" open>
				<Grid rows="auto" items="a1:b3" class="gap-2!">
					<Item col="2fr" range="a1:a1">
						<Input xs variant="text" label="Text" />
					</Item>
					<Item col="1fr" range="b1:b1">
						<Select xs variant="text icon" icon="chevron-down" label="Select" options={selectOptions} />
					</Item>
					<Item range="a2:b2">
						<Textarea xs variant="text" label="Description" />
					</Item>
					<Item range="a3:a3">
						<Button xs variant="text" label="Back"/>
						<Button primary xs variant="text" label="Next"/>
					</Item>
				</Grid>
			</Panel>

			<Panel name="Group 1" total="3" layout="panel-b" />
		</Item>

		<!-- Pages
		------------------------------------------------------------------->
		<Item range="b1:b1" class="gap-5 p-4 overflow-y-scroll overflow-x-hidden">
			<div class="origin-top-left flex flex-wrap gap-4 p-4" style="zoom: 0.47;">
				<Page layout="cover">Page 1</Page>
				<Page>Page 2</Page>
				<Page>Page 3</Page>
			</div>
		</Item>
	</Grid>
</div>
