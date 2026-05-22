<script lang="ts">
	/*
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';
	*/
	import { Logo, Button, Content, Text, Divider } from '@layerd/ui';
	import * as projectAssets from '../projects.assets';
	import * as projectConstants from '../projects.constants';
	import * as projectUtils from '../projects.utils';
	/* import JSON from './json.svelte'; */
	import PreviewPage from '../preview/preview-page.svelte';
	import type * as projectTypes from '../projects.types';

	type WorkspacePaneType = 'edit' | 'preview';
	/* type ProjectViewType = 'pages' | 'json'; */

	type TocEntryType = {
		id: string;
		title: string;
		page: number | string;
	};

	type CoverMetaItemType = {
		label: string;
		value: string;
	};

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
		coverMeta: CoverMetaItemType[];
		projectSummaryItems: projectTypes.PreviewSummaryItemType[];
		personnelEntries: projectTypes.PreviewPersonnelItemType[];
		tableOfContentsEntries: TocEntryType[];
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
		getSortedEntries,
		projectDataJson
	}: PagesProps = $props();

	/*
	function normalizeProjectView(value: string | null | undefined): ProjectViewType {
		return value?.toLowerCase() === 'json' ? 'json' : 'pages';
	}

	const activeView = $derived<ProjectViewType>(
		normalizeProjectView(page.url.searchParams.get('view'))
	);

	function setProjectView(nextView: ProjectViewType) {
		const url = new URL(page.url);
		url.searchParams.set('view', nextView);
		pushState(`${url.pathname}${url.search}`, page.state);
	}
	*/

	const activeView = 'pages';

	function getPhotoPageDescription(pageItem: projectTypes.PreviewPageItemType): string {
		if (pageItem.section?.type !== 'photos') return '';
		if (pageItem.photoGroup?.description) return pageItem.photoGroup.description;

		if (pageItem.title === 'Introduction') {
			return reportSubtitle || 'Project overview and inspection context.';
		}

		if (pageItem.title === 'Cargo Description') {
			return projectSummaryItems.find((item) => item.label === 'Items')?.value || 'No cargo description entered yet.';
		}

		return '';
	}

	function hasPhotoPageFiles(pageItem: projectTypes.PreviewPageItemType): boolean {
		return pageItem.section?.type === 'photos' && Boolean(pageItem.photoGroup?.files.length);
	}
</script>

<section class:hidden={!isDesktop && activePane !== 'preview'} class="min-h-0 min-w-0 pt-3 md:block md:pt-0">
	<div class="relative flex h-full min-h-0 flex-col">
	
		<div class="pointer-events-none fixed bottom-4 right-4 z-40 md:bottom-6 md:right-6 scale-70 md:scale-100 origin-bottom-right">
			<div class="pointer-events-auto flex items-center gap-2 border border-secondary-200 bg-black rounded-full px-2 py-2 shadow-lg backdrop-blur">
				
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
			<div bind:this={previewViewport} role="region" aria-label="Preview pages" class="h-full w-full overflow-x-hidden overflow-y-auto bg-transparent" style={`touch-action: ${isDesktop ? 'pan-y pinch-zoom' : 'pan-y'}`} onwheel={handlePreviewWheel} ontouchstart={handlePreviewTouchStart} ontouchmove={handlePreviewTouchMove} ontouchend={handlePreviewTouchEnd}>
				<div class="relative w-full px-1 pb-30 pt-0 md:px-0 md:pb-32 md:pt-2">
					<div class="w-full" style={`--preview-zoom: ${previewZoom || 1}; --preview-page-width: ${projectConstants.previewPageWidth}px; --preview-page-height: ${projectConstants.previewPageHeight}px`}>
						<div bind:this={previewPages} class="flex flex-col items-center gap-4 md:gap-12">
								{#each previewPageItems as pageItem (pageItem.id)}
									{#if pageItem.kind === 'cover'}
										<PreviewPage innerClass="relative flex flex-col items-center justify-center gap-6">
											<div id="topCoverPage" class="mb-50 flex flex-col items-center justify-center gap-6">
												<Logo mode="light" class="size-42" />
												<Text h1={reportTitle || 'Survey Report'} class="text-center text-6xl font-black uppercase" />
												<Text h2={reportSubtitle || reportTitle || 'Survey Report'} class="text-center text-3xl font-semibold text-pretty text-secondary-500" />
											</div>
											<div id="bottomCoverPage" class="absolute bottom-0 left-0 right-0 z-1! grid w-full justify-center bg-secondary-200 pb-20">
												<Divider class="absolute bottom-full" color="text-secondary-200" bleed={false} />
												{#each coverMeta as item, itemIndex (`cover-meta-${item.label}-${itemIndex}`)}
													<div class="grid grid-cols-[100px_1fr] gap-3">
														<span class="font-bold text-neutral-600">{item.label}:</span>
														<span class="text-neutral-600">{item.value}</span>
													</div>
												{/each}
											</div>
										</PreviewPage>
									{:else if pageItem.kind === 'toc'}
										<PreviewPage>
											<Text h2={schema.tocPageTitle} class="mb-4 text-4xl" />
											<div class="space-y-2 text-sm">
												{#each tableOfContentsEntries as item (item.id)}
													<div class="grid grid-cols-[1fr_auto] gap-3 border-b border-dashed border-secondary-200 pb-1">
														<span class="font-medium text-neutral-700">{item.title}</span>
														<span class="text-neutral-500">{item.page}</span>
													</div>
												{/each}
											</div>
										</PreviewPage>
									{:else if pageItem.kind === 'template'}
										<PreviewPage>
											<Text h2={pageItem.title} class="mb-6 text-4xl" />
											<div class="grid gap-3 md:grid-cols-2">
												{#each projectSummaryItems as item, itemIndex (`summary-${item.label}-${itemIndex}`)}
													<div class={`rounded-2xl border border-slate-200 p-4 ${item.emphasis ? 'bg-secondary-100' : 'bg-white'}`}>
														<p class="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">{item.label}</p>
														<p class={`text-lg ${item.emphasis ? 'font-black text-neutral-900' : 'font-medium text-neutral-700'}`}>{item.value || '—'}</p>
													</div>
												{/each}
											</div>
										</PreviewPage>
									{:else if pageItem.kind === 'team'}
										<PreviewPage>
											<Text h2={pageItem.title} class="mb-6 text-4xl" />
											{#if personnelEntries.length}
												<div class="grid gap-4 md:grid-cols-2">
													{#each personnelEntries as person, personIndex (`${person.role}-${person.name}-${personIndex}`)}
														<div class={`rounded-3xl border p-5 ${person.isPrimary ? 'border-secondary-400 bg-secondary-100' : 'border-slate-200 bg-white'}`}>
															<div class="flex items-center gap-4">
																<img alt={person.name} class={`h-14 w-14 rounded-full object-cover ${person.isPrimary ? 'border-2 border-secondary-500 ring-2 ring-white' : 'border-2 border-white shadow-sm'}`} src={person.avatarUrl} />
																<div>
																	<p class="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">{person.role}</p>
																	<p class="text-2xl font-black text-neutral-900">{person.name}</p>
																</div>
															</div>
														</div>
													{/each}
												</div>
											{:else}
												<div class="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-500">No personnel selected yet.</div>
											{/if}
										</PreviewPage>
									{:else if pageItem.kind === 'time-log' && pageItem.section?.type === 'time-log'}
										<PreviewPage>
											<Text h2={pageItem.title} class="mb-4 text-4xl" />
											{#each pageItem.section.days as day (day.id)}
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
									{:else if pageItem.kind === 'photo' && pageItem.section?.type === 'photos'}
										<PreviewPage>
											<Text h2={pageItem.title} class="mb-4 text-4xl" />
											{#if pageItem.photoGroup?.title && pageItem.photoGroup.title !== pageItem.title}
												<Text h3={pageItem.photoGroup.title} class="mb-3 text-xl text-neutral-700" />
											{/if}
											{#if getPhotoPageDescription(pageItem)}
												<Text p={getPhotoPageDescription(pageItem)} class="mb-4 text-secondary" />
											{/if}
											{#if hasPhotoPageFiles(pageItem)}
												<div class="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
													<p class="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">Documents</p>
													<ul class="space-y-2 text-sm text-neutral-700">
														{#each pageItem.photoGroup?.files ?? [] as fileName, fileIndex (`${pageItem.id}-${fileName}-${fileIndex}`)}
															<li class="rounded-xl bg-neutral-50 px-3 py-2">{fileName}</li>
														{/each}
													</ul>
												</div>
											{/if}
											<div class={projectUtils.getPreviewPhotoGridClass(pageItem.photoGroup ?? { variant: 'photos-4', photos: [] })}>
												{#if pageItem.photoGroup?.photos.length}
													{#each pageItem.photoGroup.photos as photo (photo.id)}
														<figure class={projectUtils.getPreviewPhotoCardClass(pageItem.photoGroup, photo)}>
															<div class="grid place-items-center bg-neutral-50 p-3" style={`height: ${projectUtils.getPreviewPhotoFrameHeight(pageItem.photoGroup, photo)}`}>
																<img alt={photo.caption || photo.name} class="h-full w-full object-contain" src={projectAssets.getRenderableAssetUrl(photo.src)} />
															</div>
															<figcaption class="p-3 text-xs text-neutral-600">{photo.caption || photo.name || 'Photo'}</figcaption>
														</figure>
													{/each}
												{:else if !hasPhotoPageFiles(pageItem)}
													<div class="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-500">No photos added yet.</div>
												{/if}
											</div>
										</PreviewPage>
									{:else if pageItem.kind === 'disclaimer'}
										<PreviewPage>
											<Content class="prose prose-sm">
												<h2>{schema.disclaimerPageTitle}</h2>
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
									{/if}
								{/each}
						</div>
					</div>
				</div>
			</div>
			<!-- <JSON {projectDataJson} /> -->
		</div>
	</div>
</section>