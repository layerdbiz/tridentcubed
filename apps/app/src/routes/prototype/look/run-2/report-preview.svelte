<script lang="ts">
	// PROTOTYPE (#161): the live preview, built from the panels as they stand: cover, table of contents with
	// page numbers, then the report pages in panel order. Zoom with − / + , Ctrl or Cmd + wheel, or pinch.
	// Not the real renderer: page breaks are rough, and Download only says what V1 will do.
	import type { Attachment } from 'svelte/attachments';
	import { personOf, type PanelType } from './look.data';
	import type { LookState } from './look.state.svelte';

	let { look, highlight = '' }: { look: LookState; highlight?: string } = $props();

	type PageType = {
		key: string;
		title: string;
		kind: string;
		panel?: PanelType;
		group?: number;
		part?: number;
	};

	const W = 595;
	const H = 842;

	let width = $state(0);
	let manual = $state<number | undefined>(undefined);
	let scroller: HTMLDivElement | undefined = $state();
	const fit = $derived(width ? Math.min(1, (width - 48) / W) : 0.6);
	const zoom = $derived(manual ?? fit);

	function fieldOf(panelId: string, label: string) {
		return look.panels
			.find((panel) => panel.id === panelId)
			?.fields.find((field) => field.label === label)?.value;
	}

	const team = $derived(look.panels.find((panel) => panel.id === 'team'));
	const timelog = $derived(look.panels.find((panel) => panel.id === 'timelog'));

	const pages = $derived.by(() => {
		const list: PageType[] = [
			{ key: 'cover', title: 'Cover', kind: 'cover' },
			{ key: 'contents', title: 'Table of Contents', kind: 'contents' },
			{ key: 'report', title: 'Project Report', kind: 'report' },
			{ key: 'personnel', title: 'Personnel in Attendance', kind: 'personnel' }
		];
		for (const panel of look.panels) {
			if (!panel.isEnabled) continue;
			if (panel.kind === 'timelog' && panel.days.length)
				list.push({ key: 'timelog', title: 'Time Log', kind: 'timelog', panel });
			if (panel.kind === 'photos')
				panel.groups.forEach((group, groupIndex) => {
					const parts = Math.max(1, Math.ceil(group.photos.length / group.layout));
					for (let part = 0; part < parts; part += 1)
						list.push({
							key: `photos-${panel.id}`,
							title: part ? `${panel.name} (continued)` : panel.name,
							kind: 'photos',
							panel,
							group: groupIndex,
							part
						});
				});
		}
		list.push({ key: 'disclaimer', title: 'Disclaimer', kind: 'disclaimer' });
		return list;
	});

	const contents = $derived(
		pages.filter((item, index) => pages.findIndex((other) => other.key === item.key) === index)
	);

	const KEY_OF: Record<string, string> = {
		organization: 'report',
		client: 'report',
		project: 'cover',
		items: 'report',
		facility: 'report',
		carrier: 'report',
		team: 'personnel',
		timelog: 'timelog'
	};
	const target = $derived(KEY_OF[highlight] ?? `photos-${highlight}`);

	// Follow the open panel: bring the page it feeds into view, once the pages have their size.
	const isReady = $derived(width > 0);
	let hasScrolled = false;
	$effect(() => {
		const key = target;
		if (!isReady || !scroller) return;
		const behavior = hasScrolled ? 'smooth' : 'instant';
		hasScrolled = true;
		requestAnimationFrame(() => {
			const element = scroller?.querySelector<HTMLElement>(`[data-page="${key}"]`);
			if (element) scroller?.scrollTo({ top: element.offsetTop - 24, behavior });
		});
	});

	function setZoom(next: number) {
		manual = Math.round(Math.min(2, Math.max(0.25, next)) * 100) / 100;
	}

	// Ctrl or Cmd + wheel, and two-finger pinch, zoom the pages instead of the browser.
	const gestures: Attachment<HTMLElement> = (element) => {
		const touches = new Map<number, { x: number; y: number }>();
		let start = 0;
		let startZoom = 1;
		function distance() {
			const [a, b] = [...touches.values()];
			return Math.hypot(a.x - b.x, a.y - b.y);
		}
		function wheel(event: WheelEvent) {
			if (!event.ctrlKey && !event.metaKey) return;
			event.preventDefault();
			setZoom(zoom * (event.deltaY < 0 ? 1.08 : 0.92));
		}
		function down(event: PointerEvent) {
			if (event.pointerType !== 'touch') return;
			touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
			if (touches.size === 2) {
				start = distance();
				startZoom = zoom;
			}
		}
		function move(event: PointerEvent) {
			if (!touches.has(event.pointerId)) return;
			touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
			if (touches.size === 2 && start) setZoom(startZoom * (distance() / start));
		}
		function up(event: PointerEvent) {
			touches.delete(event.pointerId);
			if (touches.size < 2) start = 0;
		}
		element.addEventListener('wheel', wheel, { passive: false });
		element.addEventListener('pointerdown', down);
		element.addEventListener('pointermove', move);
		element.addEventListener('pointerup', up);
		element.addEventListener('pointercancel', up);
		return () => {
			element.removeEventListener('wheel', wheel);
			element.removeEventListener('pointerdown', down);
			element.removeEventListener('pointermove', move);
			element.removeEventListener('pointerup', up);
			element.removeEventListener('pointercancel', up);
		};
	};
</script>

<div class="relative flex h-full flex-col bg-slate-100">
	<div
		bind:this={scroller}
		bind:clientWidth={width}
		class="relative flex-1 touch-pan-x touch-pan-y overflow-auto px-6 pt-6 pb-28"
		{@attach gestures}
	>
		<div
			class="mx-auto flex flex-col items-center gap-6"
			style="width: {W * zoom}px"
		>
			{#each pages as item, index (index)}
				<article
					class="relative shrink-0 overflow-hidden bg-white shadow-md ring-2 transition duration-300 {item.key ===
					target
						? 'ring-primary'
						: 'ring-transparent'}"
					style="width: {W * zoom}px; height: {H * zoom}px"
					data-page={item.key}
				>
					<div
						class="absolute inset-0 origin-top-left text-slate-800"
						style="transform: scale({zoom}); width: {W}px; height: {H}px"
					>
						{#if item.kind === 'cover'}
							<div class="flex h-full flex-col items-center px-12 pt-28 text-center">
								<img
									src="/logo-color.svg"
									alt=""
									class="size-24"
								/>
								<p
									class="mt-8 text-[34px] leading-tight font-bold tracking-tight text-slate-950 uppercase"
								>
									{fieldOf('project', 'Title') || 'Untitled project'}
								</p>
								<p class="mt-3 text-lg text-slate-500">{fieldOf('project', 'Subtitle')}</p>
								<div class="absolute inset-x-0 bottom-0 h-56 bg-slate-200/80">
									<svg
										class="absolute -top-[59px] h-[60px] w-full fill-slate-200/80"
										viewBox="0 0 1200 120"
										preserveAspectRatio="none"
										><path
											d="M0,92.7V120h1200V24.2c-67.8-23.1-144.3-15.5-214.3,3C906.7,48,823.8,89,743.8,105.8 c-82.3,17.3-168.1,16.3-250.5-0.4c-57.8-11.7-114-31.1-172-41.9C213.6,43.7,102.5,53.8,0,92.7z"
										/></svg
									>
									<dl
										class="mx-auto mt-14 grid w-72 grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-left text-[11px]"
									>
										<dt class="font-semibold">Facility:</dt>
										<dd>{fieldOf('facility', 'Name') || '—'}</dd>
										<dt class="font-semibold">Dates:</dt>
										<dd>{look.project.dates}</dd>
										<dt class="font-semibold">Client:</dt>
										<dd>{fieldOf('client', 'Company') || '—'}</dd>
										<dt class="font-semibold">Owner:</dt>
										<dd>{team?.owner || '—'}</dd>
										<dt class="font-semibold">Project type:</dt>
										<dd>{fieldOf('project', 'Type') || '—'}</dd>
									</dl>
								</div>
							</div>
						{:else}
							<header
								class="flex items-center justify-between px-12 pt-8 text-[9px] text-slate-400"
							>
								<span class="flex items-center gap-1.5"
									><img
										src="/logo-color.svg"
										alt=""
										class="size-4"
									/>Trident Cubed</span
								>
								<span>{look.project.number}-R01</span>
							</header>
							<div class="px-12 pt-8">
								<h2 class="text-[26px] font-bold tracking-tight text-slate-950">{item.title}</h2>
								{#if item.kind === 'contents'}
									<ol class="mt-6 text-[12px]">
										{#each contents as entry (entry.key)}
											<li class="flex justify-between border-b border-dashed border-slate-200 py-2">
												<span>{entry.title}</span><span class="text-slate-400"
													>{pages.findIndex((other) => other.key === entry.key) + 1}</span
												>
											</li>
										{/each}
									</ol>
								{:else if item.kind === 'report'}
									<div class="mt-6 grid gap-2 text-[11px]">
										{#each [['Organization', 'Trident Cubed'], ['Project', fieldOf('project', 'Title')], ['Client', fieldOf('client', 'Company')], ['Facility', fieldOf('facility', 'Name')], ['Carrier', [fieldOf('carrier', 'Type'), fieldOf('carrier', 'Name')]
													.filter(Boolean)
													.join(' · ')], ['Items', fieldOf('items', 'Title')]] as [label, value] (label)}
											<div class="rounded-lg border border-slate-200 px-3 py-2">
												<p
													class="text-[8px] font-semibold tracking-[0.14em] text-slate-400 uppercase"
												>
													{label}
												</p>
												<p class="mt-0.5 {value ? 'text-slate-900' : 'text-slate-300 italic'}">
													{value || 'Not filled in yet'}
												</p>
											</div>
										{/each}
										{#if fieldOf('items', 'Description')}
											<p class="mt-2 leading-relaxed text-slate-600">
												{fieldOf('items', 'Description')}
											</p>
										{/if}
									</div>
								{:else if item.kind === 'personnel'}
									<div class="mt-6 grid grid-cols-2 gap-3">
										{#each [team?.owner, ...(team?.assigned ?? [])].filter(Boolean) as name, personIndex (name)}
											{@const person = personOf(name!)}
											<div
												class="flex items-center gap-3 rounded-xl border px-3 py-3 {personIndex ===
												0
													? 'border-slate-300 bg-slate-50'
													: 'border-slate-200'}"
											>
												<img
													src={person.photo}
													alt=""
													class="size-10 rounded-full object-cover"
												/>
												<div>
													<p
														class="text-[8px] font-semibold tracking-[0.14em] text-slate-400 uppercase"
													>
														{personIndex === 0 ? 'Project owner' : 'Assigned team member'}
													</p>
													<p class="text-[14px] font-semibold text-slate-900">{person.name}</p>
												</div>
											</div>
										{:else}
											<p class="text-[11px] text-slate-300 italic">No one assigned yet</p>
										{/each}
									</div>
								{:else if item.kind === 'timelog'}
									{#each timelog?.days ?? [] as day, dayIndex (day.id)}
										<p class="mt-6 text-[12px] font-semibold text-slate-900">
											Day {dayIndex + 1} · {day.date || 'No date'}
										</p>
										<table class="mt-2 w-full text-[11px]">
											<tbody>
												{#each [...day.entries].sort( (a, b) => (a.time || '99').localeCompare(b.time || '99') ) as entry (entry.id)}
													<tr class="border-b border-slate-100">
														<td class="w-16 py-1.5 font-semibold tabular-nums"
															>{entry.time || '--:--'}</td
														>
														<td class="py-1.5 {entry.activity ? '' : 'text-slate-300 italic'}"
															>{entry.activity || 'No activity yet'}</td
														>
													</tr>
												{/each}
											</tbody>
										</table>
									{/each}
								{:else if item.kind === 'photos' && item.panel}
									{@const group = item.panel.groups[item.group ?? 0]}
									{@const shown = group.photos.slice(
										(item.part ?? 0) * group.layout,
										((item.part ?? 0) + 1) * group.layout
									)}
									<p class="mt-2 text-[13px] font-semibold text-slate-700">
										{group.title || 'Untitled group'}
									</p>
									{#if group.description && !item.part}
										<p class="mt-1 text-[11px] text-slate-500">{group.description}</p>
									{/if}
									<div
										class="mt-4 grid gap-3 {group.layout === 2
											? 'grid-cols-1'
											: group.layout === 4
												? 'grid-cols-2'
												: 'grid-cols-3'}"
									>
										{#each shown as photo (photo.id)}
											<figure>
												<img
													src={photo.src}
													alt=""
													class="w-full rounded object-cover {group.layout === 2
														? 'aspect-[16/9]'
														: 'aspect-[4/3]'}"
												/>
												<figcaption class="mt-1 truncate text-[8px] text-slate-500">
													{photo.caption}
												</figcaption>
											</figure>
										{:else}
											<p class="text-[11px] text-slate-300 italic">No photos yet</p>
										{/each}
									</div>
								{:else if item.kind === 'disclaimer'}
									<p class="mt-6 text-[11px] leading-relaxed text-slate-500">
										This report is issued without prejudice and reflects the conditions observed by
										the surveyor at the time and place of attendance. Sample text for the prototype.
									</p>
								{/if}
							</div>
							<footer
								class="absolute inset-x-12 bottom-6 flex justify-between text-[9px] text-slate-400"
							>
								<span>{fieldOf('project', 'Title')}</span><span
									>Page {index + 1} of {pages.length}</span
								>
							</footer>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	</div>

	<!-- Floating controls, as in the app prototype: Download, then − 100% + -->
	<div
		class="absolute right-4 bottom-4 flex items-center gap-1 rounded-full bg-slate-900 p-1.5 shadow-xl shadow-slate-900/20"
	>
		<button
			type="button"
			class="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
			onclick={() => look.say('Download makes the PDF in V1. Not wired up in this prototype.')}
		>
			<span class="icon-[mdi--tray-arrow-down] size-5"></span>Download
		</button>
		<div class="flex items-center rounded-full bg-white">
			<button
				type="button"
				class="flex size-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
				aria-label="Zoom out"
				onclick={() => setZoom(zoom - 0.1)}><span class="icon-[mdi--minus] size-5"></span></button
			>
			<button
				type="button"
				class="w-12 text-center text-sm font-semibold text-slate-800 tabular-nums"
				title="Fit to width"
				onclick={() => (manual = undefined)}>{Math.round(zoom * 100)}%</button
			>
			<button
				type="button"
				class="flex size-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
				aria-label="Zoom in"
				onclick={() => setZoom(zoom + 0.1)}><span class="icon-[mdi--plus] size-5"></span></button
			>
		</div>
	</div>
	<p
		class="pointer-events-none absolute bottom-6 left-4 hidden rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-500 backdrop-blur md:block"
	>
		{pages.length} pages · {look.project.number}-R01
	</p>
</div>
