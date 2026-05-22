<script lang="ts">
	import ReportPreviewDocument from '../../../(app)/projects/preview/report-preview-document.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.filename}</title>
</svelte:head>

<div class="print-root">
	<div class="preview-pages" style="--preview-zoom: 1; --preview-page-width: 8.5in; --preview-page-height: 11in;">
		<ReportPreviewDocument
			mode="print"
			schema={data.snapshot.schema}
			reportTitle={data.snapshot.reportTitle}
			reportSubtitle={data.snapshot.reportSubtitle}
			coverMeta={data.snapshot.coverMeta}
			projectSummaryItems={data.snapshot.projectSummaryItems}
			personnelEntries={data.snapshot.personnelEntries}
			tableOfContentsEntries={data.snapshot.tableOfContentsEntries}
			previewPageItems={data.snapshot.previewPageItems}
		/>
	</div>
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