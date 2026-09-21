import type {
	ItemFamily,
	ItemSnippet,
	RootItemSource,
	RootItemValue,
} from "$lib";

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
		full: ["stretch", "full"],
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
		topfull: ["start stretch", "top full", "full top"],
		centerfull: ["center stretch", "center full", "full center"],
		bottomfull: ["end stretch", "bottom full", "full bottom"],
		leftfull: ["stretch start", "left full", "full left"],
		rightfull: ["stretch end", "right full", "full right"],
	},
};

export const placeModifiers = Object.keys(aliases.placeModifiers);

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

export const rangeNames = createRangeNames();
export const baseSnippetNames: string[] = [
	...cellNames,
	...rowNames,
	...colNames,
	...rangeNames,
	...halfNames,
	...specialNames,
];

export function hasSnippet(value: unknown): value is ItemSnippet {
	return typeof value === "function";
}

export function hasRenderableValue(
	value: unknown,
): value is Exclude<RootItemValue, ItemSnippet> {
	return value !== null && value !== undefined && value !== false &&
		value !== true && value !== "" && !hasSnippet(value);
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

export function pickItemSources(
	source: Record<string, unknown>,
): RootItemSource {
	const picked: RootItemSource = {};

	for (const [key, value] of Object.entries(source)) {
		if (!resolvableSourceKeys.has(key)) continue;
		if (!hasSnippet(value) && !hasRenderableValue(value)) continue;
		picked[key] = value;
	}

	return picked;
}
