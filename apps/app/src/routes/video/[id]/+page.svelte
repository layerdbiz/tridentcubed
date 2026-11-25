<script lang="ts">
	import Video from './video.svelte';

	let { params } = $props();
</script>

<svelte:head><title>Video · Trident Cubed</title></svelte:head>

<Video id={params.id} />
