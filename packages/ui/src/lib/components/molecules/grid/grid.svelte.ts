import { createContext } from "svelte";

export type GridDims = { rows: number; cols: number };

export type GridCtx = {
	dims: GridDims;
	setRowTrack: (index: number, value: string) => void;
	setColTrack: (index: number, value: string) => void;
	clearRowTrack: (index: number) => void;
	clearColTrack: (index: number) => void;
	claimAutoCell: () => { row: number; col: number } | null;
};

export const [getGridCtx, setGridCtx] = createContext<GridCtx>();

// ─────────────────────────────────────────────────────────────
// Shared parsing utilities for Grid and Item components
// ─────────────────────────────────────────────────────────────

/**
 * Convert Excel-style column label to number (A=1, B=2, ..., Z=26, AA=27, etc.)
 */
export function colToNum(label: string): number {
	let n = 0;
	for (const ch of (label ?? "").trim().toUpperCase()) {
		const code = ch.charCodeAt(0);
		if (code < 65 || code > 90) continue;
		n = n * 26 + (code - 64);
	}
	return Math.max(1, n);
}

/**
 * Convert number to Excel-style column label (1=A, 2=B, ..., 26=Z, 27=AA, etc.)
 */
export function numToCol(n: number): string {
	let x = n;
	let out = "";
	while (x > 0) {
		x -= 1;
		out = String.fromCharCode(65 + (x % 26)) + out;
		x = Math.floor(x / 26);
	}
	return out || "A";
}

/**
 * Parse a range specification into start/end row/col positions.
 *
 * Supports multiple formats:
 * - Single cell number: "1" → row 1, col 1
 * - Single cell A1: "A1" → row 1, col 1
 * - Numeric grid: "1x3" or "1:3x1:3" → row range, col range
 * - A1 range: "A1:C3" → row 1-3, col 1-3
 *
 * @returns { startRow, endRow, startCol, endCol } or null if invalid
 */
export function parseRange(
	spec?: string,
):
	| { startRow: number; endRow: number; startCol: number; endCol: number }
	| null {
	const s = (spec ?? "").trim().toUpperCase();
	if (!s) return null;

	// Format: "5" → single row at col 1
	const mSingleNum = s.match(/^(\d+)$/);
	if (mSingleNum) {
		const row = Math.max(1, Number(mSingleNum[1]) || 1);
		return { startRow: row, endRow: row, startCol: 1, endCol: 1 };
	}

	// Format: "A1" → single cell
	const mCell = s.match(/^([A-Z]+)(\d+)$/);
	if (mCell) {
		const startCol = colToNum(mCell[1]);
		const startRow = Math.max(1, Number(mCell[2]) || 1);
		return { startRow, endRow: startRow, startCol, endCol: startCol };
	}

	// Format: "2x3" → single cell at row 2, col 3
	const mNumericCell = s.match(/^(\d+)\s*[X×]\s*(\d+)$/);
	if (mNumericCell) {
		const row = Math.max(1, Number(mNumericCell[1]) || 1);
		const col = Math.max(1, Number(mNumericCell[2]) || 1);
		return { startRow: row, endRow: row, startCol: col, endCol: col };
	}

	// Format: "1:3x2:4" → row range 1-3, col range 2-4
	const mNumericRange = s.match(
		/^(\d+)\s*:\s*(\d+)\s*[X×]\s*(\d+)\s*:\s*(\d+)$/,
	);
	if (mNumericRange) {
		const r1 = Math.max(1, Number(mNumericRange[1]) || 1);
		const r2 = Math.max(1, Number(mNumericRange[2]) || 1);
		const c1 = Math.max(1, Number(mNumericRange[3]) || 1);
		const c2 = Math.max(1, Number(mNumericRange[4]) || 1);
		return {
			startRow: Math.min(r1, r2),
			endRow: Math.max(r1, r2),
			startCol: Math.min(c1, c2),
			endCol: Math.max(c1, c2),
		};
	}

	// Format: "A1:C3" → A1 notation range
	const mA1Range = s.match(/^([A-Z]+)(\d+)\s*:\s*([A-Z]+)(\d+)$/);
	if (mA1Range) {
		const r1 = Math.max(1, Number(mA1Range[2]) || 1);
		const r2 = Math.max(1, Number(mA1Range[4]) || 1);
		const c1 = colToNum(mA1Range[1]);
		const c2 = colToNum(mA1Range[3]);
		return {
			startRow: Math.min(r1, r2),
			endRow: Math.max(r1, r2),
			startCol: Math.min(c1, c2),
			endCol: Math.max(c1, c2),
		};
	}

	return null;
}

/**
 * Parse a grid dimensions specification.
 *
 * Supports multiple formats:
 * - Single number: "10" → 10 rows, 1 col
 * - Grid size: "10x10" → 10 rows, 10 cols
 * - A1 range: "A1:J10" → uses max row/col from range
 *
 * @returns { rows, cols }
 */
export function parseDims(spec?: string): GridDims {
	const s = (spec ?? "").trim().toUpperCase();
	if (!s) return { rows: 1, cols: 1 };

	// Format: "10" → 10 rows, 1 col
	const mSingle = s.match(/^(\d+)$/);
	if (mSingle) {
		const r = Math.max(1, Number(mSingle[1]) || 1);
		return { rows: r, cols: 1 };
	}

	// Format: "10x10" → 10 rows, 10 cols
	const mGrid = s.match(/^(\d+)\s*[X×]\s*(\d+)$/);
	if (mGrid) {
		const r = Math.max(1, Number(mGrid[1]) || 1);
		const c = Math.max(1, Number(mGrid[2]) || 1);
		return { rows: r, cols: c };
	}

	// Format: "A1:J10" → max row/col from A1 notation
	const mRange = s.match(/^([A-Z]+)(\d+)\s*:\s*([A-Z]+)(\d+)$/);
	if (mRange) {
		const r1 = Math.max(1, Number(mRange[2]) || 1);
		const r2 = Math.max(1, Number(mRange[4]) || 1);
		const c1 = colToNum(mRange[1]);
		const c2 = colToNum(mRange[3]);
		return { rows: Math.max(r1, r2), cols: Math.max(c1, c2) };
	}

	return { rows: 1, cols: 1 };
}
