<!-- App.svelte -->
<script>
  import {New} from '$lib';
</script>

<main class="grid gap-10 p-10">
1
  <New
		top="top!!!"
		right="right!!!"
		bottom="bottom!!!"
		left="left!!!"
		center="center!!!"
  />
2
  <New>
		{#snippet left()}
			<div class="bg-blue-300 px-2">left</div>
		{/snippet}

		{#snippet center()}
			<div class="bg-gray-300 px-2">center</div>
		{/snippet}

		{#snippet right()}
			<div class="bg-emerald-300 px-2">right</div>
		{/snippet}

		{#snippet top()}
			<div class="bg-amber-300 px-2">top</div>
		{/snippet}

		{#snippet bottom()}
			<div class="bg-pink-300 px-2">bottom</div>
		{/snippet}
	</New>
</main>