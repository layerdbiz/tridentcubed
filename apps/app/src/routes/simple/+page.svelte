<script lang="ts">
	import { Page, Button, Grid, Item, Input, Textarea, Select, Text, Accordion, AccordionTitle, AccordionContent, Section } from '@layerd/ui';
	
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

			<Accordion total="3" class="bg-neutral-300/20 px-4 py-2 rounded-xl border-neutral-200 border" open>
				<AccordionTitle text="Panel" class="rounded" />
				<AccordionContent class="py-2">
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

				</AccordionContent>
			</Accordion>
		</Item>

		<!-- Pages
		------------------------------------------------------------------->
		<Item range="b1:b1" class="gap-5 p-4 overflow-y-scroll overflow-x-hidden">
			<div class="origin-top-left flex gap-4 p-4">
				<Page total="3">Page</Page>
			</div>
		</Item>
	</Grid>
</div>
