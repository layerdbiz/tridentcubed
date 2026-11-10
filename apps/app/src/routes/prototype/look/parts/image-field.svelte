<script lang="ts">
	// PROTOTYPE (#161) run 15: one picture a form asks for (Justin, 2026-11-10): a customer's logo, a person's photo,
	// or the picture behind a page. It shows what is there now beside an Upload button; the picked file is shrunk
	// before it is kept (image.ts), a logo as a PNG so its clear background stays. Remove puts back what shows
	// without one: the initial, the photo they came with, or the stock picture.
	import { shrink } from './image';

	let {
		label,
		value,
		onpick,
		shape = 'wide',
		hint = '',
		canRemove = true
	}: {
		label: string;
		value: string;
		onpick: (url: string) => void;
		shape?: 'logo' | 'face' | 'wide';
		hint?: string;
		// False while what shows is the picture it falls back to, which cannot be taken away.
		canRemove?: boolean;
	} = $props();

	const SHAPES = {
		logo: { max: 320, frame: 'size-16 rounded-2xl bg-white', fit: 'object-contain p-1' },
		face: { max: 320, frame: 'size-16 rounded-full bg-slate-100', fit: 'object-cover' },
		wide: { max: 1280, frame: 'h-16 w-28 rounded-2xl bg-slate-100', fit: 'object-cover' }
	};
	const look = $derived(SHAPES[shape]);

	async function pick(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (file) onpick(await shrink(file, look.max, shape === 'logo' ? 'logo' : 'photo'));
	}
</script>

<div>
	<p class="mb-1 block text-xs font-medium text-slate-500">{label}</p>
	<div class="flex items-center gap-3">
		<span
			class="flex shrink-0 items-center justify-center overflow-hidden ring-1 ring-slate-900/10 {look.frame}"
		>
			{#if value}
				<img
					src={value}
					alt=""
					draggable="false"
					class="size-full {look.fit}"
				/>
			{:else}
				<span class="icon-[mdi--image-outline] size-6 text-slate-300"></span>
			{/if}
		</span>
		<label
			class="flex cursor-pointer items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
		>
			<span class="icon-[mdi--tray-arrow-up] size-4"></span>{value && canRemove
				? 'Replace'
				: 'Upload'}
			<input
				type="file"
				accept="image/*"
				class="sr-only"
				aria-label="Upload {label.toLowerCase()}"
				onchange={pick}
			/>
		</label>
		{#if value && canRemove}
			<button
				type="button"
				class="rounded-full px-2 py-2 text-sm font-medium text-slate-400 transition hover:text-danger"
				onclick={() => onpick('')}>Remove</button
			>
		{/if}
	</div>
	{#if hint}<p class="mt-1.5 text-xs text-slate-400">{hint}</p>{/if}
</div>
