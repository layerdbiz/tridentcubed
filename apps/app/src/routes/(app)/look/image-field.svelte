<script lang="ts">
	// PROTOTYPE (#161) run 15: one picture a form asks for (Justin, 2026-11-10): a customer's logo, a person's photo,
	// or the picture behind a page. It shows what is there now beside an Upload button. Remove puts back what shows
	// without one: the initial, the photo they came with, or the stock picture.
	//
	// #187: given `target` (the table, column and row the picture is for), a picked file goes to private storage
	// through the upload helper: it shows here at once with an uploading mark, the row gets the app's file address
	// (`onpick`) once the file is there, and a failed upload says so on the picture with Retry. Wiring another
	// picture is giving its field a `target`; every picture has one, so none is kept inline.
	import type { FileTargetType } from '#lib/files/files.schema.js';
	import { startUpload, type Upload } from '#lib/files/files.state.svelte.js';

	let {
		label,
		value,
		onpick,
		target,
		shape = 'wide',
		hint = '',
		canRemove = true
	}: {
		label: string;
		value: string;
		onpick: (url: string) => void;
		// What the picture is for, so it uploads to storage: `{ table: 'customer', column: 'logo', id }`.
		target: FileTargetType;
		shape?: 'logo' | 'face' | 'wide';
		hint?: string;
		// False while what shows is the picture it falls back to, which cannot be taken away.
		canRemove?: boolean;
	} = $props();

	const SHAPES = {
		logo: { frame: 'size-16 rounded-2xl bg-white', fit: 'object-contain p-1' },
		face: { frame: 'size-16 rounded-full bg-slate-100', fit: 'object-cover' },
		wide: { frame: 'h-16 w-28 rounded-2xl bg-slate-100', fit: 'object-cover' }
	};
	const look = $derived(SHAPES[shape]);

	// The picture on its way, and the address it gave the row once there: its own preview shows until the row moves
	// on to another picture, so nothing flickers while the stored copy loads.
	let upload = $state<Upload>();
	let address = $state('');
	const shown = $derived(upload && (!address || value === address) ? upload.preview : value);

	function forget() {
		if (upload?.preview.startsWith('blob:')) URL.revokeObjectURL(upload.preview);
		upload = undefined;
		address = '';
	}

	function pick(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		forget();
		upload = startUpload(file, {
			for: target,
			kind: shape === 'logo' ? 'logo' : 'photo',
			ondone: (stored) => {
				address = stored;
				onpick(stored);
			}
		});
	}

	function remove() {
		forget();
		onpick('');
	}
</script>

<div>
	<p class="mb-1 block text-xs font-medium text-slate-500">{label}</p>
	<div class="flex items-center gap-3">
		<span
			class="relative flex shrink-0 items-center justify-center overflow-hidden ring-1 ring-slate-900/10 {look.frame} {upload?.isFailed
				? 'ring-2 ring-danger'
				: ''}"
		>
			{#if shown}
				<img
					src={shown}
					alt=""
					draggable="false"
					class="size-full {look.fit} {upload?.isUploading || upload?.isFailed ? 'opacity-60' : ''}"
				/>
			{:else}
				<span class="icon-[mdi--image-outline] size-6 text-slate-300"></span>
			{/if}
			{#if upload?.isUploading}
				<span
					class="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-full bg-white shadow"
					role="status"
					aria-label="Uploading {label.toLowerCase()}"
					><span class="icon-[svg-spinners--ring-resize] size-3.5 text-primary"></span></span
				>
			{:else if upload?.isFailed}
				<span
					class="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-full bg-danger text-white shadow"
					aria-hidden="true"><span class="icon-[mdi--alert] size-3.5"></span></span
				>
			{/if}
		</span>
		<label
			class="flex cursor-pointer items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
		>
			<span class="icon-[mdi--tray-arrow-up] size-4"></span>{(value || upload) && canRemove
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
		{#if (value || upload) && canRemove}
			<button
				type="button"
				class="rounded-full px-2 py-2 text-sm font-medium text-slate-400 transition hover:text-danger"
				onclick={remove}>Remove</button
			>
		{/if}
	</div>
	{#if upload?.isFailed}
		<p
			class="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-danger"
			role="alert"
		>
			<span>Not uploaded. {upload.reason}</span>
			<button
				type="button"
				class="font-semibold underline underline-offset-2"
				onclick={() => upload?.retry()}>Retry</button
			>
		</p>
	{:else if hint}<p class="mt-1.5 text-xs text-slate-400">{hint}</p>{/if}
</div>
