<script lang="ts">
	import { Logo, Button, Content, Text, Divider } from '@layerd/ui';
	import * as projectConstants from '../projects.constants';
	import * as projectUtils from '../projects.utils';
	import PreviewPage from '../preview/preview-page.svelte';
	import type * as projectTypes from '../projects.types';

	type WorkspacePaneType = 'edit' | 'preview';

	type TocEntryType = {
		id: string;
		title: string;
		page: number;
	};

	type CoverMetaItemType = {
		label: string;
		value: string;
	};

	type PreviewContentSectionType =
		| projectTypes.TimeLogSectionType
		| projectTypes.PhotosSectionType;

	export interface PreviewProps {
		isDesktop: boolean;
		activePane: WorkspacePaneType;
		isExporting: boolean;
		handleExport: (format: 'PDF') => Promise<void>;
		stepPreviewZoom: (direction: 'in' | 'out') => Promise<void>;
		resetPreviewZoom: () => void;
		previewZoom: number;
		previewViewport?: HTMLDivElement | null;
		previewPages?: HTMLDivElement | null;
		handlePreviewWheel: (event: WheelEvent) => Promise<void>;
		handlePreviewTouchStart: (event: TouchEvent) => void;
		handlePreviewTouchMove: (event: TouchEvent) => Promise<void>;
		handlePreviewTouchEnd: () => void;
		reportSection?: projectTypes.CoverSectionType;
		coverMeta: CoverMetaItemType[];
		tableOfContentsEntries: TocEntryType[];
		previewContentSections: PreviewContentSectionType[];
		getSortedEntries: (day: projectTypes.TimeDayType) => projectTypes.TimeEntryType[];
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
		handlePreviewWheel,
		handlePreviewTouchStart,
		handlePreviewTouchMove,
		handlePreviewTouchEnd,
		reportSection,
		coverMeta,
		tableOfContentsEntries,
		previewContentSections,
		getSortedEntries
	}: PreviewProps = $props();
</script>

<section class:hidden={!isDesktop && activePane !== 'preview'} class="min-h-0 min-w-0 md:block md:pt-6">
	<div class="relative flex h-full min-h-0 flex-col">
		<div id="previewControls" class="fixed bottom-8 right-8 z-20 flex justify-end gap-2">
			<Button primary class="bg-primary" variant="icon text" icon="download" onclick={() => handleExport('PDF')} label={isExporting ? 'DOWNLOADING...' : 'DOWNLOAD'} disabled={isExporting} />
			<div id="zoomer" class="flex h-12 rounded-full border border-neutral-300 bg-white shadow-sm">
				<Button ghost xl variant="text" label="-" onclick={() => stepPreviewZoom('out')} class="px-4!" />
				<Button ghost lg variant="text" class="w-18! rounded-none! border-x border-secondary-200 px-0! font-black!" onclick={resetPreviewZoom}>
					{Math.round((previewZoom || 1) * 100)}%
				</Button>
				<Button ghost xl variant="text" label="+" onclick={() => stepPreviewZoom('in')} class="px-4!" />
			</div>
		</div>

		<div class="min-h-0 flex-1">
			<div bind:this={previewViewport} role="region" aria-label="Preview pages" class="h-full w-full overflow-x-hidden overflow-y-auto bg-transparent" style={`touch-action: ${isDesktop ? 'pan-y pinch-zoom' : 'pan-y'}`} onwheel={handlePreviewWheel} ontouchstart={handlePreviewTouchStart} ontouchmove={handlePreviewTouchMove} ontouchend={handlePreviewTouchEnd}>
				<div class="relative w-full px-1 pb-10 pt-0 md:px-0 md:pb-16 md:pt-2">
					<div class="w-full" style={`--preview-zoom: ${previewZoom || 1}; --preview-page-width: ${projectConstants.previewPageWidth}px; --preview-page-height: ${projectConstants.previewPageHeight}px`}>
						<div bind:this={previewPages} class="flex flex-col items-center gap-4 md:gap-12">
							<PreviewPage innerClass="relative flex flex-col items-center justify-center gap-6">
								<div id="topCoverPage" class="mb-50 flex flex-col items-center justify-center gap-6">
									<Logo mode="light" class="size-42" />
									<Text h1={reportSection?.fields.reportTitle || 'Survey Report'} class="text-6xl font-black uppercase" />
									<Text h2={reportSection?.fields.reportTitle || 'Survey Report'} class="text-center text-3xl font-semibold text-pretty text-secondary-500" />
								</div>
								<div id="bottomCoverPage" class="absolute bottom-0 left-0 right-0 z-1! grid w-full justify-center bg-secondary-200 pb-20">
									<Divider class="absolute bottom-full" color="text-secondary-200" bleed={false} />
									{#each coverMeta as item (item.label)}
										<div class="grid grid-cols-[100px_100px] gap-3">
											<span class="font-semibold text-neutral-600">{item.label}:</span>
											<span class="text-neutral-800">{item.value}</span>
										</div>
									{/each}
								</div>
							</PreviewPage>
							<PreviewPage>
								<Text h2="Table of Contents" class="mb-4 text-4xl" />
								<div class="space-y-2 text-sm">
									{#each tableOfContentsEntries as item (item.id)}
										<div class="grid grid-cols-[1fr_auto] gap-3 border-b border-dashed border-secondary-200 pb-1">
											<span class="font-medium text-neutral-700">{item.title}</span>
											<span class="text-neutral-500">{item.page}</span>
										</div>
									{/each}
								</div>
							</PreviewPage>
							{#each previewContentSections as section (section.id)}
								{#if section.type === 'time-log'}
									<PreviewPage>
										<Text h2={section.title} class="mb-4 text-4xl" />
										{#each section.days as day (day.id)}
											<p class="mb-2 text-sm font-semibold text-neutral-700">{projectUtils.formatDayDate(day.dateISO) || 'Day / date not entered yet'}</p>
											<ul class="mb-4 space-y-2 text-sm">
												{#each getSortedEntries(day) as entry (entry.id)}
													<li class="flex gap-3">
														<span class="w-14 shrink-0 font-bold text-neutral-800">{entry.time || '----'}</span>
														<span class="text-neutral-700">{entry.text || 'No activity entered'}</span>
													</li>
												{/each}
											</ul>
										{/each}
									</PreviewPage>
								{:else}
									<PreviewPage>
										<Text h2={section.title} class="mb-4 text-4xl" />
										{#if section.description}
											<Text p={section.description} class="text-secondary" />
										{/if}
										<div class={projectUtils.getPreviewPhotoGridClass(section)}>
											{#if section.photos.length}
												{#each section.photos as photo (photo.id)}
													<figure class={projectUtils.getPreviewPhotoCardClass(section, photo)}>
														<div class="grid place-items-center bg-neutral-50 p-3" style={`height: ${projectUtils.getPreviewPhotoFrameHeight(section, photo)}`}>
															<img alt={photo.caption || photo.name} class="h-full w-full object-contain" src={photo.src} />
														</div>
														<figcaption class="p-3 text-xs text-neutral-600">{photo.caption || photo.name || 'Photo'}</figcaption>
													</figure>
												{/each}
											{:else}
												<div class="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-500">No photos added yet.</div>
											{/if}
										</div>
									</PreviewPage>
								{/if}
							{/each}
							<PreviewPage>
								<Content class="prose prose-sm">
									<h2>Standard Disclaimer</h2>
									<p>This Cargo Survey Report is prepared based on the observations, conditions, and information available to the undersigned at the time of the inspection. The findings and conclusions herein are made to the best of our knowledge and belief, but are subject to the following limitations:</p>
									<ul class="prose prose-xs grid max-w-lg gap-1 text-balance">
										<li><b>Scope Limitation:</b> The survey was conducted without dismantling or intrusive testing unless explicitly stated otherwise. Our observations are limited to visible and accessible parts of the cargo.</li>
										<li><b>No Warranty:</b> This report does not constitute a warranty or guarantee of the cargo's condition, quality, or fitness for any particular purpose. It is not a guarantee against latent defects or conditions not apparent at the time of inspection.</li>
										<li><b>Use Limitation:</b> This report is provided solely for the use of the party to whom it is addressed. No liability is assumed by the Company or the undersigned for any use or reliance by third parties.</li>
										<li><b>Liability Limitation:</b> The liability of the Company and the undersigned, if any, arising from this report shall be limited to the fee charged for this service. We shall not be liable for any indirect, consequential, or special damages, including but not limited to loss of profit or business interruption.</li>
										<li><b>Accuracy of Information:</b> The accuracy of this report depends on the information provided by the client and others involved. We do not guarantee the accuracy of such third-party information.</li>
										<li><b>Right to Amend:</b> We reserve the right to amend or supplement this report should additional pertinent information become available.</li>
										<li><b>Legal Context:</b> This report is not intended to be used for legal proceedings without the express written consent of the Company.</li>
										<li><b>No Endorsement:</b> This survey does not endorse or approve the cargo for any specific use or handling beyond what is stated in the report.</li>
									</ul>
									<p>Please note that this report reflects the situation as observed on a date of Inspection and may not reflect subsequent changes or conditions.</p>
								</Content>
							</PreviewPage>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>