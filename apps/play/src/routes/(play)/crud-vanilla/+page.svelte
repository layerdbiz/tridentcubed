<script lang="ts">
	import { onMount } from 'svelte';
	import { persist } from '@layerd/ui';

	let item = $state('');
	let items = $state<string[]>([]);

	onMount(() => {
		let isCancelled = false;

		void (async () => {
			const persistedItem = await persist.load('crudVanilla.input', '', {
				storage: 'indexeddb',
			});
			const persistedItems = await persist.load<string[]>('crudVanilla.items', [], {
				storage: 'indexeddb',
			});

			if (isCancelled) return;

			item = persistedItem;
			items = persistedItems;
		})();

		return () => {
			isCancelled = true;
		};
	});
</script>

<h1>CRUD Vanilla</h1>

<input
	bind:value={item}
	oninput={() => {
		void persist.save('crudVanilla.input', item, {
			storage: 'indexeddb',
		});
	}}
/>

<button
	onclick={() => {
		void (async () => {
			const nextItem = item.trim();

			if (!nextItem) return;

			items = [...items, nextItem];
			item = '';

			await persist.save('crudVanilla.items', items, {
				storage: 'indexeddb',
			});

			await persist.remove('crudVanilla.input', {
				storage: 'indexeddb',
			});
		})();
	}}
>
	Add
</button>

<button
	onclick={() => {
		void (async () => {
			items = [];
			item = '';

			await persist.clear('crudVanilla', {
				storage: 'indexeddb',
			});
		})();
	}}
>
	Clear
</button>

<ul>
	{#each items as itemLabel, index}
		<li>
			{itemLabel}

			<button
				onclick={() => {
					void (async () => {
						items = items.filter((_, itemIndex) => itemIndex !== index);

						await persist.save('crudVanilla.items', items, {
							storage: 'indexeddb',
						});
					})();
				}}
			>
				Remove
			</button>
		</li>
	{/each}
</ul>