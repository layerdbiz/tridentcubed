<script lang="ts">
	import { Draggable } from '@layerd/ui';

	export const data = [
		{ name: 'Item 1' },
		{ name: 'Item 2' },
		{ name: 'Item 3' },
		{ name: 'Item 4' },
		{ name: 'Item 5' }
	];

	let items = $state(data);

	const { addDraggable, addDroppable } = new Draggable({});
</script>

<div use:addDroppable={{ items }} class="flex h-200 flex-col items-center justify-center gap-4 bg-linear-65 from-purple-300 to-pink-300 font-semibold text-gray-900/50">
	{#each items as item (item)}
		<div use:addDraggable={{ item }} class="shadow-xl w-52 px-4 py-2 rounded bg-white cursor-pointer will-change-auto">
			<h2 class="text-xl">{item.name}</h2>
		</div>
	{/each}
	{JSON.stringify(items)}
</div>
