<script lang="ts">
	export interface JSONProps {
		projectDataJson: string;
	}

	let { projectDataJson }: JSONProps = $props();
</script>

<div class="grid h-full min-h-0 w-full grid-rows-[1fr] overflow-hidden px-1 md:px-0 md:pt-2">
	<div class="flex min-h-0 h-full flex-col rounded-4xl border border-secondary-200 bg-neutral-950 shadow-sm">
		<div class="min-h-0 flex-1 overflow-auto px-5 py-4">
			<pre class="whitespace-pre-wrap wrap-break-word text-[0.5vw] text-secondary-100">{projectDataJson}</pre>
		</div>
	</div>
</div>