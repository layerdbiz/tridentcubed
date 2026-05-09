import type { Snippet } from "svelte";

export type SnippetLike = Snippet;
export type GridValue = "full" | "inline" | "rails";
export type PlacementMode = "auto" | "grid" | "compact" | "fit" | "fill";
export type RootRendererProps = Record<string, unknown> & {
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
export type RootSnippetValue =
	| SnippetLike
	| string
	| number
	| boolean
	| null
	| undefined;
export type RootItemSource = Record<string, RootSnippetValue>;
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
	snippet?: SnippetLike;
	value?: RootSnippetValue;
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

export const railSpans: Record<string, string> = {
	"content-xs": "content-xs-start / content-xs-end",
	"content-sm": "content-sm-start / content-sm-end",
	content: "content-md-start / content-md-end",
	"content-md": "content-md-start / content-md-end",
	"content-lg": "content-lg-start / content-lg-end",
	popout: "content-lg-start / content-lg-end",
	"content-xl": "content-xl-start / content-xl-end",
	"content-full": "content-full-start / content-full-end",
	full: "content-full-start / content-full-end",
	bleed: "content-full-start / content-full-end",
	"bleed-left": "content-full-start / content-center",
	"bleed-left-center": "content-full-start / content-center",
	"bleed-left-half": "content-full-start / content-center",
	"bleed-right": "content-center / content-full-end",
	"bleed-right-center": "content-center / content-full-end",
	"bleed-right-half": "content-center / content-full-end",
	"bleed-left-xs": "content-full-start / content-xs-end",
	"bleed-left-sm": "content-full-start / content-sm-end",
	"bleed-left-md": "content-full-start / content-md-end",
	"bleed-left-lg": "content-full-start / content-lg-end",
	"bleed-left-xl": "content-full-start / content-xl-end",
	"bleed-right-xs": "content-xs-start / content-full-end",
	"bleed-right-sm": "content-sm-start / content-full-end",
	"bleed-right-md": "content-md-start / content-full-end",
	"bleed-right-lg": "content-lg-start / content-full-end",
	"bleed-right-xl": "content-xl-start / content-full-end",
};

export const cellNames = [
	"a1",
	"b1",
	"c1",
	"a2",
	"b2",
	"c2",
	"a3",
	"b3",
	"c3",
] as const;
export const rowNames = ["row1", "row2", "row3"] as const;
export const colNames = ["col1", "col2", "col3"] as const;
export const halfNames = [
	"topHalf",
	"bottomHalf",
	"leftHalf",
	"rightHalf",
] as const;
export const specialNames = ["full", "bg", "fg"] as const;
export const modeNames: PlacementMode[] = [
	"auto",
	"grid",
	"compact",
	"fit",
	"fill",
];
export const gridNames: GridValue[] = ["full", "inline", "rails"];
export const contentOnlyPlacements = ["between", "around", "evenly"] as const;

export const aliases = {
	cells: {
		a1: ["topleft", "lefttop", "topLeft", "leftTop", "tl", "lt"],
		b1: ["topcenter", "centertop", "top", "topCenter", "centerTop", "tc", "ct"],
		c1: ["topright", "righttop", "topRight", "rightTop", "tr", "rt"],
		a2: [
			"leftcenter",
			"centerleft",
			"left",
			"leftCenter",
			"centerLeft",
			"lc",
			"cl",
		],
		b2: ["center", "centercenter", "centerCenter", "cc", "c"],
		c2: [
			"rightcenter",
			"centerright",
			"right",
			"centerRight",
			"rightCenter",
			"rc",
			"cr",
		],
		a3: ["bottomleft", "leftbottom", "bottomLeft", "leftBottom", "bl", "lb"],
		b3: [
			"bottomcenter",
			"centerbottom",
			"bottom",
			"bottomCenter",
			"centerBottom",
			"bc",
			"cb",
		],
		c3: [
			"bottomright",
			"rightbottom",
			"bottomRight",
			"rightBottom",
			"br",
			"rb",
		],
	},
	rows: {
		row1: ["toprow", "rowtop", "topRow", "rowTop"],
		row2: [
			"row",
			"middlerow",
			"centerrow",
			"rowmiddle",
			"rowcenter",
			"middleRow",
			"centerRow",
			"rowMiddle",
			"rowCenter",
		],
		row3: ["bottomrow", "rowbottom", "bottomRow", "rowBottom"],
	},
	cols: {
		col1: ["leftcol", "colleft", "leftCol", "colLeft"],
		col2: [
			"col",
			"centercol",
			"middlecol",
			"colcenter",
			"colmiddle",
			"centerCol",
			"middleCol",
			"colCenter",
			"colMiddle",
		],
		col3: ["rightcol", "colright", "rightCol", "colRight"],
	},
	halves: {
		topHalf: ["tophalf", "top-half", "top_half", "top half"],
		bottomHalf: ["bottomhalf", "bottom-half", "bottom_half", "bottom half"],
		leftHalf: ["lefthalf", "left-half", "left_half", "left half"],
		rightHalf: ["righthalf", "right-half", "right_half", "right half"],
	},
	special: {
		full: [],
		bg: [],
		fg: [],
	},
	placeModifiers: {
		TL: ["TL", "LT", "TOPLEFT", "LEFTTOP"],
		TC: ["TC", "CT", "T", "TOPCENTER", "CENTERTOP", "TOP"],
		TR: ["TR", "RT", "TOPRIGHT", "RIGHTTOP"],
		LC: ["LC", "CL", "L", "LEFTCENTER", "CENTERLEFT", "LEFT"],
		CC: ["CC", "C", "CENTERCENTER", "CENTER"],
		RC: ["RC", "CR", "R", "RIGHTCENTER", "CENTERRIGHT", "RIGHT"],
		BL: ["BL", "LB", "BOTTOMLEFT", "LEFTBOTTOM"],
		BC: ["BC", "CB", "B", "BOTTOMCENTER", "CENTERBOTTOM", "BOTTOM"],
		BR: ["BR", "RB", "BOTTOMRIGHT", "RIGHTBOTTOM"],
	},
	layoutProps: {
		start: ["start"],
		end: ["end"],
		stretch: ["stretch"],
		center: ["center center", "center", "middle"],
		top: ["start center", "top"],
		right: ["center end", "right"],
		bottom: ["end center", "bottom"],
		left: ["center start", "left"],
		between: ["space-between", "between"],
		around: ["space-around", "around"],
		evenly: ["space-evenly", "evenly"],
		topleft: [
			"start start",
			"topleft",
			"lefttop",
			"top left",
			"left top",
			"topLeft",
			"leftTop",
			"tl",
			"lt",
		],
		topcenter: [
			"start center",
			"topcenter",
			"centertop",
			"top center",
			"center top",
			"topCenter",
			"centerTop",
			"tc",
			"ct",
			"t",
		],
		topright: [
			"start end",
			"topright",
			"righttop",
			"top right",
			"right top",
			"topRight",
			"rightTop",
			"tr",
			"rt",
		],
		leftcenter: [
			"center start",
			"leftcenter",
			"centerleft",
			"left center",
			"center left",
			"leftCenter",
			"centerLeft",
			"lc",
			"cl",
			"l",
		],
		centercenter: [
			"center center",
			"centercenter",
			"center center",
			"centerCenter",
			"cc",
			"c",
		],
		rightcenter: [
			"center end",
			"rightcenter",
			"centerright",
			"right center",
			"center right",
			"centerRight",
			"rightCenter",
			"rc",
			"cr",
			"r",
		],
		bottomleft: [
			"end start",
			"bottomleft",
			"leftbottom",
			"bottom left",
			"left bottom",
			"bottomLeft",
			"leftBottom",
			"bl",
			"lb",
		],
		bottomcenter: [
			"end center",
			"bottomcenter",
			"centerbottom",
			"bottom center",
			"center bottom",
			"centerBottom",
			"bottomCenter",
			"bc",
			"cb",
			"b",
		],
		bottomright: [
			"end end",
			"bottomright",
			"rightbottom",
			"bottom right",
			"right bottom",
			"rightBottom",
			"bottomRight",
			"br",
			"rb",
		],
	},
};

export const placeModifiers = Object.keys(aliases.placeModifiers);
export const rangeNames = createRangeNames();
export const baseSnippetNames: string[] = [
	...cellNames,
	...rowNames,
	...colNames,
	...rangeNames,
	...halfNames,
	...specialNames,
];
export const placementAliasMap = createPlacementAliasMap(aliases.layoutProps);

export function toAliasKey(value: unknown): string {
	return String(value)
		.trim()
		.toLowerCase()
		.replace(/[-_]/g, " ")
		.replace(/\s+/g, " ");
}

export function toRailKey(value: unknown): string {
	return String(value)
		.trim()
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.toLowerCase()
		.replace(/[_\s]+/g, "-")
		.replace(/^-+|-+$/g, "");
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

export function normalizeRail(value: unknown): string {
	const raw = toRailKey(value);
	if (!raw) return "";
	if (raw === "xs") return "content-xs";
	if (raw === "sm") return "content-sm";
	if (raw === "md") return "content-md";
	if (raw === "lg") return "content-lg";
	if (raw === "xl") return "content-xl";
	return railSpans[raw] ? raw : "";
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

export function getRailColumn(value: unknown): string | undefined {
	const railKey = normalizeRail(value);
	return railKey ? railSpans[railKey] : undefined;
}

export function getRailClassName(value: unknown): string {
	const railKey = normalizeRail(value);
	return railKey ? `is-rail-${railKey}` : "";
}

export function createRangeNames(): string[] {
	const columns = ["a", "b", "c"];
	const rowIds = ["1", "2", "3"];
	const ranges: string[] = [];

	for (const rowStart of rowIds) {
		for (const rowEnd of rowIds) {
			if (rowEnd < rowStart) continue;
			for (const colStart of columns) {
				for (const colEnd of columns) {
					if (colEnd < colStart) continue;
					const start = colStart + rowStart;
					const end = colEnd + rowEnd;
					if (start !== end) ranges.push(start + end);
				}
			}
		}
	}

	return ranges;
}

export function createNumberRange(start: number, end: number): number[] {
	const range: number[] = [];
	for (let value = start; value <= end; value += 1) {
		range.push(value);
	}
	return range;
}

export function hasSnippet(value: unknown): value is SnippetLike {
	return typeof value === "function";
}

export function isRootSnippetValue(value: unknown): value is RootSnippetValue {
	return value === null || value === undefined ||
		typeof value === "function" || typeof value === "string" ||
		typeof value === "number" || typeof value === "boolean";
}

export function hasRenderableValue(
	value: unknown,
): value is Exclude<RootSnippetValue, SnippetLike> {
	return value !== null && value !== undefined && value !== false &&
		value !== true && value !== "" && !hasSnippet(value);
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

export function getFamily(base: string): ItemFamily {
	if ((cellNames as readonly string[]).includes(base)) return "cell";
	if ((rowNames as readonly string[]).includes(base)) return "row";
	if ((colNames as readonly string[]).includes(base)) return "col";
	if (rangeNames.includes(base)) return "range";
	if ((halfNames as readonly string[]).includes(base)) return "half";
	if (base === "full") return "full";
	if (base === "bg") return "bg";
	if (base === "fg") return "fg";
	return "";
}

export function isLayerFamily(family: string): boolean {
	return family === "full" || family === "bg" || family === "fg";
}

export function getAliases(base: string): string[] {
	return (
		(aliases.cells as Record<string, string[]>)[base] ??
			(aliases.rows as Record<string, string[]>)[base] ??
			(aliases.cols as Record<string, string[]>)[base] ??
			(aliases.halves as Record<string, string[]>)[base] ??
			(aliases.special as Record<string, string[]>)[base] ??
			[]
	);
}

export function toClassName(
	placeModifier = "",
	family = "",
	placementMode = "",
): string {
	const classes: string[] = [];
	if (family) classes.push(`is-${family}`);
	if (placeModifier) classes.push(`is-${placeModifier.toLowerCase()}`);
	if (placementMode) classes.push(`is-mode-${placementMode}`);
	return classes.join(" ");
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
	if (isLayerFamily(family) && hasRatio) return "fill";
	if (isLayerFamily(family)) return "grid";
	if (hasRatio && (family === "row" || family === "col")) return "fit";
	if (!isCanonical && hasRatio) return "fit";
	return isCanonical ? "grid" : "compact";
}

export function getBaseCandidates(base: string) {
	const candidates = [{ key: base, is_canonical: true }];
	for (const alias of getAliases(base)) {
		candidates.push({ key: alias, is_canonical: false });
	}
	return candidates;
}

export function getPlaceModifierCandidates(base: string) {
	const candidates: Array<
		{ key: string; place_modifier: string; is_canonical: boolean }
	> = [];
	for (const baseCandidate of getBaseCandidates(base)) {
		for (const placeModifier of placeModifiers) {
			candidates.push({
				key: baseCandidate.key + placeModifier,
				place_modifier: placeModifier,
				is_canonical: baseCandidate.is_canonical,
			});
			for (
				const alias
					of (aliases.placeModifiers as Record<string, string[]>)[placeModifier]
			) {
				if (alias === placeModifier) continue;
				candidates.push({
					key: baseCandidate.key + alias,
					place_modifier: placeModifier,
					is_canonical: baseCandidate.is_canonical,
				});
			}
		}
	}
	return candidates;
}

export function getSnippetCandidates(base: string) {
	const candidates = getPlaceModifierCandidates(base);
	for (const baseCandidate of getBaseCandidates(base)) {
		candidates.push({
			key: baseCandidate.key,
			place_modifier: "",
			is_canonical: baseCandidate.is_canonical,
		});
	}
	return candidates;
}

export function createResolvableSourceKeySet(): Set<string> {
	const keys = new Set<string>();

	for (const name of baseSnippetNames) {
		for (const candidate of getSnippetCandidates(name)) {
			keys.add(candidate.key);
		}
	}

	return keys;
}

export const resolvableSourceKeys = createResolvableSourceKeySet();

export function pickItemSources(source: Record<string, unknown>): RootItemSource {
	const picked: RootItemSource = {};

	for (const [key, value] of Object.entries(source)) {
		if (!resolvableSourceKeys.has(key)) continue;
		if (!isRootSnippetValue(value)) continue;
		picked[key] = value;
	}

	return picked;
}

export function resolveSnippet(
	base: string,
	snippets: RootItemSource,
	mode: unknown,
	ratio: unknown,
	grid: unknown = "full",
): ResolvedItem | null {
	const candidates = getSnippetCandidates(base);
	const family = getFamily(base);
	for (const candidate of candidates) {
		const snippet = snippets[candidate.key];
		const key = candidate.place_modifier
			? base + candidate.place_modifier
			: base;
		const placementMode = getPlacementMode(
			candidate.is_canonical,
			family,
			mode,
			ratio,
			grid,
		);

		if (hasSnippet(snippet)) {
			return {
				base,
				key,
				label: candidate.key,
				snippet,
				className: toClassName(candidate.place_modifier, family, placementMode),
				place_modifier: candidate.place_modifier,
				placement_mode: placementMode,
				is_canonical: candidate.is_canonical,
				family,
			};
		}

		if (hasRenderableValue(snippet)) {
			return {
				base,
				key,
				label: candidate.key,
				value: snippet,
				className: toClassName(candidate.place_modifier, family, placementMode),
				place_modifier: candidate.place_modifier,
				placement_mode: placementMode,
				is_canonical: candidate.is_canonical,
				family,
			};
		}
	}
	return null;
}

export function resolveItems(
	snippets: RootItemSource,
	mode: unknown,
	ratio: unknown,
	grid: unknown = "full",
): ResolvedItem[] {
	const resolved: ResolvedItem[] = [];
	for (
		const group of [
			cellNames,
			rowNames,
			colNames,
			rangeNames,
			halfNames,
			specialNames,
		]
	) {
		for (const name of group) {
			const item = resolveSnippet(name, snippets, mode, ratio, grid);
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
	if (isLayerFamily(item.family)) return getFullFootprint();
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
	return `${getTrackAlignment(trackRows)} ${getTrackAlignment(trackCols)}`;
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
	const minColUnit = "calc(var(--grid-min-col, 2ch) * 0.5)";
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
	const minRowUnit = "calc(var(--grid-min-row, 1lh) * 0.5)";
	const contentTrack = `minmax(${minRowUnit}, max-content)`;
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
	if (isLayerFamily(item.family)) {
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
		(item.family === "row" || isLayerFamily(item.family));
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
				? railSpans["content-full"]
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
	const railClassName = getRailClassName(rail);
	if (className.trim()) classes.push(className.trim());
	if (rootGrid === "inline") classes.push("is-inline");
	if (rootGrid === "rails") classes.push("is-grid-rails");
	if (railClassName) classes.push(railClassName);
	if (debug) classes.push("is-debug-mode");
	return classes.join(" ");
}

export function createDebugItems(): ResolvedItem[] {
	return cellNames.map((base) => ({
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
