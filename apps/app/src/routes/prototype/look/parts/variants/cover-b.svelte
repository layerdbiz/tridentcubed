<script lang="ts">
	// PROTOTYPE (#161) Report Cover, variant B: run 19's cover list. Two columns, read down then across, each line
	// with its real picture (a logo or faces) or an icon, a small label and the value. Kept beside A so Justin can
	// compare them (2026-11-11); he prefers A's look for now.
	export type CoverPictureType = { label: string; value: string; images?: string[]; icon?: string };

	let { lines }: { lines: CoverPictureType[] } = $props();
</script>

<dl
	class="mx-auto mt-5 grid w-full grid-flow-col grid-cols-2 grid-rows-5 gap-x-8 gap-y-2 px-12 text-left"
>
	{#each lines as line (line.label)}
		<div class="flex min-w-0 items-center gap-2.5">
			<span class="flex w-9 shrink-0 items-center justify-start">
				{#if line.images?.length}
					{#each line.images.slice(0, 3) as image, at (at)}
						<img
							src={image}
							alt=""
							draggable="false"
							class="size-7 rounded-full bg-white object-cover ring-2 ring-slate-100"
							style="margin-left: {at ? -18 : 0}px"
						/>
					{/each}
				{:else}
					<span
						class="flex size-7 items-center justify-center rounded-full bg-white text-primary ring-2 ring-slate-100"
						><span class="{line.icon} size-4"></span></span
					>
				{/if}
			</span>
			<div class="min-w-0">
				<dt class="text-[7px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
					{line.label}
				</dt>
				<dd
					class="truncate text-[11px] leading-tight {line.value
						? 'font-medium text-slate-800'
						: 'text-slate-300 italic'}"
				>
					{line.value || 'Not filled in yet'}
				</dd>
			</div>
		</div>
	{/each}
</dl>
