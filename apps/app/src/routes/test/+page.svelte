<script lang="ts">
	import { Button, Grid, Item, Input, Textarea, Select } from '@layerd/ui';

	const selectOptions = [
		{ label: 'Draft', value: 'draft' },
		{ label: 'Review', value: 'review' },
		{ label: 'Approved', value: 'approved' },
		{ label: 'Archived', value: 'archived' }
	];

	let textareaValue = $state('Inspection summary with a few lines of prefilled content.');
	let textareaValueSized = $state('Sized textarea example.');
	let selectValue = $state('review');
	let selectValueSized = $state('approved');
</script>

<div class="min-h-svh p-4">
	<Grid items="a1:d1" class="gap-4 h-full p-4">

		<!-- <Input> Examples 
		------------------------------------------------------------------->
		<Item col="1fr" class="grid auto-rows-min gap-5 bg-base-200/50 p-4">
			<!-- boolean -->
			<h3>Input (boolean)</h3>
			<Input xxs variant="icon text icon" icon="home" iconEnd="home" label="xxs (boolean)" />
			<Input xs variant="icon text icon" icon="home" iconEnd="home" label="xs (boolean)" />
			<Input sm variant="icon text icon" icon="home" iconEnd="home" label="sm (boolean)" />
			<Input md variant="icon text icon" icon="home" iconEnd="home" label="md (boolean)" />
			<Input lg variant="icon text icon" icon="home" iconEnd="home" label="lg (boolean)" />
			<Input xl variant="icon text icon" icon="home" iconEnd="home" label="xl (boolean)" />
			<Input xxl variant="icon text icon" icon="home" iconEnd="home" label="xxl (boolean)" />
			
			<!-- prop -->
			<h3>Input (prop)</h3>
			<Input size="xxs" variant="icon text icon" icon="home" iconEnd="home" label="size='xxs' (prop)" />
			<Input size="xs" variant="icon text icon" icon="home" iconEnd="home" label="size='xs' (prop)" />
			<Input size="sm" variant="icon text icon" icon="home" iconEnd="home" label="size='sm' (prop)" />
			<Input size="md" variant="icon text icon" icon="home" iconEnd="home" label="size='md' (prop)" />
			<Input size="lg" variant="icon text icon" icon="home" iconEnd="home" label="size='lg' (prop)" />
			<Input size="xl" variant="icon text icon" icon="home" iconEnd="home" label="size='xl' (prop)" />
			<Input size="xxl" variant="icon text icon" icon="home" iconEnd="home" label="size='xxl' (prop)" />
		</Item>

		<!-- <Textarea> Examples 
		------------------------------------------------------------------->
		<Item col="1fr" class="grid auto-rows-min gap-5 bg-base-200/50 p-4">
			<!-- boolean -->
			<h3>Textarea (boolean)</h3>
			<Textarea variant="text" label="Textarea" />
			<Textarea variant="icon text" icon="home" label="Textarea" />
			<Textarea variant="text icon" icon="home" iconEnd="home" label="Textarea" />
			<Textarea variant="icon text icon" icon="home" iconEnd="home" label="Textarea" />
		</Item>

		<!-- <Select> Examples 
		------------------------------------------------------------------->
		<Item col="1fr" class="grid auto-rows-min gap-5 bg-base-200/50 p-4">
			<!-- boolean -->
			<h3>Select (boolean)</h3>
			<Select xxs variant="text icon" icon="chevron-down" label="xxs (boolean)" options={selectOptions} />
			<Select xs variant="text icon" icon="chevron-down" label="xs (boolean)" options={selectOptions} />
			<Select sm variant="text icon" icon="chevron-down" label="sm (boolean)" options={selectOptions} />
			<Select md variant="text icon" icon="chevron-down" label="md (boolean)" options={selectOptions} />
			<Select lg variant="text icon" icon="chevron-down" label="lg (boolean)" options={selectOptions} />
			<Select xl variant="text icon" icon="chevron-down" label="xl (boolean)" options={selectOptions} />
			<Select xxl variant="text icon" icon="chevron-down" label="xxl (boolean)" options={selectOptions} />
			
			<!-- prop -->
			<h3>Select (prop)</h3>
			<Select bind:value={selectValue} size="xxs" variant="icon text icon" icon="home" iconEnd="home" label="size='xxs' (prop)" options={selectOptions} />
			<Select size="xs" variant="icon text icon" icon="home" iconEnd="home" label="size='xs' (prop)" options={selectOptions} placeholder="Choose status" />
			<Select size="sm" variant="icon text icon" icon="home" iconEnd="home" label="size='sm' (prop)" options={selectOptions} placeholder="Choose status" />
			<Select size="md" variant="icon text icon" icon="home" iconEnd="home" label="size='md' (prop)" options={selectOptions} placeholder="Choose status" />
			<Select size="lg" variant="icon text icon" icon="home" iconEnd="home" label="size='lg' (prop)" options={selectOptions} placeholder="Choose status" />
			<Select size="xl" variant="icon text icon" icon="home" iconEnd="home" label="size='xl' (prop)" options={selectOptions} placeholder="Choose status" />
			<Select bind:value={selectValueSized} size="xxl" variant="icon text icon" icon="home" iconEnd="home" label="size='xxl' (prop)" options={selectOptions} />
		</Item>

		<!-- <Button> Examples 
		------------------------------------------------------------------->
		<Item col="auto" class="grid auto-rows-min gap-5 bg-base-200/50 p-4">
			<!-- boolean -->
			<h3>Button (boolean)</h3>
			<Button width="auto" xxs variant="icon text icon" icon="home" iconEnd="home" label="xxs (boolean)" />
			<Button width="auto" xs variant="icon text icon" icon="home" iconEnd="home" label="xs (boolean)" />
			<Button width="auto" sm variant="icon text icon" icon="home" iconEnd="home" label="sm (boolean)" />
			<Button width="auto" md variant="icon text icon" icon="home" iconEnd="home" label="md (boolean)" />
			<Button width="auto" lg variant="icon text icon" icon="home" iconEnd="home" label="lg (boolean)" />
			<Button width="auto" xl variant="icon text icon" icon="home" iconEnd="home" label="xl (boolean)" />
			<Button width="auto" xxl variant="icon text icon" icon="home" iconEnd="home" label="xxl (boolean)" />
			
			<!-- prop -->
			<h3>Button (prop)</h3>
			<Button size="xxs" variant="icon text icon" icon="home" iconEnd="home" label="size='xxs' (prop)" />
			<Button size="xs" variant="icon text icon" icon="home" iconEnd="home" label="size='xs' (prop)" />
			<Button size="sm" variant="icon text icon" icon="home" iconEnd="home" label="size='sm' (prop)" />
			<Button size="md" variant="icon text icon" icon="home" iconEnd="home" label="size='md' (prop)" />
			<Button size="lg" variant="icon text icon" icon="home" iconEnd="home" label="size='lg' (prop)" />
			<Button size="xl" variant="icon text icon" icon="home" iconEnd="home" label="size='xl' (prop)" />
			<Button size="xxl" variant="icon text icon" icon="home" iconEnd="home" label="size='xxl' (prop)" /> 
		</Item>
	</Grid>
</div>
