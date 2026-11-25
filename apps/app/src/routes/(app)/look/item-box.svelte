<script lang="ts">
	import { toPictureType } from '#lib/files/files.schema.js';

	// The Items panel's one way in (#242; settled with Justin on a prototype, 2026-11-19): a dashed box that takes rows
	// pasted from a spreadsheet, a file or photo dropped on it, or one chosen with its button. Click or tap it and it
	// is ready for a paste; it keeps its height then, and only its colors change. The kinds of file it reads stand in
	// a row, each in its own color, all turning blue while the box is ready.
	//
	// Under the words lies a see-through text box, which is what takes the click and the paste: a browser pastes only
	// into a field, and a phone offers Paste only on one. It asks for no keyboard.
	let {
		isSlim = false,
		ontext,
		onfiles
	}: {
		// Once a list is in: one line and the button, to add a photo or put another list in its place.
		isSlim?: boolean;
		ontext: (text: string) => void;
		onfiles: (files: File[]) => void;
	} = $props();

	let isOver = $state(false);

	function paste(event: ClipboardEvent) {
		const held = event.clipboardData;
		if (!held) return;
		event.preventDefault();
		const pictures = [...held.files].filter((file) => toPictureType(file).startsWith('image/'));
		if (pictures.length) onfiles(pictures);
		else ontext(held.getData('text/plain'));
	}

	// A paste the browser put straight into the box (some phone keyboards do) is read from it, then cleared.
	function typed(event: Event) {
		const box = event.currentTarget as HTMLTextAreaElement;
		const text = box.value;
		box.value = '';
		if (/[\t\n]/.test(text)) ontext(text);
	}

	function drop(event: DragEvent) {
		event.preventDefault();
		isOver = false;
		const files = [...(event.dataTransfer?.files ?? [])];
		if (files.length) onfiles(files);
	}

	function choose(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		input.value = '';
		if (files.length) onfiles(files);
	}

	// The kinds of file the box reads: its name, its color, and what is drawn on its page.
	const KINDS = [
		{
			name: 'Excel',
			color: '#15a05a',
			mark: 'M9 18h14v13H9zM9 22.3h14M9 26.7h14M14 18v13',
			width: 1.4
		},
		{
			name: 'CSV',
			color: '#0ea5e9',
			mark: 'M9 20h3M14.5 20h3M20 20h3M9 25h3M14.5 25h3M20 25h3M9 30h3M14.5 30h3M20 30h3',
			width: 1.9
		},
		{
			name: 'TSV',
			color: '#0e7490',
			mark: 'M9 20h5M18 20h5M9 25h5M18 25h5M9 30h5M18 30h5',
			width: 1.9
		},
		{
			name: 'JSON',
			color: '#d97706',
			mark: 'M13.5 18c-2 0-2.5 1-2.5 2.5v2c0 1.2-.6 2-2 2 1.4 0 2 .8 2 2v2c0 1.5.5 2.5 2.5 2.5M18.5 18c2 0 2.5 1 2.5 2.5v2c0 1.2.6 2 2 2-1.4 0-2 .8-2 2v2c0 1.5-.5 2.5-2.5 2.5',
			width: 1.6
		},
		{ name: 'Photo', color: '#9333ea', mark: '', width: 0 }
	];
	const PAGE = 'M7 2h13l8 8v25a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3z';
</script>

<div
	class={['box', isSlim && 'slim', isOver && 'over']}
	role="group"
	aria-label="Add your items"
	ondragover={(event) => {
		event.preventDefault();
		isOver = true;
	}}
	ondragleave={() => (isOver = false)}
	ondrop={drop}
>
	<textarea
		inputmode="none"
		autocomplete="off"
		spellcheck="false"
		aria-label="Add your items here. Click, then paste rows copied from a spreadsheet."
		onpaste={paste}
		oninput={typed}></textarea>
	<div class="inside">
		{#if isSlim}
			<p class="title">Add a photo, or a new list to replace this one</p>
		{:else}
			<p class="title">Add your items here</p>
			<p class="words pointer-coarse:hidden">
				Paste rows copied from a spreadsheet, or drop a file or photo on this box.
			</p>
			<p class="words hidden pointer-coarse:block">
				Press and hold to paste rows copied from a spreadsheet, or choose a file or photo.
			</p>
			<ul>
				{#each KINDS as kind (kind.name)}
					<li style:--kind={kind.color}>
						<svg
							width="25.6"
							height="32"
							viewBox="0 0 32 40"
							aria-hidden="true"
						>
							<path
								d={PAGE}
								fill="#fff"
							/>
							<path
								d={PAGE}
								fill="currentColor"
								fill-opacity="0.1"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linejoin="round"
							/>
							<path
								d="M20 2v6a2 2 0 0 0 2 2h6"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linejoin="round"
							/>
							{#if kind.mark}
								<path
									d={kind.mark}
									fill="none"
									stroke="currentColor"
									stroke-width={kind.width}
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							{:else}
								<circle
									cx="12"
									cy="20.5"
									r="2"
									fill="currentColor"
								/>
								<path
									d="M8 31l5.5-6 3.5 3.5 2.5-2.5 4.5 5z"
									fill="currentColor"
								/>
							{/if}
						</svg>
						<span>{kind.name}</span>
					</li>
				{/each}
			</ul>
		{/if}
		<label class="choose">
			<span class="icon-[mdi--file-outline] size-4"></span>Choose File or Photo
			<input
				type="file"
				multiple
				class="sr-only"
				onchange={choose}
			/>
		</label>
	</div>
</div>

<style>
	.box {
		background: rgb(15 23 42 / 0.02);
		border: 2px dashed #c5d2e3;
		border-radius: 1rem;
		position: relative;
		transition:
			border-color 0.15s,
			background 0.15s;
	}
	/* Ready for a paste, or a file held over it: blue, and no taller. The blue is the theme's own variable, which a
	   finished or frozen panel sets to its status colour (panel-item.svelte, #328). */
	.box:has(textarea:focus),
	.box.over {
		background: color-mix(in srgb, var(--theme-color-primary) 8%, white);
		border-color: var(--theme-color-primary);
		border-style: solid;
	}
	textarea {
		border: 0;
		border-radius: 1rem;
		cursor: pointer;
		/* 16px keeps an iPhone from zooming in when the box is tapped. */
		font-size: 16px;
		height: 100%;
		inset: 0;
		opacity: 0;
		padding: 0;
		position: absolute;
		resize: none;
		width: 100%;
	}
	.inside {
		align-items: center;
		display: flex;
		flex-direction: column;
		gap: 7px;
		padding: 22px 16px;
		pointer-events: none;
		position: relative;
		text-align: center;
	}
	.title {
		color: #0f172a;
		font-size: 15px;
		font-weight: 700;
	}
	.words {
		color: #64748b;
		font-size: 12.5px;
		max-width: 44ch;
	}
	ul {
		display: flex;
		gap: 14px;
		justify-content: center;
		margin-top: 4px;
	}
	li {
		align-items: center;
		color: var(--kind);
		display: flex;
		flex-direction: column;
		font-size: 8.5px;
		font-weight: 700;
		gap: 5px;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		transition: color 0.15s;
	}
	.box:has(textarea:focus) li,
	.box.over li {
		color: var(--theme-color-primary);
	}
	.choose {
		align-items: center;
		background: #fff;
		border-radius: 999px;
		box-shadow: 0 0 0 1px #e2e8f0;
		color: #334155;
		cursor: pointer;
		display: inline-flex;
		font-size: 12.5px;
		font-weight: 500;
		gap: 6px;
		margin-top: 4px;
		padding: 7px 13px;
		pointer-events: auto;
		position: relative;
	}
	.choose:hover {
		background: #f8fafc;
	}
	.choose:focus-within {
		outline: 2px solid var(--theme-color-primary);
		outline-offset: 2px;
	}
	.slim .inside {
		flex-direction: row;
		flex-wrap: wrap;
		gap: 8px 10px;
		justify-content: center;
		padding: 12px;
	}
	.slim .title {
		color: #334155;
		font-size: 13px;
		font-weight: 600;
	}
	.slim .choose {
		margin: 0;
		padding: 6px 10px;
	}
</style>
