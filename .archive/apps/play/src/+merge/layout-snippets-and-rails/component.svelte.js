
/* Component Engine
--------------------------------------------
This file owns the reusable layout math for Component.svelte.

Public API remains 3x3:
- cells: a1, b2, c3
- rows: row1, row2, row3
- columns: col1, col2, col3
- ranges: a1b2, b2c3, a1c3
- halves: topHalf, bottomHalf, leftHalf, rightHalf

Internal engine is always 6x6:
- public thirds span 2 internal tracks
- public halves span 3 internal tracks
- debug still renders the public 3x3 mental model
*/

export const publicTrackCount = 3;
export const internalTrackCount = 6;

export const itemTagMap = {
	button: 'span',
	a: 'span',
	label: 'span',
	ul: 'li',
	ol: 'li'
};

export const ratioAliases = {
	square: '1 / 1',
	video: '16 / 9',
	horizontal: '16 / 9',
	landscape: '16 / 9',
	portrait: '4 / 5',
	vertical: '9 / 16'
};

export const railSpans = {
	'content-xs': 'content-xs-start / content-xs-end',
	'content-sm': 'content-sm-start / content-sm-end',
	content: 'content-md-start / content-md-end',
	'content-md': 'content-md-start / content-md-end',
	'content-lg': 'content-lg-start / content-lg-end',
	popout: 'content-lg-start / content-lg-end',
	'content-xl': 'content-xl-start / content-xl-end',
	'content-full': 'content-full-start / content-full-end',
	full: 'content-full-start / content-full-end',
	bleed: 'content-full-start / content-full-end',

	'bleed-left': 'content-full-start / content-center',
	'bleed-left-center': 'content-full-start / content-center',
	'bleed-left-half': 'content-full-start / content-center',

	'bleed-right': 'content-center / content-full-end',
	'bleed-right-center': 'content-center / content-full-end',
	'bleed-right-half': 'content-center / content-full-end',

	'bleed-left-xs': 'content-full-start / content-xs-end',
	'bleed-left-sm': 'content-full-start / content-sm-end',
	'bleed-left-md': 'content-full-start / content-md-end',
	'bleed-left-lg': 'content-full-start / content-lg-end',
	'bleed-left-xl': 'content-full-start / content-xl-end',

	'bleed-right-xs': 'content-xs-start / content-full-end',
	'bleed-right-sm': 'content-sm-start / content-full-end',
	'bleed-right-md': 'content-md-start / content-full-end',
	'bleed-right-lg': 'content-lg-start / content-full-end',
	'bleed-right-xl': 'content-xl-start / content-full-end'
};

export const cellNames = ['a1', 'b1', 'c1', 'a2', 'b2', 'c2', 'a3', 'b3', 'c3'];
export const rowNames = ['row1', 'row2', 'row3'];
export const colNames = ['col1', 'col2', 'col3'];
export const halfNames = ['topHalf', 'bottomHalf', 'leftHalf', 'rightHalf'];
export const specialNames = ['full', 'bg', 'fg'];
export const modeNames = ['auto', 'grid', 'compact', 'fit', 'fill'];
export const gridNames = ['full', 'inline', 'rails'];
export const contentOnlyPlacements = ['between', 'around', 'evenly'];

export const aliases = {
	cells: {
		a1: ['topleft', 'lefttop', 'topLeft', 'leftTop', 'tl', 'lt'],
		b1: ['topcenter', 'centertop', 'top', 'topCenter', 'centerTop', 'tc', 'ct'],
		c1: ['topright', 'righttop', 'topRight', 'rightTop', 'tr', 'rt'],

		a2: ['leftcenter', 'centerleft', 'left', 'leftCenter', 'centerLeft', 'lc', 'cl'],
		b2: ['center', 'centercenter', 'centerCenter', 'cc', 'c'],
		c2: ['rightcenter', 'centerright', 'right', 'centerRight', 'rightCenter', 'rc', 'cr'],

		a3: ['bottomleft', 'leftbottom', 'bottomLeft', 'leftBottom', 'bl', 'lb'],
		b3: ['bottomcenter', 'centerbottom', 'bottom', 'bottomCenter', 'centerBottom', 'bc', 'cb'],
		c3: ['bottomright', 'rightbottom', 'bottomRight', 'rightBottom', 'br', 'rb']
	},

	rows: {
		row1: ['toprow', 'rowtop', 'topRow', 'rowTop'],
		row2: [
			'row',
			'middlerow',
			'centerrow',
			'rowmiddle',
			'rowcenter',
			'middleRow',
			'centerRow',
			'rowMiddle',
			'rowCenter'
		],
		row3: ['bottomrow', 'rowbottom', 'bottomRow', 'rowBottom']
	},

	cols: {
		col1: ['leftcol', 'colleft', 'leftCol', 'colLeft'],
		col2: [
			'col',
			'centercol',
			'middlecol',
			'colcenter',
			'colmiddle',
			'centerCol',
			'middleCol',
			'colCenter',
			'colMiddle'
		],
		col3: ['rightcol', 'colright', 'rightCol', 'colRight']
	},

	halves: {
		topHalf: ['tophalf', 'top-half', 'top_half', 'top half'],
		bottomHalf: ['bottomhalf', 'bottom-half', 'bottom_half', 'bottom half'],
		leftHalf: ['lefthalf', 'left-half', 'left_half', 'left half'],
		rightHalf: ['righthalf', 'right-half', 'right_half', 'right half']
	},

	special: {
		full: [],
		bg: [],
		fg: []
	},

	placeModifiers: {
		TL: ['TL', 'LT', 'TOPLEFT', 'LEFTTOP'],
		TC: ['TC', 'CT', 'T', 'TOPCENTER', 'CENTERTOP', 'TOP'],
		TR: ['TR', 'RT', 'TOPRIGHT', 'RIGHTTOP'],

		LC: ['LC', 'CL', 'L', 'LEFTCENTER', 'CENTERLEFT', 'LEFT'],
		CC: ['CC', 'C', 'CENTERCENTER', 'CENTER'],
		RC: ['RC', 'CR', 'R', 'RIGHTCENTER', 'CENTERRIGHT', 'RIGHT'],

		BL: ['BL', 'LB', 'BOTTOMLEFT', 'LEFTBOTTOM'],
		BC: ['BC', 'CB', 'B', 'BOTTOMCENTER', 'CENTERBOTTOM', 'BOTTOM'],
		BR: ['BR', 'RB', 'BOTTOMRIGHT', 'RIGHTBOTTOM']
	},

	layoutProps: {
		start: ['start'],
		end: ['end'],
		stretch: ['stretch'],
		center: ['center center', 'center', 'middle'],

		top: ['start center', 'top'],
		right: ['center end', 'right'],
		bottom: ['end center', 'bottom'],
		left: ['center start', 'left'],

		between: ['space-between', 'between'],
		around: ['space-around', 'around'],
		evenly: ['space-evenly', 'evenly'],

		topleft: ['start start', 'topleft', 'lefttop', 'top left', 'left top', 'topLeft', 'leftTop', 'tl', 'lt'],
		topcenter: [
			'start center',
			'topcenter',
			'centertop',
			'top center',
			'center top',
			'topCenter',
			'centerTop',
			'tc',
			'ct',
			't'
		],
		topright: ['start end', 'topright', 'righttop', 'top right', 'right top', 'topRight', 'rightTop', 'tr', 'rt'],

		leftcenter: [
			'center start',
			'leftcenter',
			'centerleft',
			'left center',
			'center left',
			'leftCenter',
			'centerLeft',
			'lc',
			'cl',
			'l'
		],
		centercenter: ['center center', 'centercenter', 'center center', 'centerCenter', 'cc', 'c'],
		rightcenter: [
			'center end',
			'rightcenter',
			'centerright',
			'right center',
			'center right',
			'centerRight',
			'rightCenter',
			'rc',
			'cr',
			'r'
		],

		bottomleft: [
			'end start',
			'bottomleft',
			'leftbottom',
			'bottom left',
			'left bottom',
			'bottomLeft',
			'leftBottom',
			'bl',
			'lb'
		],
		bottomcenter: [
			'end center',
			'bottomcenter',
			'centerbottom',
			'bottom center',
			'center bottom',
			'centerBottom',
			'bottomCenter',
			'bc',
			'cb',
			'b'
		],
		bottomright: [
			'end end',
			'bottomright',
			'rightbottom',
			'bottom right',
			'right bottom',
			'rightBottom',
			'bottomRight',
			'br',
			'rb'
		]
	}
};

export const placeModifiers = Object.keys(aliases.placeModifiers);
export const rangeNames = createRangeNames();
export const placementAliasMap = createPlacementAliasMap(aliases.layoutProps);

/* Normalization
--------------------------------------------
Flexible public values are normalized into stable internal keys.
*/

export function toAliasKey(value) {
	return String(value)
		.trim()
		.toLowerCase()
		.replace(/[-_]/g, ' ')
		.replace(/\s+/g, ' ');
}

export function toRailKey(value) {
	return String(value)
		.trim()
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.toLowerCase()
		.replace(/[_\s]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function normalizePlacement(value, type = 'items') {
	const raw = toAliasKey(value);
	if (!raw) return '';

	if (type === 'items' && contentOnlyPlacements.includes(raw)) return '';
	if (raw === 'center' && type === 'items') return 'center center';

	return placementAliasMap[raw] ?? raw;
}

export function normalizeRail(value) {
	const raw = toRailKey(value);
	if (!raw) return '';

	if (raw === 'xs') return 'content-xs';
	if (raw === 'sm') return 'content-sm';
	if (raw === 'md') return 'content-md';
	if (raw === 'lg') return 'content-lg';
	if (raw === 'xl') return 'content-xl';

	return railSpans[raw] ? raw : '';
}

export function normalizeRatio(value) {
	const raw = String(value).trim();
	if (!raw) return 'auto';

	const alias = ratioAliases[toAliasKey(raw)];
	if (alias) return alias;

	const match = raw.match(/^(\d*\.?\d+)\s*[:/]\s*(\d*\.?\d+)$/);
	if (!match) return 'auto';

	const width = Number(match[1]);
	const height = Number(match[2]);

	if (!Number.isFinite(width) || !Number.isFinite(height)) return 'auto';
	if (width <= 0 || height <= 0) return 'auto';

	return `${width} / ${height}`;
}

export function normalizeMode(value) {
	const raw = String(value).trim().toLowerCase();
	return modeNames.includes(raw) ? raw : 'auto';
}

export function normalizeGrid(value) {
	const raw = String(value).trim().toLowerCase();
	return gridNames.includes(raw) ? raw : 'full';
}

export function getRailColumn(value) {
	const railKey = normalizeRail(value);
	if (!railKey) return undefined;

	return railSpans[railKey];
}

export function getRailClassName(value) {
	const railKey = normalizeRail(value);
	if (!railKey) return '';

	return 'is-rail-' + railKey;
}

/* Primitive helpers
--------------------------------------------
Small utilities used across track, snippet, and placement resolution.
*/

export function createRangeNames() {
	const columns = ['a', 'b', 'c'];
	const rowIds = ['1', '2', '3'];
	const ranges = [];

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

export function createNumberRange(start, end) {
	const range = [];

	for (let value = start; value <= end; value += 1) {
		range.push(value);
	}

	return range;
}

export function hasSnippet(value) {
	return typeof value === 'function';
}

export function parseCell(cell) {
	const columnMap = { a: 1, b: 2, c: 3 };

	return {
		column: columnMap[cell[0]],
		row: Number(cell[1])
	};
}

export function parseRange(range) {
	return {
		start: parseCell(range.slice(0, 2)),
		end: parseCell(range.slice(2, 4))
	};
}

export function toCellName(column, row) {
	const columnNames = ['', 'a', 'b', 'c'];
	return columnNames[column] + row;
}

export function toTrackTokens(value) {
	return String(value)
		.trim()
		.split(/\s+/)
		.filter(Boolean);
}

export function normalizeTracks(value, fallback) {
	const tokens = toTrackTokens(value);

	if (!tokens.length) return [fallback, fallback, fallback];
	if (tokens.length === 1) return [tokens[0], tokens[0], tokens[0]];
	if (tokens.length === 2) return [tokens[0], tokens[1], fallback];

	return [tokens[0], tokens[1], tokens[2]];
}

export function getSingleSizeToken(value, fallback = 'auto') {
	const tokens = toTrackTokens(value);
	return tokens[0] ?? fallback;
}

export function createPlacementAliasMap(groups) {
	const map = {};

	for (const names of Object.values(groups)) {
		const [cssValue] = names;

		for (const name of names) {
			const key = toAliasKey(name);
			if (key) map[key] = cssValue;
		}
	}

	return map;
}

/* Snippet resolution
--------------------------------------------
Public snippets can use canonical names, friendly aliases, and placement
modifier suffixes. Everything resolves to a canonical base item.
*/

export function getItemTag(tagName) {
	return itemTagMap[tagName] ?? 'div';
}

export function getFamily(base) {
	if (cellNames.includes(base)) return 'cell';
	if (rowNames.includes(base)) return 'row';
	if (colNames.includes(base)) return 'col';
	if (rangeNames.includes(base)) return 'range';
	if (halfNames.includes(base)) return 'half';
	if (base === 'full') return 'full';
	if (base === 'bg') return 'bg';
	if (base === 'fg') return 'fg';

	return '';
}

export function isLayerFamily(family) {
	return family === 'full' || family === 'bg' || family === 'fg';
}

export function getAliases(base) {
	if (aliases.cells[base]) return aliases.cells[base];
	if (aliases.rows[base]) return aliases.rows[base];
	if (aliases.cols[base]) return aliases.cols[base];
	if (aliases.halves[base]) return aliases.halves[base];
	if (aliases.special[base]) return aliases.special[base];

	return [];
}

export function toClassName(placeModifier = '', family = '', placementMode = '') {
	const classes = [];

	if (family) classes.push('is-' + family);
	if (placeModifier) classes.push('is-' + placeModifier.toLowerCase());
	if (placementMode) classes.push('is-mode-' + placementMode);

	return classes.join(' ');
}

export function getPlacementMode(isCanonical, family = '', mode = 'auto', ratio = '', grid = 'full') {
	const activeMode = normalizeMode(mode);
	const activeGrid = normalizeGrid(grid);
	const hasRatio = normalizeRatio(ratio) !== 'auto';

	if (activeMode !== 'auto') return activeMode;

	// Rails-aware auto mode:
	// Row snippets inside a rails provider behave like app-shell rows:
	// header/footer size to content, middle row can stretch.
	if (activeGrid === 'rails' && family === 'row') return 'fit';

	if (family === 'half' && hasRatio) return 'fill';
	if (family === 'half') return 'compact';
	if (isLayerFamily(family) && hasRatio) return 'fill';
	if (isLayerFamily(family)) return 'grid';
	if (hasRatio && (family === 'row' || family === 'col')) return 'fit';
	if (!isCanonical && hasRatio) return 'fit';

	return isCanonical ? 'grid' : 'compact';
}

export function getBaseCandidates(base) {
	const candidates = [{ key: base, is_canonical: true }];

	for (const alias of getAliases(base)) {
		candidates.push({
			key: alias,
			is_canonical: false
		});
	}

	return candidates;
}

export function getPlaceModifierCandidates(base) {
	const candidates = [];

	for (const baseCandidate of getBaseCandidates(base)) {
		for (const placeModifier of placeModifiers) {
			candidates.push({
				key: baseCandidate.key + placeModifier,
				place_modifier: placeModifier,
				is_canonical: baseCandidate.is_canonical
			});

			for (const alias of aliases.placeModifiers[placeModifier]) {
				if (alias === placeModifier) continue;

				candidates.push({
					key: baseCandidate.key + alias,
					place_modifier: placeModifier,
					is_canonical: baseCandidate.is_canonical
				});
			}
		}
	}

	return candidates;
}

export function getSnippetCandidates(base) {
	const candidates = getPlaceModifierCandidates(base);

	for (const baseCandidate of getBaseCandidates(base)) {
		candidates.push({
			key: baseCandidate.key,
			place_modifier: '',
			is_canonical: baseCandidate.is_canonical
		});
	}

	return candidates;
}

export function resolveSnippet(base, snippets, mode, ratio, grid = 'full') {
	const candidates = getSnippetCandidates(base);
	const family = getFamily(base);

	for (const candidate of candidates) {
		const snippet = snippets[candidate.key];

		if (hasSnippet(snippet)) {
			const key = candidate.place_modifier ? base + candidate.place_modifier : base;
			const placementMode = getPlacementMode(candidate.is_canonical, family, mode, ratio, grid);

			return {
				base,
				key,
				label: candidate.key,
				snippet,
				className: toClassName(candidate.place_modifier, family, placementMode),
				place_modifier: candidate.place_modifier,
				placement_mode: placementMode,
				is_canonical: candidate.is_canonical,
				family
			};
		}
	}

	return null;
}

export function resolveItems(snippets, mode, ratio, grid = 'full') {
	const resolved = [];

	for (const group of [cellNames, rowNames, colNames, rangeNames, halfNames, specialNames]) {
		for (const name of group) {
			const item = resolveSnippet(name, snippets, mode, ratio, grid);
			if (item) resolved.push(item);
		}
	}

	return resolved;
}

/* Internal 6x6 mapping
--------------------------------------------
Every public grid area maps into internal tracks.

Public cells:
- a/b/c columns each span 2 internal tracks
- 1/2/3 rows each span 2 internal tracks

Halves:
- top/bottom span 3 internal rows
- left/right span 3 internal columns
*/

export function getInternalTrackIndexes() {
	return createNumberRange(1, internalTrackCount);
}

export function getPublicTrackIndex(internalIndex) {
	return Math.ceil(internalIndex / 2);
}

export function getCellTracks(cell) {
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
		col_end: colEnd
	};
}

export function getRangeTracks(range) {
	const start = getCellTracks(range.start);
	const end = getCellTracks(range.end);

	return {
		rows: createNumberRange(start.row_start, end.row_end),
		cols: createNumberRange(start.col_start, end.col_end),
		row_start: start.row_start,
		row_end: end.row_end,
		col_start: start.col_start,
		col_end: end.col_end
	};
}

export function getRowTracks(row) {
	const rowStart = (row - 1) * 2 + 1;
	const rowEnd = row * 2;

	return {
		rows: createNumberRange(rowStart, rowEnd),
		cols: getInternalTrackIndexes(),
		row_start: rowStart,
		row_end: rowEnd,
		col_start: 1,
		col_end: internalTrackCount
	};
}

export function getColTracks(column) {
	const colStart = (column - 1) * 2 + 1;
	const colEnd = column * 2;

	return {
		rows: getInternalTrackIndexes(),
		cols: createNumberRange(colStart, colEnd),
		row_start: 1,
		row_end: internalTrackCount,
		col_start: colStart,
		col_end: colEnd
	};
}

export function getHalfTracks(base) {
	if (base === 'topHalf') {
		return {
			rows: createNumberRange(1, 3),
			cols: getInternalTrackIndexes(),
			row_start: 1,
			row_end: 3,
			col_start: 1,
			col_end: internalTrackCount
		};
	}

	if (base === 'bottomHalf') {
		return {
			rows: createNumberRange(4, 6),
			cols: getInternalTrackIndexes(),
			row_start: 4,
			row_end: 6,
			col_start: 1,
			col_end: internalTrackCount
		};
	}

	if (base === 'leftHalf') {
		return {
			rows: getInternalTrackIndexes(),
			cols: createNumberRange(1, 3),
			row_start: 1,
			row_end: internalTrackCount,
			col_start: 1,
			col_end: 3
		};
	}

	return {
		rows: getInternalTrackIndexes(),
		cols: createNumberRange(4, 6),
		row_start: 1,
		row_end: internalTrackCount,
		col_start: 4,
		col_end: 6
	};
}

/* Footprints and usage envelope
--------------------------------------------
Footprints describe which internal tracks an item needs.

Compact and fit modes prune to the used internal envelope. Grid and fill modes
keep the full 6x6 shell.
*/

export function createFootprint(rows, cols) {
	return { rows, cols };
}

export function getFullFootprint() {
	const tracks = getInternalTrackIndexes();
	return createFootprint(tracks, tracks);
}

export function isFullTrackMode(placementMode) {
	return placementMode === 'grid' || placementMode === 'fill';
}

export function getRowFootprint(row, placementMode) {
	if (isFullTrackMode(placementMode)) return getFullFootprint();

	const tracks = getRowTracks(row);
	return createFootprint(tracks.rows, tracks.cols);
}

export function getCompactColFootprint(column) {
	const tracks = getColTracks(column);
	return createFootprint([3, 4], tracks.cols);
}

export function getColFootprint(column, placementMode) {
	if (isFullTrackMode(placementMode)) return getFullFootprint();
	return getCompactColFootprint(column);
}

export function getRangeFootprint(range, placementMode) {
	if (isFullTrackMode(placementMode)) return getFullFootprint();

	const tracks = getRangeTracks(range);
	return createFootprint(tracks.rows, tracks.cols);
}

export function getCellFootprint(cell, placementMode) {
	if (isFullTrackMode(placementMode)) return getFullFootprint();

	const tracks = getCellTracks(cell);
	return createFootprint(tracks.rows, tracks.cols);
}

export function getHalfFootprint(base, placementMode) {
	if (isFullTrackMode(placementMode)) return getFullFootprint();

	const tracks = getHalfTracks(base);
	return createFootprint(tracks.rows, tracks.cols);
}

export function getItemFootprint(item) {
	if (item.family === 'cell') return getCellFootprint(parseCell(item.base), item.placement_mode);

	if (item.family === 'row') {
		return getRowFootprint(Number(item.base.replace('row', '')), item.placement_mode);
	}

	if (item.family === 'col') {
		const colLookup = { col1: 1, col2: 2, col3: 3 };
		return getColFootprint(colLookup[item.base], item.placement_mode);
	}

	if (item.family === 'range') return getRangeFootprint(parseRange(item.base), item.placement_mode);
	if (item.family === 'half') return getHalfFootprint(item.base, item.placement_mode);
	if (isLayerFamily(item.family)) return getFullFootprint();

	return createFootprint([], []);
}

export function getUsageEnvelope(items) {
	if (!items.length) {
		return {
			rows: [],
			cols: [],
			row_start: 1,
			col_start: 1
		};
	}

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
		return {
			rows: [],
			cols: [],
			row_start: 1,
			col_start: 1
		};
	}

	return {
		rows: createNumberRange(minRow, maxRow),
		cols: createNumberRange(minCol, maxCol),
		row_start: minRow,
		col_start: minCol
	};
}

/* Track resolution
--------------------------------------------
Track defaults are also internal 6-track values.

A public cell spans 2 internal tracks, so the internal min units are half of
the public min values:
- 2 internal row tracks × 0.5 row unit = 1 public row minimum
- 2 internal col tracks × 0.5 col unit = 1 public col minimum
*/

export function hasGridPlacement(items) {
	for (const item of items) {
		if (item.placement_mode === 'grid') return true;
	}

	return false;
}

export function hasCompactPlacement(items) {
	for (const item of items) {
		if (item.placement_mode === 'compact') return true;
	}

	return false;
}

export function hasFitPlacement(items) {
	for (const item of items) {
		if (item.placement_mode === 'fit') return true;
	}

	return false;
}

export function hasFillPlacement(items) {
	for (const item of items) {
		if (item.placement_mode === 'fill') return true;
	}

	return false;
}

export function getAutoRootContent(trackCols, debug) {
	if (debug) return undefined;
	if (trackCols.length !== 2) return undefined;
	if (trackCols[0] !== 5 || trackCols[1] !== 6) return undefined;

	return 'normal end';
}

export function getTrackAlignment(indexes) {
	if (!indexes.length) return 'center';

	const min = Math.min(...indexes);
	const max = Math.max(...indexes);

	if (min === 1 && max < internalTrackCount) return 'start';
	if (min > 1 && max === internalTrackCount) return 'end';
	if (min === 1 && max === 1) return 'start';
	if (min === internalTrackCount && max === internalTrackCount) return 'end';

	return 'center';
}

export function hasFullTrackEnvelope(trackRows, trackCols) {
	return (
		trackRows.length === internalTrackCount &&
		trackCols.length === internalTrackCount &&
		trackRows[0] === 1 &&
		trackRows[trackRows.length - 1] === internalTrackCount &&
		trackCols[0] === 1 &&
		trackCols[trackCols.length - 1] === internalTrackCount
	);
}

export function getAutoRatioRootContent(trackRows, trackCols, hasRatio, shouldUseCompact, shouldUseFill) {
	if (!hasRatio) return undefined;
	if (shouldUseFill) return 'start start';
	if (hasFullTrackEnvelope(trackRows, trackCols)) return 'start start';
	if (shouldUseCompact) return `start ${getTrackAlignment(trackCols)}`;

	return `${getTrackAlignment(trackRows)} ${getTrackAlignment(trackCols)}`;
}

export function createDefaultTracks(indexes, defaults) {
	if (!indexes.length) return defaults;
	return indexes.map((index) => defaults[index - 1]);
}

export function getDefaultColTracks(indexes, shouldUseGrid, shouldUseContent, shouldUseFit, shouldUseFill, shouldUseDebugFit) {
	const minColUnit = 'calc(var(--grid-min-col, 2ch) * 0.5)';
	const sideTrack = `minmax(${minColUnit}, max-content)`;
	const centerTrack = 'minmax(0, 1fr)';

	const contentTracks = [sideTrack, sideTrack, centerTrack, centerTrack, sideTrack, sideTrack];
	const defaultTracks = ['auto', 'auto', centerTrack, centerTrack, 'auto', 'auto'];

	const defaults =
		shouldUseDebugFit || shouldUseFit || shouldUseFill || shouldUseGrid || shouldUseContent
			? contentTracks
			: defaultTracks;

	return createDefaultTracks(indexes, defaults);
}

export function getDefaultRowTracks(indexes, shouldUseGrid, shouldUseContent, shouldUseFit, shouldUseFill, shouldUseDebugFit) {
	const minRowUnit = 'calc(var(--grid-min-row, 1lh) * 0.5)';
	const contentTrack = `minmax(${minRowUnit}, max-content)`;
	const flexibleTrack = `minmax(${minRowUnit}, 1fr)`;

	const contentTracks = [contentTrack, contentTrack, contentTrack, contentTrack, contentTrack, contentTrack];
	const flexibleTracks = [contentTrack, contentTrack, flexibleTrack, flexibleTrack, contentTrack, contentTrack];
	const defaultTracks = ['auto', 'auto', '1fr', '1fr', 'auto', 'auto'];

	const defaults =
		shouldUseDebugFit || shouldUseFit
			? flexibleTracks
			: shouldUseFill
				? flexibleTracks
				: shouldUseGrid || shouldUseContent
					? contentTracks
					: defaultTracks;

	return createDefaultTracks(indexes, defaults);
}

export function isFullInternalEnvelope(usedIndexes) {
	return (
		usedIndexes.length === internalTrackCount &&
		usedIndexes[0] === 1 &&
		usedIndexes[usedIndexes.length - 1] === internalTrackCount
	);
}

export function mapPublicTokensToInternalTracks(tokens, usedIndexes) {
	const tracks = [];

	for (const internalIndex of usedIndexes) {
		const publicIndex = getPublicTrackIndex(internalIndex);
		tracks.push(tokens[publicIndex - 1]);
	}

	return tracks;
}

export function mapInternalTokensToUsedTracks(tokens, usedIndexes, fallback) {
	const tracks = [];

	for (const internalIndex of usedIndexes) {
		tracks.push(tokens[internalIndex - 1] ?? fallback);
	}

	return tracks;
}

export function getResolvedTrackConfig(value, fallback, defaults, usedIndexes, trackMode = 'tracks') {
	const trimmed = String(value).trim();
	const tokens = toTrackTokens(trimmed);
	const targetCount = usedIndexes.length || 1;
	const isFullEnvelope = isFullInternalEnvelope(usedIndexes);

	if (!tokens.length) {
		return {
			tracks: defaults,
			is_pruned: true,
			kind: 'default'
		};
	}

	if (trackMode === 'size') {
		const token = getSingleSizeToken(trimmed, fallback);

		return {
			tracks: Array(targetCount).fill(token),
			is_pruned: true,
			kind: 'size'
		};
	}

	if (tokens.length === 1) {
		return {
			tracks: Array(targetCount).fill(tokens[0]),
			is_pruned: true,
			kind: 'shorthand'
		};
	}

	const isUniform = tokens.every((token) => token === tokens[0]);

	if (isUniform) {
		return {
			tracks: Array(targetCount).fill(tokens[0]),
			is_pruned: true,
			kind: 'shorthand'
		};
	}

	if (tokens.length === publicTrackCount) {
		return {
			tracks: mapPublicTokensToInternalTracks(tokens, usedIndexes),
			is_pruned: !isFullEnvelope,
			kind: 'explicit-public'
		};
	}

	if (tokens.length >= internalTrackCount) {
		return {
			tracks: isFullEnvelope ? tokens.slice(0, internalTrackCount) : mapInternalTokensToUsedTracks(tokens, usedIndexes, fallback),
			is_pruned: !isFullEnvelope,
			kind: 'explicit-internal'
		};
	}

	const tracks = [];

	for (const index of createNumberRange(0, targetCount - 1)) {
		tracks.push(tokens[index] ?? fallback);
	}

	return {
		tracks,
		is_pruned: true,
		kind: 'shorthand'
	};
}

export function createTrackMap(indexes, isPruned) {
	const map = new Map();

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

/* Placement
--------------------------------------------
Placement resolves public API names into internal 6x6 CSS grid lines.

Rows and columns intentionally span the rendered envelope on the opposite axis.
This preserves old compact/fit behavior after the internal grid moved from
3 tracks to 6 tracks.
*/

export function toPlacementFromTracks(rowMap, colMap, tracks) {
	return {
		col_start: String(colMap.get(tracks.col_start)),
		col_end: String(colMap.get(tracks.col_end) + 1),
		row_start: String(rowMap.get(tracks.row_start)),
		row_end: String(rowMap.get(tracks.row_end) + 1)
	};
}

export function getRowPlacement(rowMap, row) {
	const tracks = getRowTracks(row);

	return {
		col_start: '1',
		col_end: '-1',
		row_start: String(rowMap.get(tracks.row_start)),
		row_end: String(rowMap.get(tracks.row_end) + 1)
	};
}

export function getColPlacement(colMap, column) {
	const tracks = getColTracks(column);

	return {
		col_start: String(colMap.get(tracks.col_start)),
		col_end: String(colMap.get(tracks.col_end) + 1),
		row_start: '1',
		row_end: '-1'
	};
}

export function getPlacement(item, rowTrackConfig, colTrackConfig, usedTracks) {
	const rowMap = createTrackMap(usedTracks.rows, rowTrackConfig.is_pruned);
	const colMap = createTrackMap(usedTracks.cols, colTrackConfig.is_pruned);

	if (item.family === 'cell') {
		return toPlacementFromTracks(rowMap, colMap, getCellTracks(parseCell(item.base)));
	}

	if (item.family === 'row') {
		const rowNumber = Number(item.base.replace('row', ''));
		return getRowPlacement(rowMap, rowNumber);
	}

	if (item.family === 'col') {
		const colLookup = { col1: 1, col2: 2, col3: 3 };
		return getColPlacement(colMap, colLookup[item.base]);
	}

	if (item.family === 'range') {
		return toPlacementFromTracks(rowMap, colMap, getRangeTracks(parseRange(item.base)));
	}

	if (item.family === 'half') {
		return toPlacementFromTracks(rowMap, colMap, getHalfTracks(item.base));
	}

	if (isLayerFamily(item.family)) {
		return {
			col_start: '1',
			col_end: '-1',
			row_start: '1',
			row_end: '-1'
		};
	}

	return {
		col_start: 'auto',
		col_end: 'auto',
		row_start: 'auto',
		row_end: 'auto'
	};
}

export function getItemPlaceSelf(item) {
	if (item.place_modifier) return undefined;
	if (item.placement_mode !== 'compact' && item.placement_mode !== 'fit') return undefined;

	return 'stretch stretch';
}

export function isRailZone(item, rootGrid) {
	if (rootGrid !== 'rails') return false;

	return item.family === 'row' || isLayerFamily(item.family);
}

export function addPlacement(items, rowTrackConfig, colTrackConfig, activeTracks, rootGrid) {
	const placed = [];

	for (const item of items) {
		const placement = getPlacement(item, rowTrackConfig, colTrackConfig, activeTracks);
		const isRailZoneItem = isRailZone(item, rootGrid);
		const itemClassName = isRailZoneItem ? `${item.className} is-rail-zone` : item.className;

		placed.push({
			...item,
			className: itemClassName,
			placement,
			is_rail_zone: isRailZoneItem,
			grid_column: isRailZoneItem ? railSpans['content-full'] : placement.col_start + ' / ' + placement.col_end,
			grid_row: placement.row_start + ' / ' + placement.row_end,
			place_self: getItemPlaceSelf(item)
		});
	}

	return placed;
}

/* Classes and debug metadata
--------------------------------------------
Debug metadata is opt-in through Component.svelte's own debug prop.
Production markup stays quiet by default.
*/

export function createRootClassName({ className = '', rootGrid = 'full', rail = '', debug = false }) {
	const classes = ['root-grid'];
	const railClassName = getRailClassName(rail);

	if (className.trim()) classes.push(className.trim());
	if (rootGrid === 'inline') classes.push('is-inline');
	if (rootGrid === 'rails') classes.push('is-grid-rails');
	if (railClassName) classes.push(railClassName);
	if (debug) classes.push('is-debug-mode');

	return classes.join(' ');
}

export function createDebugItems() {
	const items = [];

	for (const base of cellNames) {
		items.push({
			base,
			key: 'debug-' + base,
			label: base,
			className: 'is-debug',
			family: 'cell'
		});
	}

	return items;
}

export function createRootDebugAttributes(debug, root) {
	if (!debug) return {};

	return {
		'data-grid-root': 'true',
		'data-grid': root.rootGrid,
		'data-grid-mode': root.rootMode,
		'data-grid-rail': root.rootRail,
		'data-grid-ratio': root.rootRatio,
		'data-grid-rows': root.rootTrackRows,
		'data-grid-cols': root.rootTrackCols,
		'data-grid-internal': String(internalTrackCount)
	};
}

export function createItemDebugAttributes(debug, item, role = 'item') {
	if (!debug) return {};

	return {
		'data-grid-role': role,
		'data-grid-key': item.key,
		'data-grid-label': item.label,
		'data-grid-base': item.base,
		'data-grid-family': item.family,
		'data-grid-mode': item.placement_mode,
		'data-grid-canonical': item.is_canonical ? 'true' : 'false',
		'data-grid-rail-zone': item.is_rail_zone ? 'true' : 'false',
		'data-grid-place-modifier': item.place_modifier,
		'data-grid-col-start': item.placement?.col_start,
		'data-grid-col-end': item.placement?.col_end,
		'data-grid-row-start': item.placement?.row_start,
		'data-grid-row-end': item.placement?.row_end
	};
}