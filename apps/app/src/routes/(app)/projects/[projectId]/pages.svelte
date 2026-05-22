<script lang="ts">
	import { Button } from '@layerd/ui';

	import * as projectConstants from '../projects.constants';
	import ReportPreviewDocument from '../preview/report-preview-document.svelte';
	import type * as projectTypes from '../projects.types';

	type WorkspacePaneType = 'edit' | 'preview';

	export interface PagesProps {
		isDesktop: boolean;
		activePane: WorkspacePaneType;
		isExporting: boolean;
		handleExport: (format: 'PDF') => Promise<void>;
		stepPreviewZoom: (direction: 'in' | 'out') => Promise<void>;
		resetPreviewZoom: () => void;
		previewZoom: number;
		previewViewport?: HTMLDivElement | null;
		previewPages?: HTMLDivElement | null;
		schema: projectTypes.ProjectSchemaType;
		reportTitle: string;
		reportSubtitle: string;
		handlePreviewWheel: (event: WheelEvent) => Promise<void>;
		handlePreviewTouchStart: (event: TouchEvent) => void;
		handlePreviewTouchMove: (event: TouchEvent) => Promise<void>;
		handlePreviewTouchEnd: () => void;
		coverMeta: projectTypes.PreviewCoverMetaItemType[];
		projectSummaryItems: projectTypes.PreviewSummaryItemType[];
		personnelEntries: projectTypes.PreviewPersonnelItemType[];
		tableOfContentsEntries: projectTypes.PreviewTocEntryType[];
		previewPageItems: projectTypes.PreviewPageItemType[];
		getSortedEntries: (day: projectTypes.TimeDayType) => projectTypes.TimeEntryType[];
		projectDataJson: string;
	}

	let {
		isDesktop,
		activePane,
		isExporting,
		handleExport,
		stepPreviewZoom,
		resetPreviewZoom,
		previewZoom,
		previewViewport = $bindable(null),
		previewPages = $bindable(null),
		schema,
		reportTitle,
		reportSubtitle,
		handlePreviewWheel,
		handlePreviewTouchStart,
		handlePreviewTouchMove,
		handlePreviewTouchEnd,
		coverMeta,
		projectSummaryItems,
		personnelEntries,
		tableOfContentsEntries,
		previewPageItems,
		getSortedEntries: _getSortedEntries,
		projectDataJson: _projectDataJson
	}: PagesProps = $props();
</script>

<section class:hidden={!isDesktop && activePane !== 'preview'} class="min-h-0 min-w-0 pt-3 md:block md:pt-0">
	<div class="relative flex h-full min-h-0 flex-col">
		<div class="pointer-events-none fixed bottom-4 right-4 z-40 origin-bottom-right scale-70 md:bottom-6 md:right-6 md:scale-100">
			<div class="pointer-events-auto flex items-center gap-2 rounded-full border border-secondary-200 bg-black px-2 py-2 shadow-lg backdrop-blur">
				<Button primary class="min-w-0 justify-center bg-primary px-3!" variant="icon text" icon="download" onclick={() => handleExport('PDF')} label={isExporting ? 'DOWNLOADING...' : 'DOWNLOAD'} disabled={isExporting} />

				<div id="zoomer" class="flex h-11 shrink-0 rounded-full border border-neutral-300 bg-white shadow-sm sm:h-12">
					<Button ghost xl variant="text" label="-" onclick={() => stepPreviewZoom('out')} class="px-4!" />
					<Button ghost lg variant="text" class="w-18! rounded-none! border-x border-secondary-200 px-0! font-black!" onclick={resetPreviewZoom}>
						{Math.round((previewZoom || 1) * 100)}%
					</Button>
					<Button ghost xl variant="text" label="+" onclick={() => stepPreviewZoom('in')} class="px-4!" />
				</div>
			</div>
		</div>

		<div class="min-h-0 flex-1">
			<div bind:this={previewViewport} role="region" aria-label="Preview pages" class="py-4 h-full w-full overflow-x-hidden overflow-y-auto bg-transparent" style={`touch-action: ${isDesktop ? 'pan-y pinch-zoom' : 'pan-y'}`} onwheel={handlePreviewWheel} ontouchstart={handlePreviewTouchStart} ontouchmove={handlePreviewTouchMove} ontouchend={handlePreviewTouchEnd}>
				<div class="relative w-full px-1 pb-30 pt-0 md:px-0 md:pb-32 md:pt-2">
					<div class="w-full" style={`--preview-zoom: ${previewZoom || 1}; --preview-page-width: ${projectConstants.previewPageWidth}px; --preview-page-height: ${projectConstants.previewPageHeight}px`}>
						<div bind:this={previewPages} class="flex flex-col items-center gap-4 md:gap-12">
							<ReportPreviewDocument
								schema={schema}
								reportTitle={reportTitle}
								reportSubtitle={reportSubtitle}
								coverMeta={coverMeta}
								projectSummaryItems={projectSummaryItems}
								personnelEntries={personnelEntries}
								tableOfContentsEntries={tableOfContentsEntries}
								previewPageItems={previewPageItems}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>