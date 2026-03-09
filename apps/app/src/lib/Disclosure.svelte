<script lang="ts">
	import type { Snippet } from 'svelte';

	export interface DisclosureProps {
		icon?: string;
		title?: string;
		open?: boolean;
		required?: boolean;
		done?: number;
		total?: number;
		percent?: number;
		progressLabel?: string;
		draggable?: boolean;
		dragging?: boolean;
		dropTarget?: boolean;
		disabled?: boolean;
		class?: string;
		contentClass?: string;
		children?: Snippet;
		onToggle?: (open: boolean) => void;
		ondragstart?: (event: DragEvent) => void;
		ondragend?: (event: DragEvent) => void;
		ondragover?: (event: DragEvent) => void;
		ondragleave?: (event: DragEvent) => void;
		ondrop?: (event: DragEvent) => void;
	}

	let {
		icon = '',
		title = '',
		open = false,
		required = false,
		done = 0,
		total = 0,
		percent = 0,
		progressLabel = 'complete',
		draggable = false,
		dragging = false,
		dropTarget = false,
		disabled = false,
		class: className = '',
		contentClass = 'border-t border-slate-200 p-4',
		children = undefined,
		onToggle = undefined,
		ondragstart = undefined,
		ondragend = undefined,
		ondragover = undefined,
		ondragleave = undefined,
		ondrop = undefined
	}: DisclosureProps = $props();

	const uid = $props.id();
	const contentId = `${uid}-content`;

	function toggle() {
		if (disabled) return;

		const nextOpen = !open;
		open = nextOpen;
		onToggle?.(nextOpen);
	}
</script>

<article
	class:drop-target={dropTarget}
	class={`rounded-2xl border border-slate-200 bg-white ${className}`.trim()}
	data-dragging={dragging ? 'true' : 'false'}
	{draggable}
	ondragstart={ondragstart}
	ondragend={ondragend}
	ondragover={ondragover}
	ondragleave={ondragleave}
	ondrop={ondrop}
>
	<button
		type="button"
		class="block w-full cursor-pointer p-4 text-left"
		aria-controls={contentId}
		aria-expanded={open}
		{disabled}
		onclick={toggle}
	>
		<div class="flex items-start gap-3">
			{#if draggable}
				<div class="mt-1 cursor-grab text-slate-400">⋮⋮</div>
			{/if}

			{#if icon}
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg">{icon}</div>
			{/if}

			<div class="min-w-0 flex-1">
				<div class="mb-2 flex items-start justify-between gap-3">
					<div>
						<div class="flex items-center gap-2">
							<h3 class="text-sm font-bold text-slate-800">{title}</h3>
							{#if required}
								<span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700">Required</span>
							{/if}
						</div>
						<p class="text-xs text-slate-500">{done} of {total} complete</p>
					</div>

					<div class="flex items-start gap-3 text-right">
						<div>
							<p class="text-sm font-bold text-slate-700">{percent}%</p>
							<p class="text-[11px] text-slate-400">{progressLabel}</p>
						</div>
						<span class:text-slate-600={open} class="mt-0.5 text-lg text-slate-400 transition-transform duration-200" style={`transform: rotate(${open ? 90 : 0}deg);`}>
							›
						</span>
					</div>
				</div>

				<div class="h-2 overflow-hidden rounded-full bg-slate-200">
					<div class="h-full rounded-full bg-green-600 transition-all duration-300" style={`width: ${percent}%`}></div>
				</div>
			</div>
		</div>
	</button>

	{#if open}
		<div id={contentId} class={contentClass}>
			{#if children}
				{@render children()}
			{/if}
		</div>
	{/if}
</article>

<style>
	[data-dragging='true'] {
		opacity: 0.55;
	}

	.drop-target {
		outline: 2px dashed #2563eb;
		outline-offset: 4px;
	}
</style>
