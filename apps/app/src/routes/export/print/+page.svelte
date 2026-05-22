<svelte:head>
	<title>Print Export</title>
</svelte:head>

<div class="print-root">
	<div class="preview-pages"></div>
</div>

<style>
	:global(html) {
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		background: #fff;
	}

	.print-root {
		padding: 0;
		background: #fff;
	}

	.preview-pages {
		display: flex;
		flex-direction: column;
		gap: 0;
		align-items: stretch;
	}

	:global(.preview-page) {
		width: 8.5in;
		min-height: 11in;
		box-sizing: border-box;
		aspect-ratio: 8.5 / 11;
		background: #fff;
		border: 0;
		border-radius: 0;
		box-shadow: none;
		overflow: hidden;
		break-after: page;
		page-break-after: always;
	}

	:global(.preview-page:last-child) {
		break-after: auto;
		page-break-after: auto;
	}

	:global(.preview-page-inner) {
		height: 100%;
		padding: 28px;
		overflow: hidden;
	}

	:global(.preview-page-inner *) {
		max-width: 100%;
	}
</style>