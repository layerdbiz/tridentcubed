import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import * as lib from "$lib";

export type ItemSnippet = Snippet;
export type RootSnippetValue =
	| Snippet<any[]>
	| string
	| number
	| boolean
	| null
	| undefined;
export type GridValue = "full" | "inline" | "rails";
export type PlacementMode = "auto" | "grid" | "compact" | "fit" | "fill";
export type RootRendererProps = HTMLAttributes<HTMLElement> & {
	class?: string;
	style?: string;
};
export type ItemFamily =
	| "cell"
	| "row"
	| "col"
	| "range"
	| "half"
	| "full"
	| "bg"
	| "fg"
	| "";
export type RootItemValue =
	| ItemSnippet
	| string
	| number
	| boolean
	| null
	| undefined;
export type RootPropSource = Record<string, RootSnippetValue>;
export type RootItemSource = Record<string, RootItemValue>;
export type RootSnippetConfig = {
	tag?: string;
	class?: string;
	rail?: string;
};
export type TrackConfig = {
	tracks: string[];
	is_pruned: boolean;
	kind: string;
};
export type UsageEnvelope = {
	rows: number[];
	cols: number[];
	row_start: number;
	col_start: number;
};
export type Placement = {
	col_start: string;
	col_end: string;
	row_start: string;
	row_end: string;
};
export type ResolvedItem = {
	base: string;
	key: string;
	label: string;
	className: string;
	place_modifier: string;
	placement_mode: PlacementMode;
	is_canonical: boolean;
	family: ItemFamily;
	snippet?: ItemSnippet;
	value?: RootItemValue;
};
export type PositionedItem = ResolvedItem & {
	placement?: Placement;
	is_rail_zone?: boolean;
	grid_column: string;
	grid_row: string;
	place_self?: string;
};

export function mergeClasses(
	...classes: Array<string | false | null | undefined>
): string {
	return classes.filter(Boolean).join(" ");
}

export function mergeStyles(
	...styles: Array<string | false | null | undefined>
): string | undefined {
	const merged = styles
		.filter((style): style is string =>
			typeof style === "string" && Boolean(style.trim())
		)
		.map((style) => style.trim().replace(/;$/, ""))
		.join("; ");

	return merged ? `${merged};` : undefined;
}

export const publicTrackCount = 3;
export const internalTrackCount = 6;

export const itemTagMap: Record<string, string> = {
	button: "span",
	a: "span",
	label: "span",
	ul: "li",
	ol: "li",
};

export const ratioAliases: Record<string, string> = {
	square: "1 / 1",
	video: "16 / 9",
	horizontal: "16 / 9",
	landscape: "16 / 9",
	portrait: "4 / 5",
	vertical: "9 / 16",
};
export const modeNames: PlacementMode[] = [
	"auto",
	"grid",
	"compact",
	"fit",
	"fill",
];
export const gridNames: GridValue[] = ["full", "inline", "rails"];
export const contentOnlyPlacements = ["between", "around", "evenly"] as const;
export const placementAliasMap = createPlacementAliasMap(
	lib.aliases.layoutProps,
);

export function toAliasKey(value: unknown): string {
	return String(value)
		.trim()
		.toLowerCase()
		.replace(/[-_]/g, " ")
		.replace(/\s+/g, " ");
}

export function normalizePlacement(value: unknown, type = "items"): string {
	const raw = toAliasKey(value);
	if (!raw) return "";
	if (type === "items" && contentOnlyPlacements.includes(raw as never)) {
		return "";
	}
	if (raw === "center" && type === "items") return "center center";
	return placementAliasMap[raw] ?? raw;
}

export function normalizeRatio(value: unknown): string {
	const raw = String(value).trim();
	if (!raw) return "auto";
	const alias = ratioAliases[toAliasKey(raw)];
	if (alias) return alias;
	const match = raw.match(/^(\d*\.?\d+)\s*[:/]\s*(\d*\.?\d+)$/);
	if (!match) return "auto";
	const width = Number(match[1]);
	const height = Number(match[2]);
	if (
		!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 ||
		height <= 0
	) return "auto";
	return `${width} / ${height}`;
}

export function normalizeMode(value: unknown): PlacementMode {
	const raw = String(value).trim().toLowerCase() as PlacementMode;
	return modeNames.includes(raw) ? raw : "auto";
}

export function normalizeGrid(value: unknown): GridValue {
	const raw = String(value).trim().toLowerCase() as GridValue;
	return gridNames.includes(raw) ? raw : "full";
}

export function createNumberRange(start: number, end: number): number[] {
	const range: number[] = [];
	for (let value = start; value <= end; value += 1) {
		range.push(value);
	}
	return range;
}

export function isRootSnippetValue(value: unknown): value is RootSnippetValue {
	return value === null || value === undefined ||
		typeof value === "function" || typeof value === "string" ||
		typeof value === "number" || typeof value === "boolean";
}

export function shouldUseRootRuntime(
	options: {
		debug?: boolean;
		grid?: unknown;
		rail?: unknown;
		rails?: unknown;
		ratio?: unknown;
		mode?: unknown;
		items?: unknown;
		content?: unknown;
		rows?: unknown;
		cols?: unknown;
		size?: unknown;
		gap?: unknown;
		itemSources?: RootItemSource;
	},
): boolean {
	const {
		debug = false,
		grid,
		rail,
		rails,
		ratio,
		mode,
		items,
		content,
		rows,
		cols,
		size,
		gap,
		itemSources = {},
	} = options;

	if (debug) return true;
	if (Object.keys(itemSources).length > 0) return true;
	if (String(grid ?? "").trim()) return true;
	if (lib.normalizeRail(rail) || lib.normalizeRail(rails)) {
		return true;
	}
	if (normalizeRatio(ratio) !== "auto") return true;
	if (normalizeMode(mode) !== "auto") return true;
	if (
		normalizePlacement(items, "items") || normalizePlacement(content, "content")
	) return true;

	for (const value of [rows, cols, size, gap]) {
		if (String(value ?? "").trim()) return true;
	}

	return false;
}

export function parseCell(cell: string) {
	const columnMap: Record<string, number> = { a: 1, b: 2, c: 3 };
	return {
		column: columnMap[cell[0]],
		row: Number(cell[1]),
	};
}

export function parseRange(range: string) {
	return {
		start: parseCell(range.slice(0, 2)),
		end: parseCell(range.slice(2, 4)),
	};
}

export function toTrackTokens(value: unknown): string[] {
	return String(value)
		.trim()
		.split(/\s+/)
		.filter(Boolean);
}

export function getSingleSizeToken(value: unknown, fallback = "auto"): string {
	const tokens = toTrackTokens(value);
	return tokens[0] ?? fallback;
}

export function createPlacementAliasMap(
	groups: Record<string, string[]>,
): Record<string, string> {
	const map: Record<string, string> = {};
	for (const names of Object.values(groups)) {
		const [cssValue] = names;
		for (const name of names) {
			const key = toAliasKey(name);
			if (key) map[key] = cssValue;
		}
	}
	return map;
}

export function getItemTag(tagName: string): string {
	return itemTagMap[tagName] ?? "div";
}

export function getPlacementMode(
	isCanonical: boolean,
	family = "",
	mode: unknown = "auto",
	ratio: unknown = "",
	grid: unknown = "full",
): PlacementMode {
	const activeMode = normalizeMode(mode);
	const activeGrid = normalizeGrid(grid);
	const hasRatio = normalizeRatio(ratio) !== "auto";
	if (activeMode !== "auto") return activeMode;
	if (activeGrid === "rails" && family === "row") return "fit";
	if (family === "half" && hasRatio) return "fill";
	if (family === "half") return "compact";
	if (lib.isLayerFamily(family) && hasRatio) return "fill";
	if (lib.isLayerFamily(family)) return "grid";
	if (hasRatio && (family === "row" || family === "col")) return "fit";
	if (!isCanonical && hasRatio) return "fit";
	return isCanonical ? "grid" : "compact";
}

export function getImplicitPlaceModifier(
	base: string,
	isCanonical: boolean,
): string {
	if (isCanonical) return "";

	const cellPlaceModifiers: Record<string, string> = {
		a1: "TL",
		b1: "TC",
		c1: "TR",
		a2: "LC",
		b2: "CC",
		c2: "RC",
		a3: "BL",
		b3: "BC",
		c3: "BR",
	};

	return cellPlaceModifiers[base] ?? "";
}

export function resolveSnippet(
	base: string,
	itemSources: RootItemSource,
	mode: unknown,
	ratio: unknown,
	grid: unknown = "full",
): ResolvedItem | null {
	const candidates = lib.getSnippetCandidates(base);
	const family = lib.getFamily(base);
	for (const candidate of candidates) {
		const snippet = itemSources[candidate.key];
		const key = candidate.place_modifier
			? base + candidate.place_modifier
			: base;
		const placeModifier = candidate.place_modifier ||
			getImplicitPlaceModifier(base, candidate.is_canonical);
		const placementMode = getPlacementMode(
			candidate.is_canonical,
			family,
			mode,
			ratio,
			grid,
		);

		if (lib.hasSnippet(snippet)) {
			return {
				base,
				key,
				label: candidate.key,
				snippet,
				className: lib.toClassName(
					placeModifier,
					family,
					placementMode,
				),
				place_modifier: placeModifier,
				placement_mode: placementMode,
				is_canonical: candidate.is_canonical,
				family,
			};
		}

		if (lib.hasRenderableValue(snippet)) {
			return {
				base,
				key,
				label: candidate.key,
				value: snippet,
				className: lib.toClassName(
					placeModifier,
					family,
					placementMode,
				),
				place_modifier: placeModifier,
				placement_mode: placementMode,
				is_canonical: candidate.is_canonical,
				family,
			};
		}
	}
	return null;
}

export function resolveItems(
	itemSources: RootItemSource,
	mode: unknown,
	ratio: unknown,
	grid: unknown = "full",
): ResolvedItem[] {
	const resolved: ResolvedItem[] = [];
	for (
		const group of [
			lib.cellNames,
			lib.rowNames,
			lib.colNames,
			lib.rangeNames,
			lib.halfNames,
			lib.specialNames,
		]
	) {
		for (const name of group) {
			const item = resolveSnippet(name, itemSources, mode, ratio, grid);
			if (item) resolved.push(item);
		}
	}
	return resolved;
}

export function getInternalTrackIndexes(): number[] {
	return createNumberRange(1, internalTrackCount);
}

export function getPublicTrackIndex(internalIndex: number): number {
	return Math.ceil(internalIndex / 2);
}

export function getCellTracks(cell: { column: number; row: number }) {
	const colStart = (cell.column - 1) * 2 + 1;
	const colEnd = cell.column * 2;
	const rowStart = (cell.row - 1) * 2 + 1;
	const rowEnd = cell.row * 2;
	return {
		rows: createNumberRange(rowStart, rowEnd),
		cols: createNumberRange(colStart, colEnd),
		row_start: rowStart,
		row_end: rowEnd,
		col_start: colStart,
		col_end: colEnd,
	};
}

export function getRangeTracks(
	range: {
		start: { column: number; row: number };
		end: { column: number; row: number };
	},
) {
	const start = getCellTracks(range.start);
	const end = getCellTracks(range.end);
	return {
		rows: createNumberRange(start.row_start, end.row_end),
		cols: createNumberRange(start.col_start, end.col_end),
		row_start: start.row_start,
		row_end: end.row_end,
		col_start: start.col_start,
		col_end: end.col_end,
	};
}

export function getRowTracks(row: number) {
	const rowStart = (row - 1) * 2 + 1;
	const rowEnd = row * 2;
	return {
		rows: createNumberRange(rowStart, rowEnd),
		cols: getInternalTrackIndexes(),
		row_start: rowStart,
		row_end: rowEnd,
		col_start: 1,
		col_end: internalTrackCount,
	};
}

export function getColTracks(column: number) {
	const colStart = (column - 1) * 2 + 1;
	const colEnd = column * 2;
	return {
		rows: getInternalTrackIndexes(),
		cols: createNumberRange(colStart, colEnd),
		row_start: 1,
		row_end: internalTrackCount,
		col_start: colStart,
		col_end: colEnd,
	};
}

export function getHalfTracks(base: string) {
	if (base === "topHalf") {
		return {
			rows: createNumberRange(1, 3),
			cols: getInternalTrackIndexes(),
			row_start: 1,
			row_end: 3,
			col_start: 1,
			col_end: internalTrackCount,
		};
	}
	if (base === "bottomHalf") {
		return {
			rows: createNumberRange(4, 6),
			cols: getInternalTrackIndexes(),
			row_start: 4,
			row_end: 6,
			col_start: 1,
			col_end: internalTrackCount,
		};
	}
	if (base === "leftHalf") {
		return {
			rows: getInternalTrackIndexes(),
			cols: createNumberRange(1, 3),
			row_start: 1,
			row_end: internalTrackCount,
			col_start: 1,
			col_end: 3,
		};
	}
	return {
		rows: getInternalTrackIndexes(),
		cols: createNumberRange(4, 6),
		row_start: 1,
		row_end: internalTrackCount,
		col_start: 4,
		col_end: 6,
	};
}

export function createFootprint(rows: number[], cols: number[]) {
	return { rows, cols };
}

export function getFullFootprint() {
	const tracks = getInternalTrackIndexes();
	return createFootprint(tracks, tracks);
}

export function isFullTrackMode(placementMode: PlacementMode): boolean {
	return placementMode === "grid" || placementMode === "fill";
}

export function getRowFootprint(row: number, placementMode: PlacementMode) {
	if (isFullTrackMode(placementMode)) return getFullFootprint();
	const tracks = getRowTracks(row);
	return createFootprint(tracks.rows, tracks.cols);
}

export function getCompactColFootprint(column: number) {
	const tracks = getColTracks(column);
	return createFootprint([3, 4], tracks.cols);
}

export function getColFootprint(column: number, placementMode: PlacementMode) {
	if (isFullTrackMode(placementMode)) return getFullFootprint();
	return getCompactColFootprint(column);
}

export function getRangeFootprint(
	range: {
		start: { column: number; row: number };
		end: { column: number; row: number };
	},
	placementMode: PlacementMode,
) {
	if (isFullTrackMode(placementMode)) return getFullFootprint();
	const tracks = getRangeTracks(range);
	return createFootprint(tracks.rows, tracks.cols);
}

export function getCellFootprint(
	cell: { column: number; row: number },
	placementMode: PlacementMode,
) {
	if (isFullTrackMode(placementMode)) return getFullFootprint();
	const tracks = getCellTracks(cell);
	return createFootprint(tracks.rows, tracks.cols);
}

export function getHalfFootprint(base: string, placementMode: PlacementMode) {
	if (isFullTrackMode(placementMode)) return getFullFootprint();
	const tracks = getHalfTracks(base);
	return createFootprint(tracks.rows, tracks.cols);
}

export function getItemFootprint(item: ResolvedItem) {
	if (item.family === "cell") {
		return getCellFootprint(parseCell(item.base), item.placement_mode);
	}
	if (item.family === "row") {
		return getRowFootprint(
			Number(item.base.replace("row", "")),
			item.placement_mode,
		);
	}
	if (item.family === "col") {
		const colLookup: Record<string, number> = { col1: 1, col2: 2, col3: 3 };
		return getColFootprint(colLookup[item.base], item.placement_mode);
	}
	if (item.family === "range") {
		return getRangeFootprint(parseRange(item.base), item.placement_mode);
	}
	if (item.family === "half") {
		return getHalfFootprint(item.base, item.placement_mode);
	}
	if (lib.isLayerFamily(item.family)) return getFullFootprint();
	return createFootprint([], []);
}

export function getUsageEnvelope(items: ResolvedItem[]): UsageEnvelope {
	if (!items.length) return { rows: [], cols: [], row_start: 1, col_start: 1 };
	let minRow = Infinity;
	let maxRow = -Infinity;
	let minCol = Infinity;
	let maxCol = -Infinity;

	for (const item of items) {
		const footprint = getItemFootprint(item);
		for (const row of footprint.rows) {
			minRow = Math.min(minRow, row);
			maxRow = Math.max(maxRow, row);
		}
		for (const col of footprint.cols) {
			minCol = Math.min(minCol, col);
			maxCol = Math.max(maxCol, col);
		}
	}

	if (minRow === Infinity || minCol === Infinity) {
		return { rows: [], cols: [], row_start: 1, col_start: 1 };
	}

	return {
		rows: createNumberRange(minRow, maxRow),
		cols: createNumberRange(minCol, maxCol),
		row_start: minRow,
		col_start: minCol,
	};
}

export function hasGridPlacement(items: ResolvedItem[]): boolean {
	return items.some((item) => item.placement_mode === "grid");
}

export function hasCompactPlacement(items: ResolvedItem[]): boolean {
	return items.some((item) => item.placement_mode === "compact");
}

export function hasFitPlacement(items: ResolvedItem[]): boolean {
	return items.some((item) => item.placement_mode === "fit");
}

export function hasFillPlacement(items: ResolvedItem[]): boolean {
	return items.some((item) => item.placement_mode === "fill");
}

export function getAutoRootContent(
	trackCols: number[],
	debug: boolean,
): string | undefined {
	if (debug) return undefined;
	if (trackCols.length !== 2) return undefined;
	if (trackCols[0] !== 5 || trackCols[1] !== 6) return undefined;
	return "normal end";
}

export function getTrackAlignment(indexes: number[]): string {
	if (!indexes.length) return "center";
	const min = Math.min(...indexes);
	const max = Math.max(...indexes);
	if (min === 1 && max < internalTrackCount) return "start";
	if (min > 1 && max === internalTrackCount) return "end";
	if (min === 1 && max === 1) return "start";
	if (min === internalTrackCount && max === internalTrackCount) return "end";
	return "center";
}

export function hasFullTrackEnvelope(
	trackRows: number[],
	trackCols: number[],
): boolean {
	return trackRows.length === internalTrackCount &&
		trackCols.length === internalTrackCount && trackRows[0] === 1 &&
		trackRows[trackRows.length - 1] === internalTrackCount &&
		trackCols[0] === 1 &&
		trackCols[trackCols.length - 1] === internalTrackCount;
}

export function getAutoRatioRootContent(
	trackRows: number[],
	trackCols: number[],
	hasRatio: boolean,
	shouldUseCompact: boolean,
	shouldUseFill: boolean,
): string | undefined {
	if (!hasRatio) return undefined;
	if (shouldUseFill) return "start start";
	if (hasFullTrackEnvelope(trackRows, trackCols)) return "start start";
	if (shouldUseCompact) return `start ${getTrackAlignment(trackCols)}`;
	return `start ${getTrackAlignment(trackCols)}`;
}

export function createDefaultTracks(
	indexes: number[],
	defaults: string[],
): string[] {
	if (!indexes.length) return defaults;
	return indexes.map((index) => defaults[index - 1]);
}

export function getDefaultColTracks(
	indexes: number[],
	shouldUseGrid: boolean,
	shouldUseContent: boolean,
	shouldUseFit: boolean,
	shouldUseFill: boolean,
	shouldUseDebugFit: boolean,
): string[] {
	const minColUnit = "var(--grid-min-col-unit, 1ch)";
	const sideTrack = `minmax(${minColUnit}, max-content)`;
	const centerTrack = "minmax(0, 1fr)";
	const contentTracks = [
		sideTrack,
		sideTrack,
		centerTrack,
		centerTrack,
		sideTrack,
		sideTrack,
	];
	const defaultTracks = [
		"auto",
		"auto",
		centerTrack,
		centerTrack,
		"auto",
		"auto",
	];
	const defaults =
		shouldUseDebugFit || shouldUseFit || shouldUseFill || shouldUseGrid ||
			shouldUseContent
			? contentTracks
			: defaultTracks;
	return createDefaultTracks(indexes, defaults);
}

export function getDefaultRowTracks(
	indexes: number[],
	shouldUseGrid: boolean,
	shouldUseContent: boolean,
	shouldUseFit: boolean,
	shouldUseFill: boolean,
	shouldUseDebugFit: boolean,
): string[] {
	const minRowUnit = "var(--grid-min-row-unit, 0.5lh)";
	const contentTrack = `minmax(${minRowUnit}, auto)`;
	const flexibleTrack = `minmax(${minRowUnit}, 1fr)`;
	const contentTracks = [
		contentTrack,
		contentTrack,
		contentTrack,
		contentTrack,
		contentTrack,
		contentTrack,
	];
	const flexibleTracks = [
		contentTrack,
		contentTrack,
		flexibleTrack,
		flexibleTrack,
		contentTrack,
		contentTrack,
	];
	const defaultTracks = ["auto", "auto", "1fr", "1fr", "auto", "auto"];
	const defaults = shouldUseDebugFit || shouldUseFit
		? flexibleTracks
		: shouldUseFill
		? flexibleTracks
		: shouldUseGrid || shouldUseContent
		? contentTracks
		: defaultTracks;
	return createDefaultTracks(indexes, defaults);
}

export function isFullInternalEnvelope(usedIndexes: number[]): boolean {
	return usedIndexes.length === internalTrackCount && usedIndexes[0] === 1 &&
		usedIndexes[usedIndexes.length - 1] === internalTrackCount;
}

export function mapPublicTokensToInternalTracks(
	tokens: string[],
	usedIndexes: number[],
): string[] {
	const tracks: string[] = [];
	for (const internalIndex of usedIndexes) {
		const publicIndex = getPublicTrackIndex(internalIndex);
		tracks.push(tokens[publicIndex - 1]);
	}
	return tracks;
}

export function mapInternalTokensToUsedTracks(
	tokens: string[],
	usedIndexes: number[],
	fallback: string,
): string[] {
	const tracks: string[] = [];
	for (const internalIndex of usedIndexes) {
		tracks.push(tokens[internalIndex - 1] ?? fallback);
	}
	return tracks;
}

export function getResolvedTrackConfig(
	value: unknown,
	fallback: string,
	defaults: string[],
	usedIndexes: number[],
	trackMode = "tracks",
): TrackConfig {
	const trimmed = String(value).trim();
	const tokens = toTrackTokens(trimmed);
	const targetCount = usedIndexes.length || 1;
	const isFullEnvelope = isFullInternalEnvelope(usedIndexes);

	if (!tokens.length) {
		return { tracks: defaults, is_pruned: true, kind: "default" };
	}
	if (trackMode === "size") {
		const token = getSingleSizeToken(trimmed, fallback);
		return {
			tracks: Array(targetCount).fill(token),
			is_pruned: true,
			kind: "size",
		};
	}
	if (tokens.length === 1) {
		return {
			tracks: Array(targetCount).fill(tokens[0]),
			is_pruned: true,
			kind: "shorthand",
		};
	}
	if (tokens.every((token) => token === tokens[0])) {
		return {
			tracks: Array(targetCount).fill(tokens[0]),
			is_pruned: true,
			kind: "shorthand",
		};
	}
	if (tokens.length === publicTrackCount) {
		return {
			tracks: mapPublicTokensToInternalTracks(tokens, usedIndexes),
			is_pruned: !isFullEnvelope,
			kind: "explicit-public",
		};
	}
	if (tokens.length >= internalTrackCount) {
		return {
			tracks: isFullEnvelope
				? tokens.slice(0, internalTrackCount)
				: mapInternalTokensToUsedTracks(tokens, usedIndexes, fallback),
			is_pruned: !isFullEnvelope,
			kind: "explicit-internal",
		};
	}
	const tracks: string[] = [];
	for (const index of createNumberRange(0, targetCount - 1)) {
		tracks.push(tokens[index] ?? fallback);
	}
	return { tracks, is_pruned: true, kind: "shorthand" };
}

export function createTrackMap(
	indexes: number[],
	isPruned: boolean,
): Map<number, number> {
	const map = new Map<number, number>();
	if (isPruned) {
		for (const [index, value] of indexes.entries()) {
			map.set(value, index + 1);
		}
		return map;
	}
	for (const value of getInternalTrackIndexes()) {
		map.set(value, value);
	}
	return map;
}

export function toPlacementFromTracks(
	rowMap: Map<number, number>,
	colMap: Map<number, number>,
	tracks: {
		col_start: number;
		col_end: number;
		row_start: number;
		row_end: number;
	},
): Placement {
	return {
		col_start: String(colMap.get(tracks.col_start)),
		col_end: String((colMap.get(tracks.col_end) ?? 0) + 1),
		row_start: String(rowMap.get(tracks.row_start)),
		row_end: String((rowMap.get(tracks.row_end) ?? 0) + 1),
	};
}

export function getRowPlacement(
	rowMap: Map<number, number>,
	row: number,
): Placement {
	const tracks = getRowTracks(row);
	return {
		col_start: "1",
		col_end: "-1",
		row_start: String(rowMap.get(tracks.row_start)),
		row_end: String((rowMap.get(tracks.row_end) ?? 0) + 1),
	};
}

export function getColPlacement(
	colMap: Map<number, number>,
	column: number,
): Placement {
	const tracks = getColTracks(column);
	return {
		col_start: String(colMap.get(tracks.col_start)),
		col_end: String((colMap.get(tracks.col_end) ?? 0) + 1),
		row_start: "1",
		row_end: "-1",
	};
}

export function getPlacement(
	item: ResolvedItem,
	rowTrackConfig: TrackConfig,
	colTrackConfig: TrackConfig,
	usedTracks: UsageEnvelope,
): Placement {
	const rowMap = createTrackMap(usedTracks.rows, rowTrackConfig.is_pruned);
	const colMap = createTrackMap(usedTracks.cols, colTrackConfig.is_pruned);
	if (item.family === "cell") {
		return toPlacementFromTracks(
			rowMap,
			colMap,
			getCellTracks(parseCell(item.base)),
		);
	}
	if (item.family === "row") {
		return getRowPlacement(rowMap, Number(item.base.replace("row", "")));
	}
	if (item.family === "col") {
		const colLookup: Record<string, number> = { col1: 1, col2: 2, col3: 3 };
		return getColPlacement(colMap, colLookup[item.base]);
	}
	if (item.family === "range") {
		return toPlacementFromTracks(
			rowMap,
			colMap,
			getRangeTracks(parseRange(item.base)),
		);
	}
	if (item.family === "half") {
		return toPlacementFromTracks(rowMap, colMap, getHalfTracks(item.base));
	}
	if (lib.isLayerFamily(item.family)) {
		return { col_start: "1", col_end: "-1", row_start: "1", row_end: "-1" };
	}
	return {
		col_start: "auto",
		col_end: "auto",
		row_start: "auto",
		row_end: "auto",
	};
}

export function getItemPlaceSelf(item: ResolvedItem): string | undefined {
	if (item.place_modifier) return undefined;
	if (item.placement_mode !== "compact" && item.placement_mode !== "fit") {
		return undefined;
	}
	return "stretch stretch";
}

export function isRailZone(item: ResolvedItem, rootGrid: GridValue): boolean {
	return rootGrid === "rails" &&
		(item.family === "row" || lib.isLayerFamily(item.family));
}

export function addPlacement(
	items: ResolvedItem[],
	rowTrackConfig: TrackConfig,
	colTrackConfig: TrackConfig,
	activeTracks: UsageEnvelope,
	rootGrid: GridValue,
): PositionedItem[] {
	const placed: PositionedItem[] = [];
	for (const item of items) {
		const placement = getPlacement(
			item,
			rowTrackConfig,
			colTrackConfig,
			activeTracks,
		);
		const isRailZoneItem = isRailZone(item, rootGrid);
		const itemClassName = isRailZoneItem
			? `${item.className} is-rail-zone`
			: item.className;
		placed.push({
			...item,
			className: itemClassName,
			placement,
			is_rail_zone: isRailZoneItem,
			grid_column: isRailZoneItem
				? lib.railSpans["content-full"]
				: `${placement.col_start} / ${placement.col_end}`,
			grid_row: `${placement.row_start} / ${placement.row_end}`,
			place_self: getItemPlaceSelf(item),
		});
	}
	return placed;
}

export function createRootClassName(
	{ className = "", rootGrid = "full", rail = "", debug = false }: {
		className?: string;
		rootGrid?: GridValue;
		rail?: string;
		debug?: boolean;
	},
): string {
	const classes = ["root-grid"];
	const railClassName = lib.getRailClassName(rail);
	if (className.trim()) classes.push(className.trim());
	if (rootGrid === "inline") classes.push("is-inline");
	if (rootGrid === "rails") classes.push("is-grid-rails");
	if (railClassName) classes.push(railClassName);
	if (debug) classes.push("is-debug-mode");
	return classes.join(" ");
}

export function createDebugItems(): ResolvedItem[] {
	return lib.cellNames.map((base) => ({
		base,
		key: `debug-${base}`,
		label: base,
		className: "is-debug",
		family: "cell",
		place_modifier: "",
		placement_mode: "grid",
		is_canonical: true,
	}));
}

export function createRootDebugAttributes(
	debug: boolean,
	root: {
		rootGrid: GridValue;
		rootMode: PlacementMode;
		rootRail: string;
		rootRatio: string;
		rootTrackRows: string;
		rootTrackCols: string;
	},
): Record<string, string> {
	if (!debug) return {};
	return {
		"data-grid-root": "true",
		"data-grid": root.rootGrid,
		"data-grid-mode": root.rootMode,
		"data-grid-rail": root.rootRail,
		"data-grid-ratio": root.rootRatio,
		"data-grid-rows": root.rootTrackRows,
		"data-grid-cols": root.rootTrackCols,
		"data-grid-internal": String(internalTrackCount),
	};
}

export function createItemDebugAttributes(
	debug: boolean,
	item: Partial<PositionedItem>,
	role = "item",
): Record<string, string | undefined> {
	if (!debug) return {};
	return {
		"data-grid-role": role,
		"data-grid-key": item.key,
		"data-grid-label": item.label,
		"data-grid-base": item.base,
		"data-grid-family": item.family,
		"data-grid-mode": item.placement_mode,
		"data-grid-canonical": item.is_canonical ? "true" : "false",
		"data-grid-rail-zone": item.is_rail_zone ? "true" : "false",
		"data-grid-place-modifier": item.place_modifier,
		"data-grid-col-start": item.placement?.col_start,
		"data-grid-col-end": item.placement?.col_end,
		"data-grid-row-start": item.placement?.row_start,
		"data-grid-row-end": item.placement?.row_end,
	};
}
