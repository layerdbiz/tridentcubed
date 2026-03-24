<script lang="ts">
	import { Grid, Item, InputNew, Button } from '@layerd/ui';

	let name = $state('okkk');
</script>

<div class="h-svh p-4">
	<Grid class="gap-4 h-full" items="a1:c1">

		<!-- Input Icons -->
		<Item range="a1:b1" class="p-4 bg-base-200/50">
			<Grid items="a1:b1" class="gap-4">
				<Item col="1fr" class="grid auto-rows-min gap-5">
					<InputNew xxs variant="icon text icon" icon="home" iconEnd="home" label="xxs (boolean)" />
					<InputNew xs variant="icon text icon" icon="home" iconEnd="home" label="xs (boolean)" />
					<InputNew sm variant="icon text icon" icon="home" iconEnd="home" label="sm (boolean)" />
					<InputNew md variant="icon text icon" icon="home" iconEnd="home" label="md (boolean)" />
					<InputNew lg variant="icon text icon" icon="home" iconEnd="home" label="lg (boolean)" />
					<InputNew xl variant="icon text icon" icon="home" iconEnd="home" label="xl (boolean)" />
					<InputNew xxl variant="icon text icon" icon="home" iconEnd="home" label="xxl (boolean)" />
<!-- 					
					<InputNew size="xxs" variant="icon text icon" icon="home" iconEnd="home" label="size='xxs' (prop)" />
					<InputNew size="xs" variant="icon text icon" icon="home" iconEnd="home" label="size='xs' (prop)" />
					<InputNew size="sm" variant="icon text icon" icon="home" iconEnd="home" label="size='sm' (prop)" />
					<InputNew size="md" variant="icon text icon" icon="home" iconEnd="home" label="size='md' (prop)" />
					<InputNew size="lg" variant="icon text icon" icon="home" iconEnd="home" label="size='lg' (prop)" />
					<InputNew size="xl" variant="icon text icon" icon="home" iconEnd="home" label="size='xl' (prop)" />
					<InputNew size="xxl" variant="icon text icon" icon="home" iconEnd="home" label="size='xxl' (prop)" /> -->
				</Item>
				<Item col="auto" class="grid auto-rows-min gap-5">
					<Button width="auto" xxs variant="icon text icon" icon="home" iconEnd="home" label="xxs (boolean)" />
					<Button width="auto" xs variant="icon text icon" icon="home" iconEnd="home" label="xs (boolean)" />
					<Button width="auto" sm variant="icon text icon" icon="home" iconEnd="home" label="sm (boolean)" />
					<Button width="auto" md variant="icon text icon" icon="home" iconEnd="home" label="md (boolean)" />
					<Button width="auto" lg variant="icon text icon" icon="home" iconEnd="home" label="lg (boolean)" />
					<Button width="auto" xl variant="icon text icon" icon="home" iconEnd="home" label="xl (boolean)" />
					<Button width="auto" xxl variant="icon text icon" icon="home" iconEnd="home" label="xxl (boolean)" />
<!-- 					
					<Button size="xxs" variant="icon text icon" icon="home" iconEnd="home" label="size='xxs' (prop)" />
					<Button size="xs" variant="icon text icon" icon="home" iconEnd="home" label="size='xs' (prop)" />
					<Button size="sm" variant="icon text icon" icon="home" iconEnd="home" label="size='sm' (prop)" />
					<Button size="md" variant="icon text icon" icon="home" iconEnd="home" label="size='md' (prop)" />
					<Button size="lg" variant="icon text icon" icon="home" iconEnd="home" label="size='lg' (prop)" />
					<Button size="xl" variant="icon text icon" icon="home" iconEnd="home" label="size='xl' (prop)" />
					<Button size="xxl" variant="icon text icon" icon="home" iconEnd="home" label="size='xxl' (prop)" /> -->
				</Item>
			</Grid>
		</Item>
	</Grid>
</div>
