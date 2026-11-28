<script
	lang="ts"
	module
>
	/** A photo panel's tile shape: square, 16:9, 9:16, or each photo's own once cropped (`original`). */
	export type TileRatioType = '1:1' | '16:9' | '9:16' | 'original';

	/** Every tile shape, square first: the one photo panels have unless told. */
	export const TILE_RATIOS: TileRatioType[] = ['1:1', '16:9', '9:16', 'original'];
</script>

<script lang="ts">
	// A photo panel's grid (Justin, 2026-11-28: "for our photo panels component, we're going to need to create a new
	// prop that would allow the ratio of the photos to be controlled"): its photos' tiles in a sortable grid, then
	// its add tiles. `ratio` is the tiles' shape: square as every photo panel has been, 16:9, 9:16, or `original`, each
	// photo in its own shape as it is cropped, the whole picture showing, as an email signature's banners need
	// ("we need to show them as their original size inside of the photo panel for the banners, so they can see the
	// full thing of it"). The add tiles, the caller's `adds`, are handed the classes that give them the tiles'
	// shape. The caller draws each tile (photo-tile.svelte) and anything under it (`below`), and gives the grid its
	// drag (sortable.ts), which goes on the grid as an attachment.
	import { flip } from 'svelte/animate';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { croppedAspect, editOf, keptAspectOf } from './attachments';
	import type { PhotoType } from './look.data';
	import { pictureAspectOf } from './shapes';

	type CellType = { class?: string } & Record<`data-${string}`, string | undefined>;

	let {
		photos,
		sortKey,
		ratio = '1:1',
		columns = 3,
		tile,
		below = undefined,
		cell = undefined,
		adds = undefined,
		class: className = '',
		...rest
	}: {
		photos: PhotoType[];
		/** The list its tiles drag in (sortable.ts). */
		sortKey: string;
		ratio?: TileRatioType;
		columns?: number;
		/** A photo's tile, which fills its cell. */
		tile: Snippet<[PhotoType, number]>;
		/** What goes under a photo's tile, in its cell: a banner's link. */
		below?: Snippet<[PhotoType, number]>;
		/** A cell's own class and data, for the photo it holds. */
		cell?: (photo: PhotoType, index: number) => CellType;
		/** The add tiles after the photos, given the classes that shape them as the tiles are. */
		adds?: Snippet<[string]>;
	} & Omit<HTMLAttributes<HTMLDivElement>, 'children'> = $props();

	const ASPECTS: Record<Exclude<TileRatioType, 'original'>, number> = {
		'1:1': 1,
		'16:9': 16 / 9,
		'9:16': 9 / 16
	};
	// An add tile among photos in their own shapes has no shape to follow: it is a short strip.
	const ADD_SHAPES: Record<TileRatioType, string> = {
		'1:1': 'aspect-square',
		'16:9': 'aspect-video',
		'9:16': 'aspect-[9/16]',
		original: 'h-20'
	};

	// A tile's width over its height: the grid's shape, or the photo's own as it is cropped.
	function aspectOf(photo: PhotoType) {
		if (ratio !== 'original') return ASPECTS[ratio];
		const edit = editOf(photo);
		const aspect = pictureAspectOf(photo);
		return croppedAspect(edit, aspect, keptAspectOf(edit, aspect));
	}
</script>

<div
	class="grid gap-2 {ratio === 'original' ? 'items-start' : ''} {className}"
	style:grid-template-columns="repeat({columns}, minmax(0, 1fr))"
	data-ratio={ratio}
	{...rest}
>
	{#each photos as photo, index (photo.id)}
		{@const { class: cellClass = '', ...data } = cell?.(photo, index) ?? {}}
		<div
			class="relative min-w-0 rounded-xl transition {below ? 'space-y-2' : ''} {cellClass}"
			style:aspect-ratio={below ? undefined : aspectOf(photo)}
			data-sort={sortKey}
			data-index={index}
			{...data}
			animate:flip={{ duration: 200 }}
		>
			{#if below}
				<div
					class="relative rounded-xl"
					style:aspect-ratio={aspectOf(photo)}
				>
					{@render tile(photo, index)}
				</div>
				{@render below(photo, index)}
			{:else}
				{@render tile(photo, index)}
			{/if}
		</div>
	{/each}
	{@render adds?.(ADD_SHAPES[ratio])}
</div>
