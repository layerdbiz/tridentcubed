<script lang="ts">
	// PROTOTYPE (#161): stand-in report pages (A4 shape), with zoom. Not the real renderer.
	import type { LookState } from './look.state.svelte';

	let { look, highlight = '' }: { look: LookState; highlight?: string } = $props();

	let zoom = $state(0.6);
	const PAGES = ['Cover', 'Project Report', 'Time Log', 'Inspection'];
	const PAGE_OF: Record<string, string> = {
		project: 'Project Report',
		items: 'Project Report',
		client: 'Cover',
		carrier: 'Cover',
		facility: 'Project Report',
		timelog: 'Time Log',
		inspection: 'Inspection',
		damages: 'Inspection',
		discharge: 'Inspection'
	};
</script>

<div class="flex h-full flex-col">
	<div class="flex items-center justify-between gap-2 px-4 py-3">
		<p class="text-xs font-medium text-slate-500">
			{PAGES.length} pages · {look.project.number}-R01
		</p>
		<div class="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
			<button
				class="flex size-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
				aria-label="Zoom out"
				onclick={() => (zoom = Math.max(0.3, zoom - 0.1))}
				><span class="icon-[mdi--minus] size-4"></span></button
			>
			<span class="w-10 text-center text-xs text-slate-600">{Math.round(zoom * 100)}%</span>
			<button
				class="flex size-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
				aria-label="Zoom in"
				onclick={() => (zoom = Math.min(1.2, zoom + 0.1))}
				><span class="icon-[mdi--plus] size-4"></span></button
			>
		</div>
		<button
			class="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
			><span class="icon-[mdi--file-pdf-box] size-4"></span><span class="hidden sm:inline"
				>Export</span
			> PDF</button
		>
	</div>
	<div class="flex-1 overflow-auto bg-slate-100 px-4 py-6">
		<div
			class="mx-auto flex flex-col items-center gap-6"
			style="width: {595 * zoom}px"
		>
			{#each PAGES as name, index (name)}
				<article
					class="relative shrink-0 bg-white shadow-md ring-2 transition {PAGE_OF[highlight] === name
						? 'ring-primary'
						: 'ring-transparent'}"
					style="width: {595 * zoom}px; height: {842 * zoom}px"
				>
					<div
						class="absolute inset-0 origin-top-left"
						style="transform: scale({zoom}); width: 595px; height: 842px"
					>
						{#if name === 'Cover'}
							<div class="flex h-full flex-col p-12">
								<img
									src="/logo-color.svg"
									alt=""
									class="h-14 w-14"
								/>
								<p class="mt-2 text-sm font-bold tracking-wider text-slate-900">TRIDENT CUBED</p>
								<div class="mt-auto">
									<p class="text-xs tracking-widest text-primary uppercase">
										{look.project.type} survey report
									</p>
									<p class="mt-2 text-4xl font-bold text-slate-900">{look.project.title}</p>
									<p class="mt-4 text-sm text-slate-600">
										{look.project.carrier} · {look.project.facility}
									</p>
									<p class="text-sm text-slate-600">Prepared for {look.project.client}</p>
								</div>
								<div class="mt-12 h-2 w-24 rounded-full bg-primary"></div>
							</div>
						{:else}
							<div class="p-12">
								<p class="border-b-2 border-primary pb-2 text-lg font-bold text-slate-900">
									{name}
								</p>
								{#if name === 'Inspection'}
									<div class="mt-6 grid grid-cols-2 gap-4">
										{#each [1, 2, 3, 4] as photo (photo)}
											<div>
												<div
													class="aspect-[4/3] bg-gradient-to-br from-slate-200 to-slate-300"
												></div>
												<p class="mt-1 text-[10px] text-slate-500">
													Photo {photo}: hatch 2, before discharge
												</p>
											</div>
										{/each}
									</div>
								{:else}
									{#each [1, 2, 3, 4, 5, 6, 7, 8] as line (line)}
										<div class="mt-4 flex gap-4">
											<span class="h-2.5 w-20 rounded bg-slate-200"></span>
											<span class="h-2.5 flex-1 rounded bg-slate-100"></span>
										</div>
									{/each}
								{/if}
							</div>
						{/if}
						<p class="absolute right-12 bottom-6 text-[10px] text-slate-400">
							Page {index + 1} of {PAGES.length}
						</p>
					</div>
				</article>
			{/each}
		</div>
	</div>
</div>
