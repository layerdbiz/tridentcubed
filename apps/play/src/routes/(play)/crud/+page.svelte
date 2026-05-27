<script lang="ts">
	import { Button, Component, Input, persist as persistUtility, Text } from '@layerd/ui';

	let item = $state('');
	let items = $state<string[]>([]);

	persistUtility.sync('crud.items', {
		fallback: [],
		storage: 'indexeddb',
		getValue: () => items,
		setValue: (value) => {
			items = Array.isArray(value) ? value : [];
		},
	});

	function addItem(): void {
		const nextItem = item.trim();

		if (!nextItem) return;

		items = [...items, nextItem];
		item = '';
	}

	function removeItem(index: number): void {
		items = items.filter((_, itemIndex) => itemIndex !== index);
	}

	function clearItems(): void {
		items = [];
		item = '';

		void persistUtility.clear('crud', {
			storage: 'indexeddb',
		});
	}
</script>

<Text h1="CRUD" class="mb-5"/>

<Component class="gap-4" cols="1fr 1fr 1fr" rail="gutter-lg" mode="compact">
	{#snippet left()}
		<Input
			bind:value={item}
			label="Item"
			persist={{
				key: 'crud.input',
				prop: 'value',
				storage: 'indexeddb',
			}}
		/>
	{/snippet}

	{#snippet center()}
		<Button
			class="w-20!"
			onclick={addItem}
		>
			Add
		</Button>

		<Button
			class="w-20!"
			onclick={clearItems}
		>
			Clear
		</Button>
	{/snippet}

	{#snippet row3()}
		<Component tag="ul">
			{#each items as itemLabel, index (itemLabel + '-' + index)}
				<li>
					{itemLabel}

					<Button
						onclick={() => removeItem(index)}
					>
						Remove
					</Button>
				</li>
			{/each}
		</Component>
	{/snippet}

</Component>