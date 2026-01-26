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
