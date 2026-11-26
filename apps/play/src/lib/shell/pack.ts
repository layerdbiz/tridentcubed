// Fits every screen on one page (#342). The screens keep their true sizes against each other (a phone is smaller
// than a desktop) and are drawn at the one scale that makes them all as large as the page allows. Every way of
// laying them out in rows and columns, in their order, is tried; the one with the largest scale wins. Screens can be
// grouped (one option in one theme on every device): a group is kept together in a block of its own.

import type { SizeType } from './viewport';

export type PlaceType = { x: number; y: number; width: number; height: number };
export type PackedType = { scale: number; width: number; height: number; places: PlaceType[] };

type NodeType =
	| { kind: 'leaf'; index: number; width: number; height: number }
	| { kind: 'row' | 'column'; a: NodeType; b: NodeType; width: number; height: number };

/** How many layouts each run of boxes keeps: enough to find the best, few enough to stay fast. */
const KEEP = 24;

/**
 * Lays `boxes` out to fill `room`. `gap` and `label` are screen pixels: the space between boxes and the line above
 * each box for its name, which stay the same size on screen whatever the scale. `groups` names each box's group;
 * boxes of a group follow each other in `boxes`.
 */
export function toPacked(
	boxes: SizeType[],
	room: SizeType,
	gap = 0,
	label = 0,
	groups: unknown[] = []
): PackedType {
	if (!boxes.length) return { scale: 1, width: 0, height: 0, places: [] };

	let scale = 1;
	let best = toBest(boxes, room, 0, 0, groups);
	scale = best.scale;
	// The gap and label are fixed on screen, so their size on the page depends on the scale: a few rounds settle it.
	for (let round = 0; round < 5; round += 1) {
		best = toBest(boxes, room, gap / scale, label / scale, groups);
		if (Math.abs(best.scale - scale) < 0.0005) break;
		scale = best.scale;
	}

	const places: (PlaceType & { index: number })[] = [];
	place(best.node, 0, 0, gap / best.scale, places);
	return {
		scale: best.scale,
		width: best.node.width,
		height: best.node.height,
		places: places.toSorted((a, b) => a.index - b.index).map(({ index: _index, ...rest }) => rest)
	};

	function place(
		node: NodeType,
		x: number,
		y: number,
		space: number,
		into: (PlaceType & { index: number })[]
	) {
		if (node.kind === 'leaf') {
			into.push({ index: node.index, x, y, width: node.width, height: node.height });
			return;
		}
		if (node.kind === 'row') {
			place(node.a, x, y + (node.height - node.a.height) / 2, space, into);
			place(node.b, x + node.a.width + space, y + (node.height - node.b.height) / 2, space, into);
			return;
		}
		place(node.a, x + (node.width - node.a.width) / 2, y, space, into);
		place(node.b, x + (node.width - node.b.width) / 2, y + node.a.height + space, space, into);
	}
}

function toBest(boxes: SizeType[], room: SizeType, gap: number, label: number, groups: unknown[]) {
	const sized = boxes.map((box) => ({ width: box.width, height: box.height + label }));
	const memo = new Map<string, NodeType[]>();

	// A run that spans groups is only ever cut between two groups, so each group stays in a block of its own.
	function isCut(from: number, split: number, to: number): boolean {
		if (groups[from] === groups[to - 1]) return true;
		return groups[split - 1] !== groups[split];
	}

	function layouts(from: number, to: number): NodeType[] {
		const key = `${from}-${to}`;
		const kept = memo.get(key);
		if (kept) return kept;

		let found: NodeType[] = [];
		if (to - from === 1) {
			found = [{ kind: 'leaf', index: from, ...sized[from] }];
		} else {
			for (let split = from + 1; split < to; split += 1) {
				if (!isCut(from, split, to)) continue;
				for (const a of layouts(from, split)) {
					for (const b of layouts(split, to)) {
						found.push({
							kind: 'row',
							a,
							b,
							width: a.width + gap + b.width,
							height: Math.max(a.height, b.height)
						});
						found.push({
							kind: 'column',
							a,
							b,
							width: Math.max(a.width, b.width),
							height: a.height + gap + b.height
						});
					}
				}
			}
			found = toFrontier(found);
		}
		memo.set(key, found);
		return found;
	}

	let best = { scale: 0, node: layouts(0, sized.length)[0] };
	for (const node of layouts(0, sized.length)) {
		const scale = Math.min(1, room.width / node.width, room.height / node.height);
		if (scale > best.scale + 1e-9) best = { scale, node };
	}
	return best;
}

/** Keeps only layouts that no other beats on both width and height, at most KEEP of them, spread across shapes. */
function toFrontier(nodes: NodeType[]): NodeType[] {
	const sorted = nodes.toSorted((a, b) => a.width - b.width || a.height - b.height);
	const frontier: NodeType[] = [];
	for (const node of sorted) {
		if (!frontier.length || node.height < frontier[frontier.length - 1].height) frontier.push(node);
	}
	if (frontier.length <= KEEP) return frontier;

	const spread: NodeType[] = [];
	for (let step = 0; step < KEEP; step += 1) {
		spread.push(frontier[Math.round((step * (frontier.length - 1)) / (KEEP - 1))]);
	}
	return spread;
}
